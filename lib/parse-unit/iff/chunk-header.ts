import { sequenceToObject } from "../combinate/sequence-to-object";
import { u32be } from "../primitive/integer";

import { fourCc } from "./four-cc";

import type { Unit } from "../type/unit";

/**
 * "EA IFF 85" Standard for Interchange Format Files
 * Ref: http://www.martinreddy.net/gfx/2d/IFF.txt
 */
export interface IffChunkHeader {
  /**
   * A chunk ID (ie, 4 ASCII bytes)
   */
  id: string;
  /**
   * Number of data bytes following this data header
   */
  size: number;
}

/**
 * Common AIFF chunk header
 */
export const iffChunkHeader: Unit<IffChunkHeader, Error | RangeError> = sequenceToObject(
  {
    id: 0,
    size: 1,
  },
  fourCc,
  u32be
);
