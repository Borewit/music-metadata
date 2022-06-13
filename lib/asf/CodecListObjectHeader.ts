import { IGetToken } from "../strtok3";

/**
 * 3.5: The Codec-List-Object interface.
 */
interface ICodecListObjectHeader {
  entryCount: number;
}

/**
 * 3.5: The Codec List Object provides user-friendly information about the codecs and formats used to encode the content found in the ASF file.
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_5
 */
export const CodecListObjectHeader: IGetToken<ICodecListObjectHeader> = {
  len: 20,
  get: (buf: Buffer, off: number): ICodecListObjectHeader => {
    return {
      entryCount: buf.readUInt16LE(off + 16),
    };
  },
};
