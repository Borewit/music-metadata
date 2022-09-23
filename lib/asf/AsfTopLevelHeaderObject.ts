import { Uint8ArrayType, UINT64_LE, UINT32_LE } from "../token-types";

import GUID from "./GUID";

import type { IGetToken } from "../token-types";

import type { IAsfObjectHeader } from "./AsfObjectHeader";

/**
 * Interface for: 3. ASF top-level Header Object
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3
 */
export interface IAsfTopLevelObjectHeader extends IAsfObjectHeader {
  numberOfHeaderObjects: number;
}

/**
 * Token for: 3. ASF top-level Header Object
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3
 */
export const TopLevelHeaderObjectToken: IGetToken<IAsfTopLevelObjectHeader> = {
  len: 30,

  get: (buf, off): IAsfTopLevelObjectHeader => {
    return {
      objectId: GUID.fromBin(new Uint8ArrayType(16).get(buf, off)),
      objectSize: Number(UINT64_LE.get(buf, off + 16)),
      numberOfHeaderObjects: UINT32_LE.get(buf, off + 24),
      // Reserved: 2 bytes
    };
  },
};
