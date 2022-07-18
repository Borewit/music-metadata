import * as Token from "../token-types";
import { IGetToken } from "../strtok3";

/**
 * Timestamp stored in seconds since Mac Epoch (1 January 1904)
 */
export const SecondsSinceMacEpoch: IGetToken<Date> = {
  len: 4,

  get: (buf: Uint8Array, off: number): Date => {
    const secondsSinceUnixEpoch = Token.UINT32_BE.get(buf, off) - 2_082_844_800;
    return new Date(secondsSinceUnixEpoch * 1000);
  },
};
