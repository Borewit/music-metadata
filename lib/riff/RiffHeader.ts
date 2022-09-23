import { UINT32_LE } from "../token-types";
import { Latin1StringType } from "../token-types/string";

import type { IChunkHeader } from "../iff";
import type { IGetToken } from "../token-types";

export { IChunkHeader } from "../iff";

/**
 * Common RIFF chunk header
 */
export const Header: IGetToken<IChunkHeader> = {
  len: 8,

  get: (buf: Uint8Array, off): IChunkHeader => {
    return {
      // Group-ID
      chunkID: new Latin1StringType(4).get(buf, off),
      // Size
      chunkSize: UINT32_LE.get(buf, 4),
    };
  },
};
