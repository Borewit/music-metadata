import { map } from "../combinate/map";
import { sequence } from "../combinate/sequence";
import { u8 } from "../primitive/integer";
import { latin1 } from "../primitive/string";

import type { Unit } from "../type/unit";

export const pstring = (length: number): Unit<string, RangeError> =>
  map(sequence(u8, latin1(length - 1)), ([size, str]) => {
    if (length % 2) return new RangeError("Illegal pstring length");
    if (size === 0) return "";
    if (size === str.length) return str;
    if (size === str.length - 1) return str.slice(0, -1);
    return new RangeError("Illegal pstring length");
  });
