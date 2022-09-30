import { sequenceToObject } from "../combinate/sequence-to-object";
import { u32le } from "../primitive/integer";
import { skip } from "../primitive/skip";
import { latin1 } from "../primitive/string";

import { ApeTagFlags, tagFlags } from "./tag-flags";

import type { Unit } from "../type/unit";

/**
 * APE Tag Header/Footer Version 2.0
 * TAG: describes all the properties of the file [optional]
 */
export interface ApeFooter {
  // should equal 'APETAGEX'
  id: string;
  // equals CURRENT_APE_TAG_VERSION
  version: number;
  // the complete size of the tag, including this footer (excludes header)
  size: number;
  // the number of fields in the tag
  fields: number;
  // Global tag flags of all items
  flags: ApeTagFlags; // ToDo: what is this???
}

export const footer: Unit<ApeFooter, RangeError> = sequenceToObject(
  {
    id: 0,
    version: 1,
    size: 2,
    fields: 3,
    flags: 4,
  },
  latin1(8),
  u32le,
  u32le,
  u32le,
  tagFlags,
  skip(8)
);
