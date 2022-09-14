import { getBit } from "../common/Util";
import { UINT32_BE, UINT16_BE } from "../token-types";

import type { IGetToken } from "../strtok3";


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
      size: UINT32_BE.get(buf, off),
      // Extended Flags
      extendedFlags: UINT16_BE.get(buf, off + 4),
      // Size of padding
      sizeOfPadding: UINT32_BE.get(buf, off + 6),
      // CRC data present
      crcDataPresent: getBit(buf, off + 4, 31),
    };
  },
};
