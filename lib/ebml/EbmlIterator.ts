import { Float32_BE, Float64_BE, StringType, UINT8 } from 'token-types';
import initDebug from 'debug';
import { EndOfStreamError, type ITokenizer } from 'strtok3';

import { DataType, type IElementType, type IHeader, type ITree, type ValueType } from './types.js';

import * as Token from 'token-types';

const debug = initDebug('music-metadata:parser:ebml');

export interface ILinkedElementType extends IElementType {
  id: number;
  parent: ILinkedElementType | undefined;
  readonly container?: { [id: number]: ILinkedElementType; };
}

/**
 * @return true, to quit the parser
 */
export type ElementListener = (dtdElement: ILinkedElementType, value: ValueType) => Promise<boolean>;

/**
 * Extensible Binary Meta Language (EBML) iterator
 * https://en.wikipedia.org/wiki/Extensible_Binary_Meta_Language
 * http://matroska.sourceforge.net/technical/specs/rfc/index.html
 *
 * WEBM VP8 AUDIO FILE
 */
export class EbmlIterator {

  private padding = 0;

  private parserMap = new Map<DataType, (e: IHeader) => Promise<ValueType>>();

  private ebmlMaxIDLength = 4;
  private ebmlMaxSizeLength = 8;
  private cancel = false;

  /**
   * @param {ITokenizer} tokenizer Input
   * @param tokenizer
   */
  constructor(private tokenizer: ITokenizer) {
    this.parserMap.set(DataType.uint, e => this.readUint(e));
    this.parserMap.set(DataType.string, e => this.readString(e));
    this.parserMap.set(DataType.binary, e => this.readBuffer(e));
    this.parserMap.set(DataType.uid, async e => this.readBuffer(e));
    this.parserMap.set(DataType.bool, e => this.readFlag(e));
    this.parserMap.set(DataType.float, e => this.readFloat(e));
  }

  public async iterate(dtdElement: IElementType, posDone: number, listener: ElementListener): Promise<ITree> {
    this.cancel = false;
    return this.parseContainer(linkParents(dtdElement), posDone, listener);
  }

  private async parseContainer(dtdElement: ILinkedElementType, posDone: number, listener: ElementListener): Promise<ITree> {
    const tree: ITree = {};
    while (this.tokenizer.position < posDone && !this.cancel) {
      let element: IHeader;
      try {
        element = await this.readElement();
      } catch (error) {
        if (error instanceof EndOfStreamError) {
          break;
        }
        throw error;
      }
      const child = (dtdElement.container as { [id: number]: ILinkedElementType; })[element.id];
      if (child) {
        if (child.ignore) {
          debug(`Ignore element: name=${getElementPath(child)}, element.id=0x${element.id}, container=${!!child.container}`);
          await this.tokenizer.ignore(element.len);
        } else {
          if (element.id === 0x1F43B675) {
            // Hack to ignore remaining segment, when cluster element received
            // await this.tokenizer.ignore(posDone - this.tokenizer.position);
            // break;
          }
          debug(`Reading element: name=${getElementPath(child)}{id=0x${element.id}, container=${!!child.container}}`);
          if (child.container) {
            const res = await this.parseContainer(child, element.len >= 0 ? this.tokenizer.position + element.len : -1, listener);
            if (child.multiple) {
              if (!tree[child.name]) {
                tree[child.name] = [];
              }
              (tree[child.name] as ITree[]).push(res);
            } else {
              tree[child.name] = res;
            }
            this.cancel = await listener(child, res);
          } else {
            const parser = this.parserMap.get(child.value as DataType);
            if (typeof parser === 'function') {
              const value = await parser(element);
              tree[child.name] = value;
              this.cancel = await listener(child, value);
            }
          }
        }
      } else {
        switch (element.id) {
          case 0xec: // void
            this.padding += element.len;
            await this.tokenizer.ignore(element.len);
            break;
          default:
            debug(`parseEbml: parent=${getElementPath(dtdElement)}, unknown child: id=${element.id.toString(16)}`);
            this.padding += element.len;
            await this.tokenizer.ignore(element.len);
        }
      }
    }
    return tree;
  }

  private async readVintData(maxLength: number): Promise<Uint8Array> {
    const msb = await this.tokenizer.peekNumber(UINT8);
    let mask = 0x80;
    let oc = 1;

    // Calculate VINT_WIDTH
    while ((msb & mask) === 0) {
      if (oc > maxLength) {
        throw new Error('VINT value exceeding maximum size');
      }
      ++oc;
      mask >>= 1;
    }
    const id = new Uint8Array(oc);
    await this.tokenizer.readBuffer(id);
    return id;
  }

  private async readElement(): Promise<IHeader> {
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
        throw new Error(`Invalid IEEE-754 float length: ${e.len}`);
    }
  }

  private async readFlag(e: IHeader): Promise<boolean> {
    return (await this.readUint(e)) === 1;
  }

  private async readUint(e: IHeader): Promise<number> {
    const buf = await this.readBuffer(e);
    return readUIntBE(buf, e.len);
  }

  private async readString(e: IHeader): Promise<string> {
    const rawString = await this.tokenizer.readToken(new StringType(e.len, 'utf-8'));
    return rawString.replace(/\x00.*$/g, '');
  }

  private async readBuffer(e: IHeader): Promise<Uint8Array> {
    const buf = new Uint8Array(e.len);
    await this.tokenizer.readBuffer(buf);
    return buf;
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
  } catch(error) {
    return BigInt(-1);
  }
}

function linkParents(element: IElementType): ILinkedElementType {
  if (element.container) {
    Object.keys(element.container)
      .map(id => {
        const child = (element.container as { [id: string]: ILinkedElementType; })[id];
        child.id = Number.parseInt(id);
        return child;
      }).forEach(child => {
        child.parent = element as ILinkedElementType;
        linkParents(child);
      });
  }
  return element as ILinkedElementType;
}

export function getElementPath(element: ILinkedElementType): string {
  let path = '';
  if(element.parent && element.parent.name !== 'dtd') {
    path += `${getElementPath(element.parent)}/`;
  }
  return path + element.name;
}
