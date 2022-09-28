import { dv } from "../../token-types/dataview";
import { map } from "../combinate/map";
import { sequence } from "../combinate/sequence";
import { u16be } from "../primitive/integer";
import { skip } from "../primitive/skip";

import type { Unit } from "../type/unit";

const getFloat80 = (buffer: Uint8Array, offset: number): number => {
  /*
   * seee_eeee eeee_eeee ffff_ffff ffff_ffff ffff_ffff ffff_ffff ffff_ffff ffff_ffff ffff_ffff ffff_ffff
   * e: 15, f: 64 big endian
   * s * (2 ** e_eeee - 01111) * f.ffffffffff
   * s * Infinity                             (e == 1_1111 = 31, f == 0)
   * NaN                                      (e == 1_1111 = 31, f != 0)
   */

  const view = dv(buffer);
  const u16 = view.getUint16(offset);
  const significantM = view.getUint32(offset + 2);
  const significantL = view.getUint32(offset + 6);

  const sign = u16 >> 15 ? -1 : 1;
  const exponent = u16 & 0b0111_1111_1111_1111;

  if (exponent === 31) {
    return significantM && significantL ? Number.NaN : sign * Number.POSITIVE_INFINITY;
  }
  return sign * (significantM * 2 ** 32 + significantL) * Math.pow(2, exponent - 0x3f_ff - 63);
};

export const f80: Unit<number, RangeError> = [10, getFloat80];
export const f80Alt: Unit<number, RangeError> = map(sequence(u16be, u16be, skip(6)), ([shift, base]) => {
  shift -= 16_398;
  return shift < 0 ? base >> Math.abs(shift) : base << shift;
});
