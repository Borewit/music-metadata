import { decodeLatin1 } from "../compat/text-decoder";

import type { IRandomReader } from "../type";

export const endTag2 = "LYRICS200";

/**
 *
 * @param reader
 */
export async function getLyricsHeaderLength(reader: IRandomReader): Promise<number> {
  if (reader.fileSize >= 143) {
    const buf = new Uint8Array(15);
    await reader.randomRead(buf, 0, buf.length, reader.fileSize - 143);
    const txt = decodeLatin1(buf);
    const tag = txt.slice(6);
    if (tag === endTag2) {
      return Number.parseInt(txt.slice(0, 6), 10) + 15;
    }
  }
  return 0;
}
