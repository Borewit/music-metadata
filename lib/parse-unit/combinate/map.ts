import type { Result } from "../type/result";
import type { Unit } from "../type/unit";

type MapUnit = <T, U, E extends Error, F extends Error>(
  unit: Unit<T, E>,
  fn: (value: T) => Result<U, F>
) => Unit<U, E | F>;

export const map: MapUnit = ([size, reader], fn) => {
  return [
    size,
    (buffer, offset) => {
      const result = reader(buffer, offset);
      if (result instanceof Error) return result;
      return fn(result);
    },
  ];
};
