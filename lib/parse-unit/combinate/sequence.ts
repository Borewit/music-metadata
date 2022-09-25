import type { Unit } from "../type/unit";

export const sequence = <T>(...units: Unit<T, Error>[]): Unit<T[], Error> => {
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
      return results;
    },
  ];
};
