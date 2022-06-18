import { IGetToken } from "./type";

/**
 * Consume a fixed number of bytes from the stream and return a string with a specified encoding.
 */
export class StringType implements IGetToken<string, Buffer> {
  public constructor(public len: number, public encoding: BufferEncoding) {}

  public get(uint8Array: Uint8Array, offset: number): string {
    return Buffer.from(uint8Array).toString(
      this.encoding,
      offset,
      offset + this.len
    );
  }
}

/**
 * ANSI Latin 1 String
 * Using windows-1252 / ISO 8859-1 decoding
 */
export class AnsiStringType implements IGetToken<string> {
  public constructor(public len: number) {}

  public get(buffer: Buffer, offset: number = 0): string {
    return decodeAnsiStringType(buffer, offset, offset + this.len);
  }
}

const windows1252 = [
  8364, 129, 8218, 402, 8222, 8230, 8224, 8225, 710, 8240, 352, 8249, 338, 141,
  381, 143, 144, 8216, 8217, 8220, 8221, 8226, 8211, 8212, 732, 8482, 353, 8250,
  339, 157, 382, 376, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170,
  171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185,
  186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200,
  201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215,
  216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230,
  231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245,
  246, 247, 248, 249, 250, 251, 252, 253, 254, 255,
] as const;

/**
 *
 * @param buffer
 * @param offset
 * @param until
 * @returns
 */
function decodeAnsiStringType(
  buffer: Uint8Array,
  offset: number,
  until: number
): string {
  let str = "";
  for (let i = offset; i < until; ++i) {
    str += codePointToString(singleByteDecoder(buffer[i]));
  }
  return str;
}

/**
 *
 * @param a
 * @param min
 * @param max
 * @returns
 */
function inRange(a: number, min: number, max: number): boolean {
  return min <= a && a <= max;
}

/**
 *
 * @param cp
 * @returns
 */
function codePointToString(cp: number): string {
  if (cp <= 0xffff) {
    return String.fromCharCode(cp);
  } else {
    cp -= 0x10000;
    return String.fromCharCode((cp >> 10) + 0xd800, (cp & 0x3ff) + 0xdc00);
  }
}

/**
 *
 * @param bite
 * @returns
 */
function singleByteDecoder(bite: number): number {
  if (inRange(bite, 0x00, 0x7f)) {
    return bite;
  }

  const codePoint = windows1252[bite - 0x80];
  if (codePoint === null) {
    throw  new Error("invaliding encoding");
  }

  return codePoint;
}
