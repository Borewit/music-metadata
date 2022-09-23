import { FourCcToken } from "../common/FourCC";
import { INT64_BE } from "../token-types";

import type { IChunkHeader64 } from "../iff";
import type { IGetToken } from "../strtok3";

export { IChunkHeader64 } from "../iff";

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
      chunkSize: INT64_BE.get(buf, off + 4),
    };
  },
};
