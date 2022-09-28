import { isNumberBitSet } from "../../common/Util";
import { map } from "../combinate/map";
import { sequenceToObject } from "../combinate/sequence-to-object";
import { u8 } from "../primitive/integer";
import { latin1 } from "../primitive/string";

import { u32beSyncsafe } from "./syncsafe";

import type { Unit } from "../type/unit";

export type ID3v2MajorVersion = 2 | 3 | 4;

/**
 * ID3v2 tag header
 * Ref: http://id3.org/id3v2.3.0#ID3v2_header
 * ToDo
 */
export interface Id3v2header {
  // ID3v2/file identifier   "ID3"
  fileIdentifier: string;
  // ID3v2 versionIndex
  major: ID3v2MajorVersion;
  revision: number;

  // ID3v2 flags
  flags: {
    // Unsynchronisation
    unsynchronisation: boolean;
    // Extended header
    isExtendedHeader: boolean;
    // Experimental indicator
    expIndicator: boolean;
    footer: boolean;
  };
  size: number;
}

const flags = map(u8, (value) => {
  return {
    unsynchronisation: isNumberBitSet(value, 7),
    isExtendedHeader: isNumberBitSet(value, 6),
    expIndicator: isNumberBitSet(value, 5),
    footer: isNumberBitSet(value, 4),
  };
});

export const header: Unit<Id3v2header, RangeError> = sequenceToObject(
  {
    fileIdentifier: 0,
    major: 1,
    revision: 2,
    flags: 3,
    size: 4,
  },
  latin1(3),
  u8 as Unit<ID3v2MajorVersion, RangeError>,
  u8,
  flags,
  u32beSyncsafe
);
