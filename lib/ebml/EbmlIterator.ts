import initDebug from 'debug';
import { EndOfStreamError, type ITokenizer, isRandomAccessTokenizer } from 'strtok3';
import * as Token from 'token-types';
import { Float32_BE, Float64_BE, StringType, UINT8 } from 'token-types';
import { getMaxMemoryAllocation, getMaxMetadataEntries, readBuffer } from '../common/Allocation.js';
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

/** Traversal callbacks and optional subtree retention. */
export type IElementListener<S extends IElementType = IElementType> = {
  startNext: (element: IElementContext) => ParseAction | Promise<ParseAction>;
  /** Legacy untyped events; new consumers should use onElement. */
  elementValue?: (element: IElementContext, value: ValueType, offset: number) => Promise<void>;
  onElement?: (event: ElementEvent<S>) => Promise<void>;
  /**
   * Collect only subtrees rooted at matching containers. Descendants of a selected
   * container are retained until its event completes; other ancestors stay empty.
   * Omit this callback to collect the entire document (legacy iterator behavior).
   * Leaf events are delivered even when their values are not retained.
   */
  collect?: (element: IElementContext) => boolean;
  /** Read a binary leaf's prefix and skip its remaining payload before emitting the event. */
  binaryPrefixLength?: (element: IElementContext) => number | undefined;
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
  private pendingElement?: { header: IHeader; position: number };
  private truncatedPayload = false;
  private stopTraversal = false;

  /** Whether a payload or known-size container ended before its boundary. */
  public get hasTruncatedPayload(): boolean {
    return this.truncatedPayload;
  }

  /**
   * @param {ITokenizer} tokenizer Input
   * @param tokenizer
   */
  constructor(
    tokenizer: ITokenizer,
    private readonly options: IOptions = {}
  ) {
    this.tokenizer = tokenizer;
    const maxMemoryAllocation = getMaxMemoryAllocation(options);
    this.elementHeader = new Uint8Array(Math.min(12, maxMemoryAllocation));
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
    const root: IElementContext = { ...dtdElement, id: 0, parent: undefined };
    const tree = await this.parseContainer(
      root,
      posDone,
      {
        startNext: listener.startNext,
        collect: listener.collect ?? (() => true),
        binaryPrefixLength: listener.binaryPrefixLength,
        elementValue: async (element, value, offset) => {
          await listener.elementValue?.(element, value, offset);
          // The schema selects both the decoder and the event ID. Keep this bridge here,
          // rather than asserting unrelated domain types in each parser listener.
          await listener.onElement?.({ id: element.id, element, value, offset } as ElementEvent<S>);
        }
      },
      listener.collect?.(root) ?? true,
      // An unbounded synthetic root must not turn normal stream EOF into truncation.
      posDone === Number.MAX_SAFE_INTEGER || posDone === Number.POSITIVE_INFINITY
    );
    return tree as DecodedElement<S>;
  }

  private async parseContainer(
    dtdElement: ILinkedElementType,
    posDone: number,
    listener: Required<Pick<IElementListener, 'startNext' | 'elementValue' | 'collect'>> &
      Pick<IElementListener, 'binaryPrefixLength'>,
    collect: boolean,
    unknownSize = false
  ): Promise<ITree> {
    const tree: ITree = {};
    while (this.pendingElement || this.tokenizer.position < posDone) {
      let element: IHeader;
      const elementPosition = this.pendingElement?.position ?? this.tokenizer.position;
      try {
        if (this.pendingElement) {
          element = this.pendingElement.header;
          this.pendingElement = undefined;
        } else {
          element = await this.readElement();
        }
      } catch (error) {
        if (error instanceof EndOfStreamError) {
          // Unknown-size masters may end at EOF, but not midway through a header.
          this.truncatedPayload ||=
            (!unknownSize && elementPosition < posDone) ||
            this.tokenizer.position > elementPosition ||
            (await this.tokenizer.peekBuffer(this.elementHeader, { mayBeLess: true })) > 0;
          break;
        }
        throw error;
      }
      const definition = dtdElement.container?.[element.id];
      // An unknown-size master ends at the next element belonging to an ancestor.
      // Keep the already-read header so forward-only streams need not rewind.
      if (!definition && unknownSize) {
        let ancestor = dtdElement.parent;
        while (ancestor) {
          if (ancestor.container?.[element.id]) {
            this.pendingElement = { header: element, position: elementPosition };
            return tree;
          }
          ancestor = ancestor.parent;
        }
      }
      if (definition) {
        const child: IElementContext = { ...definition, id: element.id, parent: dtdElement, length: element.len };
        const action = await listener.startNext(child);
        switch (action) {
          case ParseAction.ReadNext:
            {
              debug(
                `Read element: name=${getElementPath(child)}{id=0x${element.id.toString(16)}, container=${!!child.container}} at position=${elementPosition}`
              );
              if (child.container) {
                const declaredEnd = element.len >= 0 ? this.tokenizer.position + element.len : posDone;
                const childEnd = Math.min(
                  posDone,
                  this.tokenizer.fileInfo.size ?? Number.POSITIVE_INFINITY,
                  declaredEnd
                );
                this.truncatedPayload ||= element.len >= 0 && declaredEnd > childEnd;
                const res = await this.parseContainer(
                  child,
                  childEnd,
                  listener,
                  collect || listener.collect(child),
                  element.len < 0
                );
                if (collect) {
                  this.collect(tree, child, res);
                }
                if (this.stopTraversal) {
                  return tree;
                }
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
                  const prefix = child.value === DataType.binary ? listener.binaryPrefixLength?.(child) : undefined;
                  if (prefix !== undefined && (!Number.isSafeInteger(prefix) || prefix < 0)) {
                    throw new EbmlContentError(`Invalid binary prefix length: ${prefix}`);
                  }
                  const length = prefix === undefined ? element.len : Math.min(element.len, prefix);
                  let value: ValueType;
                  try {
                    value = await parser({ ...element, len: length });
                  } catch (error) {
                    if (prefix === undefined || !(error instanceof EndOfStreamError)) {
                      throw error;
                    }
                    this.truncatedPayload = true;
                    this.stopTraversal = true;
                    return tree;
                  }
                  if (length < element.len && !(await this.ignore(element.len - length, posDone))) {
                    return tree;
                  }
                  if (collect) {
                    this.collect(tree, child, value);
                  }
                  await listener.elementValue(child, value, elementPosition);
                } else {
                  if (!(await this.ignore(element.len, posDone))) {
                    return tree;
                  }
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
            if (!(await this.ignore(element.len, posDone))) {
              return tree;
            }
            break;

          case ParseAction.SkipSiblings:
            debug(
              `Ignore remaining container, at: name=${getElementPath(child)}, element.id=0x${element.id}, container=${!!child.container} at position=${elementPosition}`
            );
            if (!(await this.ignore(posDone - this.tokenizer.position, posDone))) {
              return tree;
            }
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
            if (!(await this.ignore(element.len, posDone))) {
              return tree;
            }
            break;
          default:
            debug(
              `parseEbml: parent=${getElementPath(dtdElement)}, unknown child: id=${element.id.toString(16)} at position=${elementPosition}`
            );
            if (!(await this.ignore(element.len, posDone))) {
              return tree;
            }
        }
      }
    }
    return tree;
  }

  private collect(tree: ITree, element: IElementType, value: ValueType): void {
    if (element.multiple) {
      const values = (tree[element.name] ??= []);
      if (Array.isArray(values)) {
        if (values.length >= getMaxMetadataEntries(this.options)) {
          throw new EbmlContentError('Collected EBML element count exceeds entry limit');
        }
        values.push(value);
      }
    } else {
      tree[element.name] = value;
    }
  }

  private async ignore(length: number, posDone: number): Promise<boolean> {
    // Unknown-size EBML containers may advertise lengths above the safe integer range.
    // Bound skips by the enclosing container and known input before passing them to the tokenizer.
    const end = Math.min(posDone, this.tokenizer.fileInfo.size ?? Number.POSITIVE_INFINITY);
    const boundedLength = length < 0 ? end - this.tokenizer.position : Math.min(length, end - this.tokenizer.position);
    if (!Number.isSafeInteger(boundedLength) || boundedLength < 0) {
      throw new EbmlContentError(`Invalid element length: ${length}`);
    }
    this.truncatedPayload ||= length >= 0 && boundedLength < length;
    try {
      const complete = (await this.tokenizer.ignore(boundedLength)) === boundedLength;
      this.truncatedPayload ||= !complete;
      return complete;
    } catch (error) {
      if (error instanceof EndOfStreamError) {
        this.truncatedPayload = true;
        return false;
      }
      throw error;
    }
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
    if (isRandomAccessTokenizer(this.tokenizer) && this.elementHeader.length === 12) {
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
      this.tokenizer.setPosition(this.tokenizer.position + idLength + sizeLength);
      return { id, len: readSize(lenField) };
    }
    const id = await this.readVintData(this.ebmlMaxIDLength);
    const lenField = await this.readVintData(this.ebmlMaxSizeLength);
    lenField[0] ^= 0x80 >> (lenField.length - 1);
    return {
      id: readUIntBE(id, id.length),
      len: readSize(lenField)
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

function readSize(data: Uint8Array): number {
  const unknown = data[0] === 0xff >> data.length && data.subarray(1).every(byte => byte === 0xff);
  return unknown ? -1 : readUIntBE(data, data.length);
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
