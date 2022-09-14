import { isBitSet } from "../common/Util";

import type { IGetToken } from "../strtok3";

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
      frames: isBitSet(buf, off, 31),
      bytes: isBitSet(buf, off, 30),
      toc: isBitSet(buf, off, 29),
      vbrScale: isBitSet(buf, off, 28),
    };
  },
};
