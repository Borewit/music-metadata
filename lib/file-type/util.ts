import { decodeUtf8 } from "../compat/text-decoder";

import type { IGetToken } from "../token-types";

/**
 *
 * @param str
 * @returns
 */
export function stringToBytes(str: string) {
  return [...str].map((character) => character.codePointAt(0));
}

/**
 * Checks whether the TAR checksum is valid.
 * @param buffer - The TAR header `[offset ... offset + 512]`.
 * @param offset - TAR header offset.
 * @returns `true` if the TAR checksum is valid, otherwise `false`.
 */
export function tarHeaderChecksumMatches(buffer: Uint8Array, offset = 0): boolean {
  const readSum = Number.parseInt(decodeUtf8(buffer.subarray(148, 154)).replace(/\0.*$/, "").trim(), 8); // Read sum in header
  if (Number.isNaN(readSum)) {
    return false;
  }

  let sum = 8 * 0x20; // Initialize signed bit sum

  for (let i = offset; i < offset + 148; i++) {
    sum += buffer[i];
  }

  for (let i = offset + 156; i < offset + 512; i++) {
    sum += buffer[i];
  }

  return readSum === sum;
}

/**
 * ID3 UINT32 sync-safe tokenizer token.
 * 28 bits (representing up to 256MB) integer, the msb is 0 to avoid "false syncsignals".
 */
export const uint32SyncSafeToken: IGetToken<number> = {
  get: (buffer: Uint8Array, offset: number) =>
    (buffer[offset + 3] & 0x7f) | (buffer[offset + 2] << 7) | (buffer[offset + 1] << 14) | (buffer[offset] << 21),
  len: 4,
};

/**
 *
 * @param buffer
 * @param headers
 * @param options
 * @param options.mask
 * @param options.offset
 * @returns
 */
export function checkUtil(buffer: Uint8Array, headers: any[], options?: { mask?: number[]; offset: number }) {
  options = {
    offset: 0,
    ...options,
  };

  for (const [index, header] of headers.entries()) {
    // If a bitmask is set
    if (options.mask) {
      // If header doesn't equal `buf` with bits masked off
      if (header !== (options.mask[index] & buffer[index + options.offset])) {
        return false;
      }
    } else if (header !== buffer[index + options.offset]) {
      return false;
    }
  }

  return true;
}
