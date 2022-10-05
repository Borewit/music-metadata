import { map } from "./map";
import { sequence } from "./sequence";

import type { Result } from "../type/result";
import type { Unit } from "../type/unit";

type UnitsTupleBase = readonly [] | readonly Unit<unknown, Error>[];

type UnitsValue<Units extends UnitsTupleBase> = Units extends UnitsTupleBase
  ? {
      [key in keyof Units]: Units[key] extends Unit<infer U, Error> ? U : never;
    }
  : never;

type UnitsErrorUnion<Units extends UnitsTupleBase> = {
  [key in keyof Units]: Units[key] extends Unit<unknown, infer E> ? E : never;
}[number];

type SequenceMapFn<Units extends UnitsTupleBase, U, E extends Error> = (
  ...unitValues: UnitsValue<Units>
) => Result<U, E>;

export const sequenceMap = <Units extends UnitsTupleBase, U, E extends Error>(
  ...unitsFn: [...Units, SequenceMapFn<Units, U, E>]
): Unit<U, UnitsErrorUnion<Units> | E> => {
  const units = unitsFn.slice(0, -1) as unknown as Units;
  const fn = unitsFn[unitsFn.length - 1] as unknown as SequenceMapFn<Units, U, E>;
  return map(sequence(...units), (values) => fn(...(values as unknown as UnitsValue<Units>)));
};
