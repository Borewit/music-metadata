import * as Token from "../token-types";
import { IGetToken } from "../strtok3";

/**
 * Token used to decode text-track from 'mdat' atom (raw data stream)
 */
export class ChapterText implements IGetToken<string> {
  public constructor(public len: number) {}

  public get(buf: Buffer, off: number): string {
    const titleLen = Token.INT16_BE.get(buf, off + 0);
    const str = new Token.StringType(titleLen, "utf-8");
    return str.get(buf, off + 2);
  }
}
