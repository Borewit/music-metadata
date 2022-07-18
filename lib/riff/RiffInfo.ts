import type { IGetToken } from "../strtok3";

import type { IChunkHeader } from "../iff";
import { Latin1StringType } from "../token-types/string";

/**
 * Token to parse RIFF-INFO tag value
 */
export class ListInfoTagValue implements IGetToken<string> {
  public len: number;

  public constructor(private tagHeader: IChunkHeader) {
    this.len = tagHeader.chunkSize;
    this.len += this.len & 1; // if it is an odd length, round up to even
  }

  public get(buf: Uint8Array, off: number): string {
    return new Latin1StringType(this.tagHeader.chunkSize).get(buf, off);
  }
}
