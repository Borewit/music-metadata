import { trimRightNull } from "../../common/Util";
import { map } from "../combinate/map";
import { latin1 } from "../primitive/string";

import type { Unit } from "../type/unit";

export const id3v1String = (length: number): Unit<string, RangeError> =>
  map(latin1(length), (value) => trimRightNull(value).trim());
