import initDebug from "../debug";

import type { IGetToken } from "../token-types";

const debug = initDebug("music-metadata:parser:MP4:atom");

/**
 *
 * @param buf
 * @param token
 * @param off
 * @param remainingLen
 * @param numberOfEntries
 * @returns
 */
export function readTokenTable<T>(
  buf: Uint8Array,
  token: IGetToken<T>,
  off: number,
  remainingLen: number,
  numberOfEntries: number
): T[] {
  debug(`remainingLen=${remainingLen}, numberOfEntries=${numberOfEntries} * token-len=${token.len}`);

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
