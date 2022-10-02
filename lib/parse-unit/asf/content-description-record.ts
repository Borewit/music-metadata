import { stripNulls } from "../../common/Util";
import { map } from "../combinate/map";
import { bytes } from "../primitive/bytes";
import { u16le, u32le, u64le } from "../primitive/integer";
import { pad } from "../primitive/skip";
import { utf16le } from "../primitive/string";
import { val } from "../primitive/value";

import { GUID, guid } from "./guid";
import { WmPicture, wmPicture } from "./wm-picture";

import type { Unit } from "../type/unit";

export type ContentDescriptionRecord = string | number | bigint | boolean | Uint8Array | GUID | WmPicture;

/**
 * 3.11 Extended Content Description Object (optional, one only)
 * 4.7	Metadata Object (optional, 0 or 1)
 * 4.8	Metadata Library Object (optional, 0 or 1)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_11
 * @param name
 * @param type
 * @param length
 * @returns
 */
export const contentDescriptionRecord = (
  name: string,
  type: number,
  length: number
): Unit<ContentDescriptionRecord, RangeError> => {
  if (name === "WM/Picture") return wmPicture(length);

  const recordUnits: Unit<Exclude<ContentDescriptionRecord, WmPicture>, RangeError>[] = [
    map(utf16le(length), stripNulls),
    bytes(length),
    map(u16le, (value) => !!value),
    u32le,
    u64le,
    u16le,
    guid,
  ];

  return pad(recordUnits[type] ?? val(new Error(`unexpected value headerType: ${type}`)), length);
};
