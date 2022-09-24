import { dataview as dv } from "../utility/dataview";
import { wrapError as wrap } from "../utility/wrap-error";

import type { Unit } from "../type/unit";

type NumUnit = Unit<number, RangeError>;
type BigNumUnit = Unit<bigint, RangeError>;

const getUint24 = (buffer: Uint8Array, offset: number, isLittleEndian?: boolean) => {
  const dataview = dv(buffer);

  return isLittleEndian
    ? dataview.getUint8(offset) + (dataview.getUint16(offset + 1, isLittleEndian) << 8)
    : (dataview.getUint16(offset) << 8) + dataview.getUint8(offset + 2);
};

const getInt24 = (buffer: Uint8Array, offset: number, isLittleEndian?: boolean) => {
  const u24 = getUint24(buffer, offset, isLittleEndian);

  return u24 > 0x7f_ff_ff ? u24 - 0x1_00_00_00 : u24;
};

export const u8: NumUnit = [1, (buffer, offset) => wrap(() => dv(buffer).getUint8(offset))];
export const u16be: NumUnit = [2, (buffer, offset) => wrap(() => dv(buffer).getUint16(offset))];
export const u16le: NumUnit = [2, (buffer, offset) => wrap(() => dv(buffer).getUint16(offset, true))];
export const u24be: NumUnit = [3, (buffer, offset) => wrap(() => getUint24(buffer, offset))];
export const u24le: NumUnit = [3, (buffer, offset) => wrap(() => getUint24(buffer, offset, true))];
export const u32be: NumUnit = [4, (buffer, offset) => wrap(() => dv(buffer).getUint32(offset))];
export const u32le: NumUnit = [4, (buffer, offset) => wrap(() => dv(buffer).getUint32(offset, true))];
export const u64be: BigNumUnit = [8, (buffer, offset) => wrap(() => dv(buffer).getBigUint64(offset))];
export const u64le: BigNumUnit = [8, (buffer, offset) => wrap(() => dv(buffer).getBigUint64(offset, true))];

export const i8: NumUnit = [1, (buffer, offset) => wrap(() => dv(buffer).getInt8(offset))];
export const i16be: NumUnit = [2, (buffer, offset) => wrap(() => dv(buffer).getInt16(offset))];
export const i16le: NumUnit = [2, (buffer, offset) => wrap(() => dv(buffer).getInt16(offset, true))];
export const i24be: NumUnit = [3, (buffer, offset) => wrap(() => getInt24(buffer, offset))];
export const i24le: NumUnit = [3, (buffer, offset) => wrap(() => getInt24(buffer, offset, true))];
export const i32be: NumUnit = [4, (buffer, offset) => wrap(() => dv(buffer).getInt32(offset))];
export const i32le: NumUnit = [4, (buffer, offset) => wrap(() => dv(buffer).getInt32(offset, true))];
export const i64be: BigNumUnit = [8, (buffer, offset) => wrap(() => dv(buffer).getBigInt64(offset))];
export const i64le: BigNumUnit = [8, (buffer, offset) => wrap(() => dv(buffer).getBigInt64(offset, true))];
