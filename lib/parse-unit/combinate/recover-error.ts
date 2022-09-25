import type { Result } from "../type/result";
import type { Unit } from "../type/unit";

type MapUnit = <T, E extends Error>(unit: Unit<T, E>, fn: (value: E) => Result<T, E>) => Unit<T, E>;

export const recover: MapUnit = ([size, reader], fn) => {
  return [
    size,
    (buffer, offset) => {
      const result = reader(buffer, offset);
      if (result instanceof Error) return fn(result);
      return result;
    },
  ];
};
