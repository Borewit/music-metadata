import { dataview as dv } from "../utility/dataview";
import { wrapError as wrap } from "../utility/wrap-error";

import type { Unit } from "../type/unit";

type NumUnit = Unit<number, RangeError>;

const getFloat16 = (buffer: Uint8Array, offset: number, isLittleEndian?: boolean) => {
  /*
   * seee_eeff ffff_ffff
   * e: 5, f: 10
   * s * (2 ** e_eeee - 01111) * 1.ffffffffff
   * s * (2 ** e_eeee - 01111) * 0.ffffffffff (e == 0_0000 = 0)
   * s * Infinity                             (e == 1_1111 = 31, f == 0)
   * NaN                                      (e == 1_1111 = 31, f != 0)
   */

  const u16 = dv(buffer).getUint16(offset, isLittleEndian);

  const sign = u16 >> 15 ? -1 : 1;
  const exponent = (u16 & 0b0111_1100_0000_0000) >> 10;
  const significant = u16 & 0b0011_1111_1111;

  if (exponent === 0) {
    return sign * significant * Math.pow(2, -24);
  }
  if (exponent === 31) {
    return significant ? Number.NaN : sign * Number.POSITIVE_INFINITY;
  }
  return sign * (significant + Math.pow(2, 10)) * Math.pow(2, exponent - 25);
};

export const f16be: NumUnit = [2, (buffer, offset) => wrap(() => getFloat16(buffer, offset))];
export const f16le: NumUnit = [2, (buffer, offset) => wrap(() => getFloat16(buffer, offset, true))];
export const f32be: NumUnit = [4, (buffer, offset) => wrap(() => dv(buffer).getFloat32(offset))];
export const f32le: NumUnit = [4, (buffer, offset) => wrap(() => dv(buffer).getFloat32(offset, true))];
export const f64be: NumUnit = [8, (buffer, offset) => wrap(() => dv(buffer).getFloat64(offset))];
export const f64le: NumUnit = [8, (buffer, offset) => wrap(() => dv(buffer).getFloat64(offset, true))];
