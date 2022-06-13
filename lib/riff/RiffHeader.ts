import * as Token from "../token-types";
import { IGetToken } from "../strtok3";

import { IChunkHeader } from "../iff";
export { IChunkHeader } from "../iff";

/**
 * Common RIFF chunk header
 */
export const Header: IGetToken<IChunkHeader> = {
  len: 8,

  get: (buf: Buffer, off): IChunkHeader => {
    return {
      // Group-ID
      chunkID: buf.toString("binary", off, off + 4),
      // Size
      chunkSize: Token.UINT32_LE.get(buf, 4),
    };
  },
};
