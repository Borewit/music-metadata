import type { IGetToken } from "../strtok3";

import * as Token from "../token-types";
import GUID from "./GUID";

/**
 * Ref: https://msdn.microsoft.com/en-us/library/windows/desktop/ee663575
 */
export interface IAsfObjectHeader {
  /**
   * A GUID that identifies the object. 128 bits
   */
  objectId: GUID;

  /**
   * The size of the object (64-bits)
   */
  objectSize: number;
}

/**
 * Token for: 3.1 Header Object (mandatory, one only)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_1
 */
export const HeaderObjectToken: IGetToken<IAsfObjectHeader> = {
  len: 24,

  get: (buf, off): IAsfObjectHeader => {
    return {
      objectId: GUID.fromBin(new Token.Uint8ArrayType(16).get(buf, off)),
      objectSize: Number(Token.UINT64_LE.get(buf, off + 16)),
    };
  },
};
