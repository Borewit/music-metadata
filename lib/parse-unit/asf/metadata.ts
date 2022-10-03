import { stripNulls } from "../../common/Util";
import { map } from "../combinate/map";
import { sequence } from "../combinate/sequence";
import { bytesTokenizer } from "../primitive/bytes";
import { u16le, u32le } from "../primitive/integer";
import { skip } from "../primitive/skip";
import { utf16le } from "../primitive/string";
import { readUnitFromBufferTokenizer } from "../utility/read-unit";

import { contentDescriptionRecord } from "./content-description-record";

import type { ITag } from "../../type";

/**
 * 4.7  Metadata Object (optional, 0 or 1)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/04_objects_in_the_asf_header_extension_object.html#4_7
 * @param size
 * @returns
 */
export const metadataObject = (size: number) =>
  map(sequence(u16le, bytesTokenizer(size - 2)), ([count, data]) => {
    const tags: ITag[] = [];
    for (let i = 0; i < count; i++) {
      // const reserved = readUnitFromBufferTokenizer(data, u16le);
      // const streamNumber = readUnitFromBufferTokenizer(data, u16le);
      readUnitFromBufferTokenizer(data, skip(4));
      const nameLen = readUnitFromBufferTokenizer(data, u16le);
      const valueType = readUnitFromBufferTokenizer(data, u16le);
      const valueLen = readUnitFromBufferTokenizer(data, u32le);
      const name = stripNulls(readUnitFromBufferTokenizer(data, utf16le(nameLen)));
      const value = readUnitFromBufferTokenizer(data, contentDescriptionRecord(name, valueType, valueLen));
      tags.push({ id: name, value });
    }
    return tags;
  });
