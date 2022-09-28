import { map } from "../combinate/map";
import { latin1 } from "../primitive/string";

import type { Unit } from "../type/unit";

const validFourCC = /^[\u0021-\u007E©][\0\u0020-\u007E]{3}/;

/**
 * Token for read FourCC
 * Ref: https://en.wikipedia.org/wiki/FourCC
 */
export const fourCc: Unit<string, RangeError | Error> = map(latin1(4), (value) => {
  if (!validFourCC.test(value)) {
    return new Error(`FourCC contains invalid characters: "${value}"`);
  }

  return value;
});
