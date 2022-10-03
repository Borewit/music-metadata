import { stripNulls } from "../../common/Util";
import { map } from "../combinate/map";
import { sequence } from "../combinate/sequence";
import { bytesTokenizer } from "../primitive/bytes";
import { u16le } from "../primitive/integer";
import { utf16le } from "../primitive/string";
import { readUnitFromBufferTokenizer } from "../utility/read-unit";

import { contentDescriptionRecord } from "./content-description-record";

import type { ITag } from "../../type";

/**
 * 3.11 Extended Content Description Object (optional, one only)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_11
 * @param size
 * @returns
 */
export const extendedContentDescriptionObject = (size: number) =>
  map(sequence(u16le, bytesTokenizer(size - 2)), ([count, data]) => {
    const tags: ITag[] = [];
    for (let i = 0; i < count; i++) {
      const nameLen = readUnitFromBufferTokenizer(data, u16le);
      const name = stripNulls(readUnitFromBufferTokenizer(data, utf16le(nameLen)));
      const valueType = readUnitFromBufferTokenizer(data, u16le);
      const valueLen = readUnitFromBufferTokenizer(data, u16le);
      const value = readUnitFromBufferTokenizer(data, contentDescriptionRecord(name, valueType, valueLen));
      tags.push({ id: name, value });
    }
    return tags;
  });
