import * as Token from 'token-types';
import type { IGetToken } from 'strtok3';

import { FourCcToken } from '../common/FourCC.js';
import { IChunkHeader64 } from '../iff/index.js';
export { IChunkHeader64 } from '../iff/index.js';

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
