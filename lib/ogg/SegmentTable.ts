import type { IGetToken } from "../token-types";

import type { IPageHeader } from "./Header";

export interface ISegmentTable {
  totalPageSize: number;
}

export class SegmentTable implements IGetToken<ISegmentTable> {
  private static sum(buf: Uint8Array, off: number, len: number): number {
    let s = 0;
    for (let i = off; i < off + len; ++i) {
      s += buf[i];
    }
    return s;
  }

  public len: number;

  constructor(header: IPageHeader) {
    this.len = header.page_segments;
  }

  public get(buf: Uint8Array, off: number): ISegmentTable {
    return {
      totalPageSize: SegmentTable.sum(buf, off, this.len),
    };
  }
}
