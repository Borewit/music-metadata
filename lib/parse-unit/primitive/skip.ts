import type { Unit } from "../type/unit";

export const skip = (length: number): Unit<undefined, never> => [
  length,
  (): undefined => {
    return;
  },
];

export const pad = <T, E extends Error>(unit: Unit<T, E>, length: number): Unit<T, E> => [length, unit[1]];
