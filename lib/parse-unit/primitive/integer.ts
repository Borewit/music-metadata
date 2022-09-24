import { dataview } from "../utility/dataview";
import { wrapError } from "../utility/wrap-error";

import type { Unit } from "../type/unit";

export const u8: Unit<number, RangeError> = [1, (buffer, offset) => wrapError(() => dataview(buffer).getUint8(offset))];
