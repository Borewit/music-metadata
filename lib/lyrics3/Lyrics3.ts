import type {IRandomAccessTokenizer} from 'strtok3';
import { latin1toString } from '@exodus/bytes/single-byte.js';

export const endTag2 = 'LYRICS200';

export async function getLyricsHeaderLength(tokenizer: IRandomAccessTokenizer): Promise<number> {
  const fileSize = tokenizer.fileInfo.size;
  if (fileSize >= 143) {
    const buf = new Uint8Array(15);
    const position = tokenizer.position;
    await tokenizer.readBuffer(buf, {position: fileSize - 143});
    tokenizer.setPosition(position); // Restore position
    const txt = latin1toString(buf);
    const tag = txt.substring(6);
    if (tag === endTag2) {
      return Number.parseInt(txt.substring(0, 6), 10) + 15;
    }
  }
  return 0;
}
