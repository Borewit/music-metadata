import type { Unit } from "../type/unit";

export const val = <T>(value: T): Unit<T, RangeError> => [0, () => value];
