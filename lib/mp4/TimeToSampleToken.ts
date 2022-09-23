import { INT32_BE } from "../token-types";

import type { IGetToken } from "../token-types";


export interface ITimeToSampleToken {
  count: number;
  duration: number;
}

export const TimeToSampleToken: IGetToken<ITimeToSampleToken> = {
  len: 8,

  get(buf: Uint8Array, off: number): ITimeToSampleToken {
    return {
      count: INT32_BE.get(buf, off + 0),
      duration: INT32_BE.get(buf, off + 4),
    };
  },
};
