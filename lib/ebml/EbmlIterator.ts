import initDebug from 'debug';
import { EndOfStreamError, type IRandomAccessTokenizer, type ITokenizer } from 'strtok3';
import * as Token from 'token-types';
import { Float32_BE, Float64_BE, StringType, UINT8 } from 'token-types';
import { getMaxMemoryAllocation, readBuffer } from '../common/Allocation.js';
import { makeUnexpectedFileContentError } from '../ParseError.js';
import type { IOptions } from '../type.js';
import {
  DataType,
  type DecodedElement,
  type ElementEvent,
  type IElementContext,
  type IElementType,
  type IHeader,
  type ITree,
  type ValueType
} from './types.js';

const debug = initDebug('music-metadata:parser:ebml');

export class EbmlContentError extends makeUnexpectedFileContentError('EBML') {}

/** @deprecated Use the per-visit IElementContext instead. */
export type ILinkedElementType = IElementContext;

export const ParseAction = {
  ReadNext: 0, // Continue reading the next elements
  IgnoreElement: 2, // Ignore (do not read) this element
  SkipSiblings: 3, // Skip all remaining elements at the same level
  TerminateParsing: 4, // Terminate the parsing process
  SkipElement: 5 // Consider the element has read, assume position is at the next element
} as const;

export type ParseAction = (typeof ParseAction)[keyof typeof ParseAction];

/**
 * @return true, to quit the parser
 */
export type IElementListener<S extends IElementType = IElementType> = {
  startNext: (element: IElementContext) => ParseAction | Promise<ParseAction>;
  /** Legacy untyped events; new consumers should use onElement. */
  elementValue?: (element: IElementContext, value: ValueType, offset: number) => Promise<void>;
  onElement?: (event: ElementEvent<S>) => Promise<void>;
};

/**
 * Extensible Binary Meta Language (EBML) iterator
 * https://en.wikipedia.org/wiki/Extensible_Binary_Meta_Language
 * http://matroska.sourceforge.net/technical/specs/rfc/index.html
 *
 * WEBM VP8 AUDIO FILE
 */
export class EbmlIterator {
  private parserMap = new Map<DataType, (e: IHeader) => Promise<ValueType>>();

  private ebmlMaxIDLength = 4;
  private ebmlMaxSizeLength = 8;

  private tokenizer: ITokenizer;
  private readonly elementHeader: Uint8Array;

  /**
   * @param {ITokenizer} tokenizer Input
   * @param tokenizer
   */
  constructor(
    tokenizer: ITokenizer,
    private readonly options: IOptions = {}
  ) {
    this.tokenizer = tokenizer;
    this.elementHeader = new Uint8Array(Math.min(12, getMaxMemoryAllocation(options)));
    this.parserMap.set(DataType.uint, e => this.readUint(e));
    this.parserMap.set(DataType.int, e => this.readInt(e));
    this.parserMap.set(DataType.string, e => this.readString(e));
    this.parserMap.set(DataType.binary, e => this.readBuffer(e));
    this.parserMap.set(DataType.uid, async e => this.readBuffer(e));
    this.parserMap.set(DataType.bool, e => this.readFlag(e));
    this.parserMap.set(DataType.float, e => this.readFloat(e));
  }

  public async iterate<const S extends IElementType>(
    dtdElement: S,
    posDone: number,
    listener: IElementListener<S>
  ): Promise<DecodedElement<S>> {
    const tree = await this.parseContainer({ ...dtdElement, id: 0, parent: undefined }, posDone, {
      startNext: listener.startNext,
      elementValue: async (element, value, offset) => {
        await listener.elementValue?.(element, value, offset);
        // The schema selects both the decoder and the event ID. Keep this bridge here,
        // rather than asserting unrelated domain types in each parser listener.
        await listener.onElement?.({ id: element.id, element, value, offset } as ElementEvent<S>);
      }
    });
    return tree as DecodedElement<S>;
  }

