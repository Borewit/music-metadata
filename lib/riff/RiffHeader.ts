import * as Token from "../token-types";
import { IGetToken } from "../strtok3";

import { IChunkHeader } from "../iff";
import { Latin1StringType } from "../token-types/string";
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
      chunkSize: Token.UINT32_LE.get(buf, 4),
    };
  },
};
