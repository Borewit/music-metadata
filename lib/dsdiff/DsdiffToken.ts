import * as Token from 'token-types';
import { IGetToken } from 'strtok3/core';
import { FourCcToken } from '../common/FourCC.js';

import type { IChunkHeader64 } from '../iff/index.ts';
export type { IChunkHeader64 } from '../iff/index.ts';

/**
 * DSDIFF chunk header
 * The data-size encoding is deviating from EA-IFF 85
 * Ref: http://www.sonicstudio.com/pdf/dsd/DSDIFF_1.5_Spec.pdf
 */
export const ChunkHeader64: IGetToken<IChunkHeader64> = {
  len: 12,

  get: (buf, off): IChunkHeader64 => {
    return {
      // Group-ID
      chunkID: FourCcToken.get(buf, off),
      // Size
      chunkSize: Token.INT64_BE.get(buf, off + 4)
    };
  }
};