  private async parseContainer(
    dtdElement: ILinkedElementType,
    posDone: number,
    listener: Required<Pick<IElementListener, 'startNext' | 'elementValue'>>
  ): Promise<ITree> {
    const tree: ITree = {};
    while (this.tokenizer.position < posDone) {
      let element: IHeader;
      const elementPosition = this.tokenizer.position;
      try {
        element = await this.readElement();
      } catch (error) {
        if (error instanceof EndOfStreamError) {
          break;
        }
        throw error;
      }
      const definition = dtdElement.container?.[element.id];
      if (definition) {
        const child: IElementContext = { ...definition, id: element.id, parent: dtdElement };
        const action = await listener.startNext(child);
        switch (action) {
          case ParseAction.ReadNext:
            {
              debug(
                `Read element: name=${getElementPath(child)}{id=0x${element.id.toString(16)}, container=${!!child.container}} at position=${elementPosition}`
              );
              if (child.container) {
                const childEnd = Math.min(
                  posDone,
                  this.tokenizer.fileInfo.size ?? Number.POSITIVE_INFINITY,
                  element.len >= 0 ? this.tokenizer.position + element.len : posDone
                );
                const res = await this.parseContainer(child, childEnd, listener);
                this.collect(tree, child, res);
                await listener.elementValue(child, res, elementPosition);
              } else {
                const parser = child.value === undefined ? undefined : this.parserMap.get(child.value);
                if (typeof parser === 'function') {
                  // Validate before leaf readers allocate buffers or string tokens from the declared length.
                  const end = Math.min(posDone, this.tokenizer.fileInfo.size ?? Number.POSITIVE_INFINITY);
                  if (
                    !Number.isSafeInteger(element.len) ||
                    element.len < 0 ||
                    element.len > end - this.tokenizer.position
                  ) {
                    throw new EbmlContentError(`Invalid element length: ${element.len}`);
                  }
                  const value = await parser(element);
                  this.collect(tree, child, value);
                  await listener.elementValue(child, value, elementPosition);
                } else {
                  await this.ignore(element.len, posDone);
                }
              }
            }
            break;

          case ParseAction.SkipElement:
            debug(
              `Go to next element: name=${getElementPath(child)}, element.id=0x${element.id}, container=${!!child.container} at position=${elementPosition}`
            );
            break;

          case ParseAction.IgnoreElement:
            debug(
              `Ignore element: name=${getElementPath(child)}, element.id=0x${element.id}, container=${!!child.container} at position=${elementPosition}`
            );
            await this.ignore(element.len, posDone);
            break;

          case ParseAction.SkipSiblings:
            debug(
              `Ignore remaining container, at: name=${getElementPath(child)}, element.id=0x${element.id}, container=${!!child.container} at position=${elementPosition}`
            );
            await this.ignore(posDone - this.tokenizer.position, posDone);
            break;

          case ParseAction.TerminateParsing:
            debug(
              `Terminate parsing at element: name=${getElementPath(child)}, element.id=0x${element.id}, container=${!!child.container} at position=${elementPosition}`
            );
            return tree;
        }
      } else {
        switch (element.id) {
          case 0xec: // void
            await this.ignore(element.len, posDone);
            break;
          default:
            debug(
              `parseEbml: parent=${getElementPath(dtdElement)}, unknown child: id=${element.id.toString(16)} at position=${elementPosition}`
            );
            await this.ignore(element.len, posDone);
        }
      }
    }
    return tree;
  }

  private collect(tree: ITree, element: IElementType, value: ValueType): void {
    if (element.multiple) {
      const values = (tree[element.name] ??= []);
      if (Array.isArray(values)) {
        values.push(value);
      }
    } else {
      tree[element.name] = value;
    }
  }

  private async ignore(length: number, posDone: number): Promise<void> {
    // Unknown-size EBML containers may advertise lengths above the safe integer range.
    // Bound skips by the enclosing container and known input before passing them to the tokenizer.
    const end = Math.min(posDone, this.tokenizer.fileInfo.size ?? Number.POSITIVE_INFINITY);
    const boundedLength = Math.min(length, end - this.tokenizer.position);
    if (!Number.isSafeInteger(boundedLength) || boundedLength < 0) {
      throw new EbmlContentError(`Invalid element length: ${length}`);
    }
    await this.tokenizer.ignore(boundedLength);
  }

  private async readVintData(maxLength: number): Promise<Uint8Array> {
    const msb = await this.tokenizer.peekNumber(UINT8);
    let mask = 0x80;
    let oc = 1;

    // Calculate VINT_WIDTH
    while ((msb & mask) === 0) {
      if (oc > maxLength) {
        throw new EbmlContentError('VINT value exceeding maximum size');
      }
      ++oc;
      mask >>= 1;
    }
    const id = new Uint8Array(oc);
    await this.tokenizer.readBuffer(id);
    return id;
  }

