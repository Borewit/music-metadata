import { sequenceToObject } from "../combinate/sequence-to-object";
import { u32le } from "../primitive/integer";

import { guid, GUID } from "./guid";

import type { Unit } from "../type/unit";

/**
 * 3.5: The Codec List Object provides user-friendly information about the codecs and formats used to encode the content found in the ASF file.
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_5
 */
export interface CodecListObject {
  reserved: GUID;
  codecEntriesCount: number;
}

export const codecListObject: Unit<CodecListObject, RangeError> = sequenceToObject(
  {
    reserved: 0,
    codecEntriesCount: 1,
  },
  guid,
  u32le
);
