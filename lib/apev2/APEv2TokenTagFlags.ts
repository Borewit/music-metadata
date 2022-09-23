import type { DataType } from "./DataType";

export interface ITagFlags {
  containsHeader: boolean;
  containsFooter: boolean;
  isHeader: boolean;
  readOnly: boolean;
  dataType: DataType;
}

/**
 *
 * @param flags
 * @returns
 */
export function parseTagFlags(flags: number): ITagFlags {
  return {
    containsHeader: isBitSet(flags, 31),
    containsFooter: isBitSet(flags, 30),
    isHeader: isBitSet(flags, 31),
    readOnly: isBitSet(flags, 0),
    dataType: (flags & 6) >> 1,
  };
}

/**
 * @param num {number}
 * @param bit 0 is least significant bit (LSB)
 * @returns {boolean} true if bit is 1; otherwise false
 */
export function isBitSet(num: number, bit: number): boolean {
  return (num & (1 << bit)) !== 0;
}