  private async readElement(): Promise<IHeader> {
    if (this.tokenizer.supportsRandomAccess() && this.elementHeader.length === 12) {
      // RFC 8794 (July 2020), sections 4-6: an ID and size occupy at most 4 + 8 bytes.
      // Peek both VINTs together to avoid four separate file/network reads per element.
      // https://www.rfc-editor.org/rfc/rfc8794.html#section-4
      const available = await this.tokenizer.peekBuffer(this.elementHeader, { mayBeLess: true });
      const width = (offset: number, maximum: number): number => {
        if (offset >= available) {
          throw new EndOfStreamError();
        }
        for (let length = 1; length <= maximum; ++length) {
          if ((this.elementHeader[offset] & (0x80 >> (length - 1))) !== 0) {
            if (offset + length > available) {
              throw new EndOfStreamError();
            }
            return length;
          }
        }
        throw new EbmlContentError('VINT value exceeding maximum size');
      };
      const idLength = width(0, this.ebmlMaxIDLength);
      const sizeLength = width(idLength, this.ebmlMaxSizeLength);
      const id = readUIntBE(this.elementHeader.subarray(0, idLength), idLength);
      const lenField = this.elementHeader.subarray(idLength, idLength + sizeLength);
      lenField[0] ^= 0x80 >> (sizeLength - 1);
      (this.tokenizer as IRandomAccessTokenizer).setPosition(this.tokenizer.position + idLength + sizeLength);
      return { id, len: readUIntBE(lenField, sizeLength) };
    }
    const id = await this.readVintData(this.ebmlMaxIDLength);
    const lenField = await this.readVintData(this.ebmlMaxSizeLength);
    lenField[0] ^= 0x80 >> (lenField.length - 1);
    return {
      id: readUIntBE(id, id.length),
      len: readUIntBE(lenField, lenField.length)
    };
  }

  private async readFloat(e: IHeader) {
    switch (e.len) {
      case 0:
        return 0.0;
      case 4:
        return this.tokenizer.readNumber(Float32_BE);
      case 8:
        return this.tokenizer.readNumber(Float64_BE);
      case 10:
        return this.tokenizer.readNumber(Float64_BE);
      default:
        throw new EbmlContentError(`Invalid IEEE-754 float length: ${e.len}`);
    }
  }

  private async readFlag(e: IHeader): Promise<boolean> {
    return (await this.readUint(e)) === 1;
  }

  private async readUint(e: IHeader): Promise<number> {
    const buf = await this.readBuffer(e);
    return readUIntBE(buf, e.len);
  }

  private async readInt(e: IHeader): Promise<number> {
    const buffer = await this.readBuffer(e);
    const value = readUIntBeAsBigInt(buffer, e.len);
    return Number(buffer[0] & 0x80 ? value - (1n << BigInt(8 * e.len)) : value);
  }

  private async readString(e: IHeader): Promise<string> {
    const buf = await this.readBuffer(e);
    const rawString = new StringType(e.len, 'utf-8').get(buf, 0);
    return rawString.replace(/\x00.*$/g, '');
  }

  private async readBuffer(e: IHeader): Promise<Uint8Array> {
    return readBuffer(this.tokenizer, e.len, this.options, undefined, message => new EbmlContentError(message));
  }
}

function readUIntBE(buf: Uint8Array, len: number): number {
  return Number(readUIntBeAsBigInt(buf, len));
}

/**
 * Reeds an unsigned integer from a big endian buffer of length `len`
 * @param buf Buffer to decode from
 * @param len Number of bytes
 * @private
 */
function readUIntBeAsBigInt(buf: Uint8Array, len: number): bigint {
  const normalizedNumber = new Uint8Array(8);
  const cleanNumber = buf.subarray(0, len);
  try {
    normalizedNumber.set(cleanNumber, 8 - len);
    return Token.UINT64_BE.get(normalizedNumber, 0);
  } catch (_error) {
    return BigInt(-1);
  }
}

export function getElementPath(element: ILinkedElementType): string {
  let path = '';
  if (element.parent && element.parent.name !== 'dtd') {
    path += `${getElementPath(element.parent)}/`;
  }
  return path + element.name;
}
