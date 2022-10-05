import { sequenceToObject } from "../combinate/sequence-to-object";
import { fourCc } from "../iff/four-cc";
import { u64le } from "../primitive/integer";

import type { Unit } from "../type/unit";

/**
 * Common interface for the common chunk DSD header
 * Common chunk DSD header: the 'chunk name (Four-CC)' & chunk size
 */
export interface DsfChunkHeader {
  /**
   * Chunk ID
   */
  id: string;

  /**
   * Chunk size
   */
  size: bigint;
}

export const dsfChunkHeader: Unit<DsfChunkHeader, RangeError> = sequenceToObject(
  {
    id: 0,
    size: 1,
  },
  fourCc,
  u64le
);
