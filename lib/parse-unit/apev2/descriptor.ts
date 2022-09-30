import { sequenceToObject } from "../combinate/sequence-to-object";
import { fourCc } from "../iff/four-cc";
import { bytes } from "../primitive/bytes";
import { u32le } from "../primitive/integer";

import type { Unit } from "../type/unit";

/**
 * APE_DESCRIPTOR: defines the sizes (and offsets) of all the pieces, as well as the MD5 checksum
 */
export interface ApeDescriptor {
  // should equal 'MAC '
  id: string;
  // versionIndex number * 1000 (3.81 = 3810) (remember that 4-byte alignment causes this to take 4-bytes)
  version: number;
  // the number of descriptor bytes (allows later expansion of this header)
  descriptorBytes: number;
  // the number of header APE_HEADER bytes
  headerBytes: number;
  // the number of header APE_HEADER bytes
  seekTableBytes: number;
  // the number of header data bytes (from original file)
  headerDataBytes: number;
  // the number of bytes of APE frame data
  apeFrameDataBytes: number;
  // the high order number of APE frame data bytes
  apeFrameDataBytesHigh: number;
  // the terminating data of the file (not including tag data)
  terminatingDataBytes: number;
  // the MD5 hash of the file (see notes for usage... it's a littly tricky)
  fileMD5: Uint8Array;
}

export const descriptor: Unit<ApeDescriptor, RangeError> = sequenceToObject(
  {
    id: 0,
    version: 1,
    descriptorBytes: 2,
    headerBytes: 3,
    seekTableBytes: 4,
    headerDataBytes: 5,
    apeFrameDataBytes: 6,
    apeFrameDataBytesHigh: 7,
    terminatingDataBytes: 8,
    fileMD5: 9,
  },
  fourCc,
  u32le,
  u32le,
  u32le,
  u32le,
  u32le,
  u32le,
  u32le,
  u32le,
  bytes(16)
);
