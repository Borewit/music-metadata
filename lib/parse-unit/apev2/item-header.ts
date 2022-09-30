import { sequenceToObject } from "../combinate/sequence-to-object";
import { u32le } from "../primitive/integer";

import { ApeTagFlags, tagFlags } from "./tag-flags";

/**
 * APE Tag v2.0 Item Header
 */
export interface ApeItemHeader {
  // Length of assigned value in bytes
  size: number;
  // Private item tag flags
  flags: ApeTagFlags;
}

export const itemHeader = sequenceToObject({ size: 0, flags: 1 }, u32le, tagFlags);
