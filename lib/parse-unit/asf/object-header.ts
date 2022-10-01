import { map } from "../combinate/map";
import { sequenceToObject } from "../combinate/sequence-to-object";
import { u64le } from "../primitive/integer";

import { guid, GUID } from "./guid";

import type { Unit } from "../type/unit";

/**
 * Token for: 3.1 Header Object (mandatory, one only)
 * Ref: https://msdn.microsoft.com/en-us/library/windows/desktop/ee663575
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_1
 */
export interface AsfObjectHeader {
  /**
   * A GUID that identifies the object. 128 bits
   */
  id: GUID;

  /**
   * The size of the object (64-bits)
   */
  size: number;
}

export const asfObjectHeader: Unit<AsfObjectHeader, RangeError> = sequenceToObject(
  {
    id: 0,
    size: 1,
  },
  guid,
  map(u64le, Number)
);
