import * as Token from 'token-types';
import type { IGetToken, ITokenizer } from 'strtok3';

import * as util from '../common/Util.js';
import { ExtendedLameHeader, IExtendedLameHeader } from './ExtendedLameHeader.js';

export interface IXingHeaderFlags {
  frames: boolean;
  bytes: boolean;
  toc: boolean;
  vbrScale: boolean;
}

/**
 * Info Tag: Xing, LAME
 */
export const InfoTagHeaderTag = new Token.StringType(4, 'ascii');

/**
 * LAME TAG value
 * Did not find any official documentation for this
 * Value e.g.: "3.98.4"
 */
export const LameEncoderVersion = new Token.StringType(6, 'ascii');

export interface IXingInfoTag {

  /**
   * total bit stream frames from Vbr header data
   */
  numFrames?: number,

  /**
   * Actual stream size = file size - header(s) size [bytes]
   */
  streamSize?: number,

  toc?: Uint8Array;

  /**
   * the number of header data bytes (from original file)
   */
  vbrScale?: number;

  lame?: {
    version: string;
    extended?: IExtendedLameHeader
  }
}

/**
 * Info Tag
 * Ref: http://gabriel.mp3-tech.org/mp3infotag.html
 */
export const XingHeaderFlags: IGetToken<IXingHeaderFlags> = {
  len: 4,

  get: (buf, off) => {
    return {
      frames: util.isBitSet(buf, off, 31),
      bytes: util.isBitSet(buf, off, 30),
      toc: util.isBitSet(buf, off, 29),
      vbrScale: util.isBitSet(buf, off, 28)
    };
  }
};

// /**
//  * XING Header Tag
//  * Ref: http://gabriel.mp3-tech.org/mp3infotag.html
//  */
export async function readXingHeader(tokenizer: ITokenizer): Promise<IXingInfoTag> {
  const flags = await tokenizer.readToken(XingHeaderFlags);
  const xingInfoTag: IXingInfoTag = {};
  if (flags.frames) {
    xingInfoTag.numFrames = await tokenizer.readToken(Token.UINT32_BE);
  }
  if (flags.bytes) {
    xingInfoTag.streamSize = await tokenizer.readToken(Token.UINT32_BE);
  }
  if (flags.toc) {
    xingInfoTag.toc = new Uint8Array(100);
    await tokenizer.readBuffer(xingInfoTag.toc);
  }
  if (flags.vbrScale) {
    xingInfoTag.vbrScale = await tokenizer.readToken(Token.UINT32_BE);
  }
  const lameTag = await tokenizer.peekToken(new Token.StringType(4, 'ascii'));
  if (lameTag === 'LAME') {
    await tokenizer.ignore(4);
    xingInfoTag.lame = {
      version: await tokenizer.readToken(new Token.StringType(5, 'ascii'))
    };
    const match = xingInfoTag.lame.version.match(/\d+.\d+/g);
    if (match) {
      const majorMinorVersion = xingInfoTag.lame.version.match(/\d+.\d+/g)[0]; // e.g. 3.97
      const version = majorMinorVersion.split('.').map(n => parseInt(n, 10));
      if (version[0] >= 3 && version[1] >= 90) {
        xingInfoTag.lame.extended = await tokenizer.readToken(ExtendedLameHeader);
      }
    }
  }
  return xingInfoTag;
}
