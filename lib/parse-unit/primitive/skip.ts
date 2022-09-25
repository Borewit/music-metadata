import type { Unit } from "../type/unit";

export const skip = (length: number): Unit<undefined, never> => [
  length,
  (): undefined => {
    return;
  },
];
