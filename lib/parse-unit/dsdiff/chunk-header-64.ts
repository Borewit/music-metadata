import { sequenceToObject } from "../combinate/sequence-to-object";
import { fourCc } from "../iff/four-cc";
import { u64be } from "../primitive/integer";

import type { Unit } from "../type/unit";

/**
 * "EA IFF 85" Standard for Interchange Format Files
 * Ref: http://www.martinreddy.net/gfx/2d/IFF.txt
 */
export interface DsdiffChunkHeader64 {
  /**
   * A chunk ID (ie, 4 ASCII bytes)
   */
  id: string;
  /**
   * Number of data bytes following this data header
   */
  size: bigint;
}

/**
 * DSDIFF chunk header
 * The data-size encoding is deviating from EA-IFF 85
 * Ref: http://www.sonicstudio.com/pdf/dsd/DSDIFF_1.5_Spec.pdf
 */
export const dsdiffChunkHeader: Unit<DsdiffChunkHeader64, RangeError> = sequenceToObject(
  {
    id: 0,
    size: 1,
  },
  fourCc,
  u64be
);
