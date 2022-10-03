import { sequenceToObject } from "../combinate/sequence-to-object";
import { u16le, u32le } from "../primitive/integer";
import { pad } from "../primitive/skip";

import { guid, GUID } from "./guid";

import type { Unit } from "../type/unit";

/**
 * 3.4: Header Extension Object (mandatory, one only)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_4
 */
export interface HeaderExtensionObject {
  reserved1: GUID;
  reserved2: number;
  extensionDataSize: number;
}

export const headerExtensionObject = (size: number): Unit<HeaderExtensionObject, RangeError> =>
  pad(
    sequenceToObject(
      {
        reserved1: 0,
        reserved2: 1,
        extensionDataSize: 2,
      },
      guid,
      u16le,
      u32le
    ),
    size
  );
