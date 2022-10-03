import { map } from "../combinate/map";
import { sequence } from "../combinate/sequence";
import { u32le } from "../primitive/integer";
import { skip } from "../primitive/skip";

import { asfObjectHeader, AsfObjectHeader } from "./object-header";

import type { Unit } from "../type/unit";

/**
 * Interface for: 3. ASF top-level Header Object
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3
 */
export interface AsfTopLevelHeaderObject extends AsfObjectHeader {
  numberOfHeaderObjects: number;
}

export const asfTopLevelHeaderObject: Unit<AsfTopLevelHeaderObject, RangeError> = map(
  sequence(asfObjectHeader, u32le, skip(2)),
  ([header, numberOfHeaderObjects]) => {
    return {
      ...header,
      numberOfHeaderObjects,
    };
  }
);
