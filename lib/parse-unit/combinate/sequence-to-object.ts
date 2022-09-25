import type { Unit } from "../type/unit";

type NonNullUnknown = NonNullable<unknown>;
type TupleIndex<T extends readonly [] | readonly unknown[]> = Extract<keyof T, number>;

type NamedUnitsValue<NamedUnits extends readonly [] | readonly (readonly [string, Unit<unknown, Error>])[]> = {
  [key in keyof NamedUnits]: NamedUnits[key] extends [infer K extends string, Unit<infer U, Error>] ? [K, U] : never;
}[TupleIndex<NamedUnits>];

type TupleUnionToObject<T extends [string, NonNullUnknown]> = {
  [K in T[0]]: Extract<T, [K, NonNullUnknown]>[1];
};

type UnitsObject<Units extends readonly [] | readonly (readonly [string, Unit<unknown, Error>])[]> = TupleUnionToObject<
  NamedUnitsValue<Units>
>;

type UnitsResult<Units extends readonly [] | readonly Unit<unknown, Error>[]> = {
  [key in keyof Units]: Units[key] extends Unit<infer U, Error> ? U : never;
};

type UnitsMapObject<Units extends readonly [] | readonly unknown[], Obj extends Record<string, TupleIndex<Units>>> = {
  [key in keyof Obj]: Units[Obj[key]] extends Unit<infer U, Error> ? U : never;
};

export const seq2obj = <NamedUnits extends readonly [] | readonly (readonly [string, Unit<unknown, Error>])[]>(
  ...units: NamedUnits
): Unit<UnitsObject<NamedUnits>, Error> => {
  let totalSize = 0;
  for (const [, [size]] of units) {
    totalSize += size;
  }

  return [
    totalSize,
    (buffer, offset) => {
      const results: Record<string, unknown> = {};
      for (const [name, [size, reader]] of units) {
        const result = reader(buffer, offset);
        if (result instanceof Error) return result;
        results[name] = result;
        offset += size;
      }
      return results as UnitsObject<NamedUnits>;
    },
  ];
};

export const sequenceToObject = <
  Units extends readonly [] | readonly Unit<unknown, Error>[],
  Obj extends Record<string, TupleIndex<Units>>
>(
  obj: Obj,
  ...units: Units
): Unit<UnitsMapObject<Units, Obj>, Error> => {
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
        if (result instanceof Error) return result;
        results.push(result);
        offset += size;
      }

      const results2 = { ...obj } as unknown as UnitsMapObject<Units, Obj>;
      for (const key in obj) {
        if (!Object.hasOwn(obj, key)) continue;
        results2[key] = (results as UnitsResult<Units>)[obj[key]];
      }
      return results2;
    },
  ];
};
