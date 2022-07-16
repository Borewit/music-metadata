import { UINT16_BE, UINT24_BE, UINT32_BE, UINT8 } from "../token-types";

/**
 * search array is subset of uint8array
 * @param uint8array bytes data
 * @param search bytes data
 * @param fromIndex search start index
 * @returns includes true of ralse
 */
export function isSubArray(uint8array: Uint8Array, search: Uint8Array, fromIndex = 0): boolean {
  if (search.length === 0) {
    return true;
  }
  let searchedIndex = fromIndex;
  outer: while (true) {
    const startIndex = uint8array.indexOf(search[0], searchedIndex);
    if (startIndex === -1) {
      return false;
    }

    for (const [j, element] of search.entries()) {
      if (uint8array[startIndex + j] !== element) {
        searchedIndex = startIndex + 1;
        continue outer;
      }
    }

    return true;
  }
}

/**
 * search array is subset of uint8array
 * @param uint8array bytes data
 * @param search bytes data
 * @param fromIndex bytes data
 * @returns index
 */
export function indexOf(uint8array: Uint8Array, search: Uint8Array, fromIndex = 0): number {
  if (search.length === 0) {
    return 0;
  }
  let searchedIndex = fromIndex;
  outer: while (true) {
    const startIndex = uint8array.indexOf(search[0], searchedIndex);
    if (startIndex === -1) {
      return -1;
    }

    for (const [j, element] of search.entries()) {
      if (uint8array[startIndex + j] !== element) {
        searchedIndex = startIndex + 1;
        continue outer;
      }
    }

    return startIndex;
  }
}

/**
 * read unsigned number from array
 * @param uint8array bytes data
 * @param offset offset of data array
 * @param length bytes length
 * @returns read number
 */
export function readUintBE(uint8array: Uint8Array, offset: number, length: number): number {
  switch (length) {
    case 1:
      return UINT8.get(uint8array, offset);
    case 2:
      return UINT16_BE.get(uint8array, offset);
    case 3:
      return UINT24_BE.get(uint8array, offset);
    case 4:
      return UINT32_BE.get(uint8array, offset);
    case 5:
      return (
        uint8array[offset] * 256 ** 4 +
        uint8array[offset + 1] * 256 ** 3 +
        uint8array[offset + 2] * 256 ** 2 +
        uint8array[offset + 3] * 256 ** 1 +
        uint8array[offset + 4]
      );

    case 6:
      return (
        uint8array[offset] * 256 ** 5 +
        uint8array[offset + 1] * 256 ** 4 +
        uint8array[offset + 2] * 256 ** 3 +
        uint8array[offset + 3] * 256 ** 2 +
        uint8array[offset + 4] * 256 ** 1 +
        uint8array[offset + 5]
      );
    default:
      throw new RangeError("length must be 1-6");
  }
}
