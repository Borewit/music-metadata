import type { Unit } from "../type/unit";

type StrUnit = Unit<string, RangeError>;

const latin1Decoder = new TextDecoder("latin1");
const utf8Decoder = new TextDecoder();
const utf16leDecoder = new TextDecoder("utf-16le");
const utf16beDecoder = new TextDecoder("utf-16be");

const getEncodedString = (decoder: TextDecoder, length: number) => (buffer: Uint8Array, offset: number) => {
  return decoder.decode(buffer.slice(offset, offset + length));
};

const getUtf16BomString = (length: number) => (buffer: Uint8Array, offset: number) => {
  // BOM (Byte Order Mark)
  // if starts with:
  //   0xfe, 0xff -> big endian
  //   0xff, 0xfe -> little endian

  let lastBomIndex = offset;
  let decoder = utf16beDecoder;
  for (; lastBomIndex < offset + length; lastBomIndex += 2) {
    if (buffer[lastBomIndex] === 0xfe && buffer[lastBomIndex + 1] === 0xff) {
      decoder = utf16beDecoder;
    } else if (buffer[lastBomIndex] === 0xff && buffer[lastBomIndex + 1] === 0xfe) {
      decoder = utf16leDecoder;
    } else {
      break;
    }
  }

  return decoder.decode(buffer.slice(lastBomIndex, offset + length));
};

export const latin1 = (length: number): StrUnit => [length, getEncodedString(latin1Decoder, length)];
export const utf8 = (length: number): StrUnit => [length, getEncodedString(utf8Decoder, length)];
export const utf16 = (length: number): StrUnit => [length, getUtf16BomString(length)];
export const utf16be = (length: number): StrUnit => [length, getEncodedString(utf16beDecoder, length)];
export const utf16le = (length: number): StrUnit => [length, getEncodedString(utf16leDecoder, length)];
