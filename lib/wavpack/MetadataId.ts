import type { IGetToken } from "../strtok3";

import { getBitAllignedNumber, isBitSet } from "./util";

export interface MetadataId {
  /**
   * metadata function id
   */
  functionId: number;
  /**
   * If true, audio-decoder does not need to understand the metadata field
   */
  isOptional: boolean;
  /**
   * actual data byte length is 1 less
   */
  isOddSize: boolean;
  /**
   * large block (> 255 words)
   */
  largeBlock: boolean;
}

/**
 * 3.0 Metadata Sub-Blocks
 * Ref: http://www.wavpack.com/WavPack5FileFormat.pdf (page 4/6: 3.0 "Metadata Sub-Block")
 */
export const MetadataIdToken: IGetToken<MetadataId> = {
  len: 1,

  get: (buf, off) => {
    return {
      functionId: getBitAllignedNumber(buf[off], 0, 6), // functionId overlaps with isOptional flag
      isOptional: isBitSet(buf[off], 5),
      isOddSize: isBitSet(buf[off], 6),
      largeBlock: isBitSet(buf[off], 7),
    };
  },
};
