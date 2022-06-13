import { IGetToken } from "../strtok3";

import * as Token from "../token-types";
import GUID from "./GUID";
import { IAsfObjectHeader } from "./AsfObjectHeader";

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
export const TopLevelHeaderObjectToken: IGetToken<
  IAsfTopLevelObjectHeader,
  Buffer
> = {
  len: 30,

  get: (buf, off): IAsfTopLevelObjectHeader => {
    return {
      objectId: GUID.fromBin(new Token.BufferType(16).get(buf, off)),
      objectSize: Number(Token.UINT64_LE.get(buf, off + 16)),
      numberOfHeaderObjects: Token.UINT32_LE.get(buf, off + 24),
      // Reserved: 2 bytes
    };
  },
};
