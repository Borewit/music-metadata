import { map } from "../combinate/map";
import { u8 } from "../primitive/integer";

import type { Unit } from "../type/unit";

export type Id3v2TextEncoding = "latin1" | "utf-16" | "utf-16be" | "utf8";

export const id3v2TextEncoding: Unit<Id3v2TextEncoding, RangeError> = map(u8, (value) => {
  return (
    (
      {
        0: "latin1",
        1: "utf-16",
        2: "utf-16be",
      } as const
    )[value] ?? "utf8"
  );
});
