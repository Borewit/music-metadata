import type { Unit } from "../type/unit";

type UnitsTupleBase = readonly [] | readonly Unit<unknown, Error>[];

type TupleIndex<T extends UnitsTupleBase> = Extract<keyof T, number>;

type UnitsIndexRecord<Units extends UnitsTupleBase> = Record<string, TupleIndex<Units>>;

type UnitsResult<Units extends UnitsTupleBase> = {
  [key in keyof Units]: Units[key] extends Unit<infer U, Error> ? U : never;
};

type UnitsMapObject<Units extends UnitsTupleBase, Obj extends UnitsIndexRecord<Units>> = {
  [key in keyof Obj]: Units[Obj[key]] extends Unit<infer U, Error> ? U : never;
};

type UnitsErrorUnion<Units extends UnitsTupleBase> = {
  [key in keyof Units]: Units[key] extends Unit<unknown, infer E> ? E : never;
}[number];

export const sequenceToObject = <Units extends UnitsTupleBase, Obj extends UnitsIndexRecord<Units>>(
  obj: Obj,
  ...units: Units
): Unit<UnitsMapObject<Units, Obj>, UnitsErrorUnion<Units>> => {
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

      const results2 = {} as UnitsMapObject<Units, Obj>;
      for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
        results2[key] = (results as UnitsResult<Units>)[obj[key]];
      }
      return results2;
    },
  ];
};
