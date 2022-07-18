import * as Token from "../token-types";
import type { IGetToken } from "../strtok3";

import * as util from "../common/Util";

export interface IExtendedHeader {
  // Extended header size
  size: number;
  extendedFlags: number;
  // Size of padding
  sizeOfPadding: number;
  // CRC data present
  crcDataPresent: boolean;
}

export const ExtendedHeader: IGetToken<IExtendedHeader> = {
  len: 10,

  get: (buf, off): IExtendedHeader => {
    return {
      // Extended header size
      size: Token.UINT32_BE.get(buf, off),
      // Extended Flags
      extendedFlags: Token.UINT16_BE.get(buf, off + 4),
      // Size of padding
      sizeOfPadding: Token.UINT32_BE.get(buf, off + 6),
      // CRC data present
      crcDataPresent: util.getBit(buf, off + 4, 31),
    };
  },
};
