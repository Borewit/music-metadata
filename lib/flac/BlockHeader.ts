import { UINT24_BE } from "../token-types";
import { IGetToken } from "../strtok3";

import * as util from "../common/Util";
import { BlockType } from "./BlockType";

/**
 * METADATA_BLOCK_DATA
 * Ref: https://xiph.org/flac/format.html#metadata_block_streaminfo
 */
export interface IBlockHeader {
  // Last-metadata-block flag: '1' if this block is the last metadata block before the audio blocks, '0' otherwise.
  lastBlock: boolean;
  // BLOCK_TYPE
  type: BlockType;
  // Length (in bytes) of metadata to follow (does not include the size of the METADATA_BLOCK_HEADER)
  length: number;
}

export const BlockHeader: IGetToken<IBlockHeader> = {
  len: 4,

  get: (buf: Buffer, off: number): IBlockHeader => {
    return {
      lastBlock: util.getBit(buf, off, 7),
      type: util.getBitAllignedNumber(buf, off, 1, 7),
      length: UINT24_BE.get(buf, off + 1),
    };
  },
};
