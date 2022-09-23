import { UINT32_BE } from "../token-types";

import type { IGetToken } from "../token-types";

/**
 * Timestamp stored in seconds since Mac Epoch (1 January 1904)
 */
export const SecondsSinceMacEpoch: IGetToken<Date> = {
  len: 4,

  get: (buf: Uint8Array, off: number): Date => {
    const secondsSinceUnixEpoch = UINT32_BE.get(buf, off) - 2_082_844_800;
    return new Date(secondsSinceUnixEpoch * 1000);
  },
};
