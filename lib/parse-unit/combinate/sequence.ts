import type { Unit } from "../type/unit";

type UnitsValue<Units extends readonly [] | readonly Unit<unknown, Error>[]> = {
  [key in keyof Units]: Units[key] extends Unit<infer U, Error> ? U : never;
};

type UnitsErrorUnion<Units extends readonly [] | readonly unknown[]> = {
  [key in keyof Units]: Units[key] extends Unit<unknown, infer E> ? E : never;
}[number];

export const sequence = <Units extends readonly [] | readonly Unit<unknown, Error>[]>(
  ...units: Units
): Unit<UnitsValue<Units>, UnitsErrorUnion<Units>> => {
  let totalSize = 0;
  for (const [size] of units) {
    totalSize += size;
  }

  return [
    totalSize,
    (buffer, offset) => {
      const results = [];
      for (const [size, reader] of units) {
        const result = reader(buffer, offset);
        if (result instanceof Error) return result as UnitsErrorUnion<Units>;
        results.push(result);
        offset += size;
      }
      return results as UnitsValue<Units>;
    },
  ];
};
