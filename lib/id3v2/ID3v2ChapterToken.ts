import type { IGetToken } from 'strtok3';
import * as Token from 'token-types';

export interface IChapterInfo {
  startTime: number;
  endTime: number;
  startOffset?: number;
  endOffset?: number;
}

/**
 * Data portion of `CHAP` sub frame
 */
export const ChapterInfo: IGetToken<IChapterInfo> = {
  len: 16,

  get: (buf: Uint8Array, off: number): IChapterInfo => {

    const startOffset = Token.UINT32_BE.get(buf, off + 8);
    const endOffset = Token.UINT32_BE.get(buf, off + 12);

    return {
      startTime: Token.UINT32_BE.get(buf, off),
      endTime: Token.UINT32_BE.get(buf, off + 4),
      startOffset: startOffset === 0xFFFFFFFF ? undefined : startOffset,
      endOffset: endOffset === 0xFFFFFFFF ? undefined : endOffset,
    };
  }
};
