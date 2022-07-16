import * as Token from "../token-types";
import { IGetToken } from "../strtok3";
import { Utf8StringType } from "../token-types/string";

/**
 * Token used to decode text-track from 'mdat' atom (raw data stream)
 */
export class ChapterText implements IGetToken<string> {
  public constructor(public len: number) {}

  public get(buf: Uint8Array, off: number): string {
    const titleLen = Token.INT16_BE.get(buf, off + 0);
    const str = new Utf8StringType(titleLen);
    return str.get(buf, off + 2);
  }
}
