import * as Token from "../token-types";
import type { IGetToken } from "../strtok3";

/**
 * Interface to DSD payload chunk
 */
export interface IDsdChunk {
  /**
   * Total file size
   */
  fileSize: bigint;

  /**
   * If Metadata doesn’t exist, set 0. If the file has ID3v2 tag, then set the pointer to it.
   * ID3v2 tag should be located in the end of the file.
   */
  metadataPointer: bigint;
}

/**
 * Common chunk DSD header: the 'chunk name (Four-CC)' & chunk size
 */
export const DsdChunk: IGetToken<IDsdChunk> = {
  len: 16,

  get: (buf: Uint8Array, off: number): IDsdChunk => {
    return {
      fileSize: Token.INT64_LE.get(buf, off),
      metadataPointer: Token.INT64_LE.get(buf, off + 8),
    };
  },
};
