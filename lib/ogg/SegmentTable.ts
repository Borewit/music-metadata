import { IGetToken } from "../strtok3";
import { IPageHeader } from "./Header";

export interface ISegmentTable {
  totalPageSize: number;
}

export class SegmentTable implements IGetToken<ISegmentTable> {
  private static sum(buf: number[], off: number, len: number): number {
    let s: number = 0;
    for (let i = off; i < off + len; ++i) {
      s += buf[i];
    }
    return s;
  }

  public len: number;

  constructor(header: IPageHeader) {
    this.len = header.page_segments;
  }

  public get(buf, off): ISegmentTable {
    return {
      totalPageSize: SegmentTable.sum(buf, off, this.len),
    };
  }
}
