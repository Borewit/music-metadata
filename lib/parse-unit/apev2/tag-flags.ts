import { isNumberBitSet } from "../../common/Util";
import { map } from "../combinate/map";
import { u32le } from "../primitive/integer";

import type { Unit } from "../type/unit";

export type DataType = 0 | 1 | 2 | 3;

export interface ApeTagFlags {
  containsHeader: boolean;
  containsFooter: boolean;
  isHeader: boolean;
  readOnly: boolean;
  dataType: DataType;
}

export const tagFlags: Unit<ApeTagFlags, RangeError> = map(u32le, (value) => {
  return {
    containsHeader: isNumberBitSet(value, 31),
    containsFooter: isNumberBitSet(value, 30),
    isHeader: isNumberBitSet(value, 31),
    readOnly: isNumberBitSet(value, 0),
    dataType: ((value & 6) >> 1) as DataType,
  };
});
