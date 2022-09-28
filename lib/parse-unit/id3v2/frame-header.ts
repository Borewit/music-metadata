import { getBit } from "../../common/Util";
import { map } from "../combinate/map";
import { sequenceToObject } from "../combinate/sequence-to-object";
import { bytes } from "../primitive/bytes";
import { u24be, u32be } from "../primitive/integer";
import { latin1 } from "../primitive/string";

import { u32beSyncsafe } from "./syncsafe";

import type { Unit } from "../type/unit";
import type { ID3v2MajorVersion } from "./header";

export interface ID3v2FrameHeader {
  id: string;
  length: number;
  flags?: ID3v2FrameHeaderFlags;
}

export interface ID3v2FrameHeaderFlags {
  status: {
    tagAlterPreservation: boolean;
    fileAlterPreservation: boolean;
    readOnly: boolean;
  };
  format: {
    groupingIdentity: boolean;
    compression: boolean;
    encryption: boolean;
    unsynchronisation: boolean;
    dataLengthIndicator: boolean;
  };
}

/**
 * %0bcd0000 i000mnop
 *
 * b = tag alter preservation
 * c = file alter preservation
 * d = read only
 * i = grouping identity
 * m = compression
 * n = encryption
 * o = unsynchronisation
 * p = data length indicator
 */
export const flags: Unit<ID3v2FrameHeaderFlags, RangeError> = map(bytes(2), (value) => {
  return {
    status: {
      tagAlterPreservation: getBit(value, 0, 6),
      fileAlterPreservation: getBit(value, 0, 5),
      readOnly: getBit(value, 0, 4),
    },
    format: {
      groupingIdentity: getBit(value, 1, 7),
      compression: getBit(value, 1, 3),
      encryption: getBit(value, 1, 2),
      unsynchronisation: getBit(value, 1, 1),
      dataLengthIndicator: getBit(value, 1, 0),
    },
  };
});

export const frameHeader = (major: ID3v2MajorVersion): Unit<ID3v2FrameHeader, RangeError> => {
  if (major === 2) {
    return sequenceToObject({ id: 0, length: 1 }, latin1(3), u24be);
  }
  return sequenceToObject({ id: 0, length: 1, flags: 2 }, latin1(4), major === 4 ? u32beSyncsafe : u32be, flags);
};
