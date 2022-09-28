import { u32be } from "../primitive/integer";
import { val } from "../primitive/value";

import { u32beSyncsafe } from "./syncsafe";

import type { Unit } from "../type/unit";
import type { ID3v2MajorVersion } from "./header";

export const extendedHeaderSize = (major: ID3v2MajorVersion): Unit<number, RangeError> => {
  return { 2: val(0), 3: u32be, 4: u32beSyncsafe }[major];
};
