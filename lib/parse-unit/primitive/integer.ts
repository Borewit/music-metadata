import { wrapError } from "../utility/wrap-error";

import type { Unit } from "../type/unit";

export const u8: Unit<number, RangeError> = [
  1,
  (buffer, offset) => {
    const dataview = new DataView(buffer.buffer);
    return wrapError(() => dataview.getUint8(offset));
  },
];
