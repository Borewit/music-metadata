import { ITokenizer } from "../strtok3";

import * as Token from "../token-types";
import { CodecListObjectHeader } from "./CodecListObjectHeader";

export interface ICodecEntry {
  type: {
    videoCodec: boolean;
    audioCodec: boolean;
  };
  codecName: string;
  description: string;
  information: Buffer;
}

async function readString(tokenizer: ITokenizer): Promise<string> {
  const length = await tokenizer.readNumber(Token.UINT16_LE);
  return (
    await tokenizer.readToken(new Token.StringType(length * 2, "utf16le"))
  ).replace("\0", "");
}

/**
 * 3.5: Read the Codec-List-Object, which provides user-friendly information about the codecs and formats used to encode the content found in the ASF file.
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_5
 */
export async function readCodecEntries(
  tokenizer: ITokenizer
): Promise<ICodecEntry[]> {
  const codecHeader = await tokenizer.readToken(CodecListObjectHeader);
  const entries: ICodecEntry[] = [];
  for (let i = 0; i < codecHeader.entryCount; ++i) {
    entries.push(await readCodecEntry(tokenizer));
  }
  return entries;
}

async function readInformation(tokenizer: ITokenizer): Promise<Buffer> {
  const length = await tokenizer.readNumber(Token.UINT16_LE);
  const buf = Buffer.alloc(length);
  await tokenizer.readBuffer(buf);
  return buf;
}

/**
 * Read Codec-Entries
 * @param tokenizer
 */
async function readCodecEntry(tokenizer: ITokenizer): Promise<ICodecEntry> {
  const type = await tokenizer.readNumber(Token.UINT16_LE);
  return {
    type: {
      videoCodec: (type & 0x0001) === 0x0001,
      audioCodec: (type & 0x0002) === 0x0002,
    },
    codecName: await readString(tokenizer),
    description: await readString(tokenizer),
    information: await readInformation(tokenizer),
  };
}
