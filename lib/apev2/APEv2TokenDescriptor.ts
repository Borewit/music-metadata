import * as Token from "../token-types";
import type { IGetToken } from "../strtok3";

import { FourCcToken } from "../common/FourCC";

export interface IDescriptor {
  // should equal 'MAC '
  ID: string;
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

/**
 * APE_DESCRIPTOR: defines the sizes (and offsets) of all the pieces, as well as the MD5 checksum
 */
export const DescriptorParser: IGetToken<IDescriptor> = {
  len: 52,

  get: (buf, off) => {
    return {
      // should equal 'MAC '
      ID: FourCcToken.get(buf, off),
      // versionIndex number * 1000 (3.81 = 3810) (remember that 4-byte alignment causes this to take 4-bytes)
      version: Token.UINT32_LE.get(buf, off + 4) / 1000,
      // the number of descriptor bytes (allows later expansion of this header)
      descriptorBytes: Token.UINT32_LE.get(buf, off + 8),
      // the number of header APE_HEADER bytes
      headerBytes: Token.UINT32_LE.get(buf, off + 12),
      // the number of header APE_HEADER bytes
      seekTableBytes: Token.UINT32_LE.get(buf, off + 16),
      // the number of header data bytes (from original file)
      headerDataBytes: Token.UINT32_LE.get(buf, off + 20),
      // the number of bytes of APE frame data
      apeFrameDataBytes: Token.UINT32_LE.get(buf, off + 24),
      // the high order number of APE frame data bytes
      apeFrameDataBytesHigh: Token.UINT32_LE.get(buf, off + 28),
      // the terminating data of the file (not including tag data)
      terminatingDataBytes: Token.UINT32_LE.get(buf, off + 32),
      // the MD5 hash of the file (see notes for usage... it's a little tricky)
      fileMD5: new Token.Uint8ArrayType(16).get(buf, off + 36),
    };
  },
};
