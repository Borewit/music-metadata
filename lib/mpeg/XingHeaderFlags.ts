import type { IGetToken } from "../strtok3";
import * as util from "../common/Util";

export interface IXingHeaderFlags {
  frames: boolean;
  bytes: boolean;
  toc: boolean;
  vbrScale: boolean;
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
      vbrScale: util.isBitSet(buf, off, 28),
    };
  },
};
