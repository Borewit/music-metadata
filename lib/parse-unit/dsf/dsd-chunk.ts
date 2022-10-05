import { sequenceToObject } from "../combinate/sequence-to-object";
import { u64le } from "../primitive/integer";

/**
 * Interface to DSD payload chunk
 */
export interface DsdChunk {
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

export const dsdChunk = sequenceToObject(
  {
    fileSize: 0,
    metadataPointer: 1,
  },
  u64le,
  u64le
);
