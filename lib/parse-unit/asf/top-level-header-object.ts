import { sequenceToObject } from "../combinate/sequence-to-object";
import { u32le } from "../primitive/integer";
import { skip } from "../primitive/skip";
import type { Unit } from "../type/unit";
import { asfObjectHeader, AsfObjectHeader } from "./object-header";

/**
 * Interface for: 3. ASF top-level Header Object
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3
 */
export interface AsfTopLevelHeaderObject {
  header: AsfObjectHeader;
  numberOfHeaderObjects: number;
}

export const asfTopLevelHeaderObject: Unit<AsfTopLevelHeaderObject, RangeError> = sequenceToObject(
  {
    header: 0,
    numberOfHeaderObjects: 1,
  },
  asfObjectHeader,
  u32le,
  skip(2)
);
