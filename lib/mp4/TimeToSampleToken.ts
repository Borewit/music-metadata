import * as Token from "../token-types";
import { IGetToken } from "../strtok3";

export interface ITimeToSampleToken {
  count: number;
  duration: number;
}

export const TimeToSampleToken: IGetToken<ITimeToSampleToken> = {
  len: 8,

  get(buf: Buffer, off: number): ITimeToSampleToken {
    return {
      count: Token.INT32_BE.get(buf, off + 0),
      duration: Token.INT32_BE.get(buf, off + 4),
    };
  },
};
