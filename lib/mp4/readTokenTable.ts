import initDebug from "debug";
import { IGetToken } from "../strtok3";

const debug = initDebug("music-metadata:parser:MP4:atom");

/**
 *
 * @param buf
 * @param token
 * @param off
 * @param remainingLen
 * @param numberOfEntries
 */
export function readTokenTable<T>(
  buf: Buffer,
  token: IGetToken<T>,
  off: number,
  remainingLen: number,
  numberOfEntries: number
): T[] {
  debug(
    `remainingLen=${remainingLen}, numberOfEntries=${numberOfEntries} * token-len=${token.len}`
  );

  if (remainingLen === 0) return [];

  if (remainingLen !== numberOfEntries * token.len)
    throw new Error("mismatch number-of-entries with remaining atom-length");

  const entries: T[] = [];
  // parse offset-table
  for (let n = 0; n < numberOfEntries; ++n) {
    entries.push(token.get(buf, off));
    off += token.len;
  }

  return entries;
}
