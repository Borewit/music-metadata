import { isNumberBitSet } from "../../common/Util";
import { map } from "../combinate/map";
import { sequence } from "../combinate/sequence";
import { bytes, bytesTokenizer } from "../primitive/bytes";
import { u16le, u32le } from "../primitive/integer";
import { utf16le } from "../primitive/string";
import { readUnitFromBufferTokenizer } from "../utility/read-unit";

import { guid, GUID } from "./guid";

import type { BufferTokenizer } from "../../strtok3/BufferTokenizer";
import type { Unit } from "../type/unit";

export interface CodecEntry {
  videoCodec: boolean;
  audioCodec: boolean;

  codecName: string;
  description: string;
  information: Uint8Array;
}

/**
 * 3.5: The Codec List Object provides user-friendly information about the codecs and formats used to encode the content found in the ASF file.
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_5
 */
export interface CodecListObject {
  reserved: GUID;
  codecEntriesCount: number;
  codecs: CodecEntry[];
}

const parseString = (tokenizer: BufferTokenizer) => {
  const length = readUnitFromBufferTokenizer(tokenizer, u16le);
  return readUnitFromBufferTokenizer(tokenizer, utf16le(length * 2));
};

export const codecListObject = (size: number): Unit<CodecListObject, RangeError> =>
  map(sequence(guid, u32le, bytesTokenizer(size - 20)), ([reserved, codecEntriesCount, tokenizer]) => {
    const codecs: CodecEntry[] = [];

    for (let i = 0; i < codecEntriesCount; i++) {
      const type = readUnitFromBufferTokenizer(tokenizer, u16le);
      const codecName = parseString(tokenizer);
      const description = parseString(tokenizer);
      const informationLen = readUnitFromBufferTokenizer(tokenizer, u16le);
      const information = readUnitFromBufferTokenizer(tokenizer, bytes(informationLen));

      codecs.push({
        audioCodec: isNumberBitSet(type, 0),
        videoCodec: isNumberBitSet(type, 1),

        codecName,
        description,
        information,
      });
    }

    return {
      reserved,
      codecEntriesCount,
      codecs,
    };
  });
