import type { Unit } from "../type/unit";

export const u8: Unit<number, RangeError> = [
  1,
  (buffer, offset) => {
    const dataview = new DataView(buffer.buffer);
    try {
      return dataview.getUint8(offset);
    } catch (error) {
      if (error instanceof RangeError) {
        return error;
      }
      throw error;
    }
  },
];
