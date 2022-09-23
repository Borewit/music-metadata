import { UINT32_BE } from "../token-types";
import { Latin1StringType } from "../token-types/string";

import { ExtendedLameHeader, IExtendedLameHeader } from "./ExtendedLameHeader";
import { XingHeaderFlags } from "./XingHeaderFlags";

import type { ITokenizer } from "../strtok3/types";

export interface IXingInfoTag {
  /**
   * total bit stream frames from Vbr header data
   */
  numFrames?: number;

  /**
   * Actual stream size = file size - header(s) size [bytes]
   */
  streamSize?: number;

  toc?: Uint8Array;

  /**
   * the number of header data bytes (from original file)
   */
  vbrScale?: number;

  lame?: {
    version: string;
    extended?: IExtendedLameHeader;
  };
}

// /**
//  * XING Header Tag
//  * Ref: http://gabriel.mp3-tech.org/mp3infotag.html
//  */
/**
 *
 * @param tokenizer
 */
export async function readXingHeader(tokenizer: ITokenizer): Promise<IXingInfoTag> {
  const flags = await tokenizer.readToken(XingHeaderFlags);
  const xingInfoTag: IXingInfoTag = {};
  if (flags.frames) {
    xingInfoTag.numFrames = await tokenizer.readToken(UINT32_BE);
  }
  if (flags.bytes) {
    xingInfoTag.streamSize = await tokenizer.readToken(UINT32_BE);
  }
  if (flags.toc) {
    xingInfoTag.toc = new Uint8Array(100);
    await tokenizer.readBuffer(xingInfoTag.toc);
  }
  if (flags.vbrScale) {
    xingInfoTag.vbrScale = await tokenizer.readToken(UINT32_BE);
  }
  const lameTag = await tokenizer.peekToken(new Latin1StringType(4));
  if (lameTag === "LAME") {
    await tokenizer.ignore(4);
    xingInfoTag.lame = {
      version: await tokenizer.readToken(new Latin1StringType(5)),
    };
    const match = xingInfoTag.lame.version.match(/\d+.\d+/g);
    if (match) {
      const majorMinorVersion = xingInfoTag.lame.version.match(/\d+.\d+/g)[0]; // e.g. 3.97
      const version = majorMinorVersion.split(".").map((n) => Number.parseInt(n, 10));
      if (version[0] >= 3 && version[1] >= 90) {
        xingInfoTag.lame.extended = await tokenizer.readToken(ExtendedLameHeader);
      }
    }
  }
  return xingInfoTag;
}
