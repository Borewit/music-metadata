import { describe, test, expect } from "vitest";
import { readLatin1String, readUtf16leString, readUtf8String } from "./string";

describe("decode latin1 encoding", () => {
  test("0x00-0x7f", () => {
    const buffer = new Uint8Array([
      0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12,
      0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25,
      0x26, 0x27, 0x28, 0x29, 0x2a, 0x2b, 0x2c, 0x2d, 0x2e, 0x2f, 0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38,
      0x39, 0x3a, 0x3b, 0x3c, 0x3d, 0x3e, 0x3f, 0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x4b,
      0x4c, 0x4d, 0x4e, 0x4f, 0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x5b, 0x5c, 0x5d, 0x5e,
      0x5f, 0x60, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x6b, 0x6c, 0x6d, 0x6e, 0x6f, 0x70, 0x71,
      0x72, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x7b, 0x7c, 0x7d, 0x7e, 0x7f,
    ]);

    expect(readLatin1String(buffer, 8 * 0, 8)).toBe("\0\u0001\u0002\u0003\u0004\u0005\u0006\u0007");
    expect(readLatin1String(buffer, 8 * 1, 8)).toBe("\b\t\n\u000B\f\r\u000E\u000F");
    expect(readLatin1String(buffer, 8 * 2, 8)).toBe("\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017");
    expect(readLatin1String(buffer, 8 * 3, 8)).toBe("\u0018\u0019\u001A\u001B\u001C\u001D\u001E\u001F");
    expect(readLatin1String(buffer, 8 * 4, 8)).toBe(" !\"#$%&'");
    expect(readLatin1String(buffer, 8 * 5, 8)).toBe("()*+,-./");
    expect(readLatin1String(buffer, 8 * 6, 8)).toBe("01234567");
    expect(readLatin1String(buffer, 8 * 7, 8)).toBe("89:;<=>?");
    expect(readLatin1String(buffer, 8 * 8, 8)).toBe("@ABCDEFG");
    expect(readLatin1String(buffer, 8 * 9, 8)).toBe("HIJKLMNO");
    expect(readLatin1String(buffer, 8 * 10, 8)).toBe("PQRSTUVW");
    expect(readLatin1String(buffer, 8 * 11, 8)).toBe("XYZ[\\]^_");
    expect(readLatin1String(buffer, 8 * 12, 8)).toBe("`abcdefg");
    expect(readLatin1String(buffer, 8 * 13, 8)).toBe("hijklmno");
    expect(readLatin1String(buffer, 8 * 14, 8)).toBe("pqrstuvw");
    expect(readLatin1String(buffer, 8 * 15, 8)).toBe("xyz{|}~\u007F");
  });

  test("0x80-0xff", () => {
    const buffer = new Uint8Array([
      0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x8b, 0x8c, 0x8d, 0x8e, 0x8f, 0x90, 0x91, 0x92,
      0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0x9b, 0x9c, 0x9d, 0x9e, 0x9f, 0xa0, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5,
      0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xab, 0xac, 0xad, 0xae, 0xaf, 0xb0, 0xb1, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8,
      0xb9, 0xba, 0xbb, 0xbc, 0xbd, 0xbe, 0xbf, 0xc0, 0xc1, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xcb,
      0xcc, 0xcd, 0xce, 0xcf, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xdb, 0xdc, 0xdd, 0xde,
      0xdf, 0xe0, 0xe1, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xeb, 0xec, 0xed, 0xee, 0xef, 0xf0, 0xf1,
      0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xfb, 0xfc, 0xfd, 0xfe, 0xff,
    ]);

    expect(readLatin1String(buffer, 8 * 0, 8)).toBe("\u20AC\u0081\u201A\u0192\u201E\u2026\u2020\u2021");
    expect(readLatin1String(buffer, 8 * 1, 8)).toBe("\u02C6\u2030\u0160\u2039\u0152\u008D\u017D\u008F");
    expect(readLatin1String(buffer, 8 * 2, 8)).toBe("\u0090\u2018\u2019\u201C\u201D\u2022\u2013\u2014");
    expect(readLatin1String(buffer, 8 * 3, 8)).toBe("\u02DC\u2122\u0161\u203A\u0153\u009D\u017E\u0178");
    expect(readLatin1String(buffer, 8 * 4, 8)).toBe("\u00A0\u00A1\u00A2\u00A3\u00A4\u00A5\u00A6\u00A7");
    expect(readLatin1String(buffer, 8 * 5, 8)).toBe("\u00A8\u00A9\u00AA\u00AB\u00AC\u00AD\u00AE\u00AF");
    expect(readLatin1String(buffer, 8 * 6, 8)).toBe("\u00B0\u00B1\u00B2\u00B3\u00B4\u00B5\u00B6\u00B7");
    expect(readLatin1String(buffer, 8 * 7, 8)).toBe("\u00B8\u00B9\u00BA\u00BB\u00BC\u00BD\u00BE\u00BF");
    expect(readLatin1String(buffer, 8 * 8, 8)).toBe("\u00C0\u00C1\u00C2\u00C3\u00C4\u00C5\u00C6\u00C7");
    expect(readLatin1String(buffer, 8 * 9, 8)).toBe("\u00C8\u00C9\u00CA\u00CB\u00CC\u00CD\u00CE\u00CF");
    expect(readLatin1String(buffer, 8 * 10, 8)).toBe("\u00D0\u00D1\u00D2\u00D3\u00D4\u00D5\u00D6\u00D7");
    expect(readLatin1String(buffer, 8 * 11, 8)).toBe("\u00D8\u00D9\u00DA\u00DB\u00DC\u00DD\u00DE\u00DF");
    expect(readLatin1String(buffer, 8 * 12, 8)).toBe("\u00E0\u00E1\u00E2\u00E3\u00E4\u00E5\u00E6\u00E7");
    expect(readLatin1String(buffer, 8 * 13, 8)).toBe("\u00E8\u00E9\u00EA\u00EB\u00EC\u00ED\u00EE\u00EF");
    expect(readLatin1String(buffer, 8 * 14, 8)).toBe("\u00F0\u00F1\u00F2\u00F3\u00F4\u00F5\u00F6\u00F7");
    expect(readLatin1String(buffer, 8 * 15, 8)).toBe("\u00F8\u00F9\u00FA\u00FB\u00FC\u00FD\u00FE\u00FF");
  });
});

describe("decode UTF-8 encoding", () => {
  /*
   *  U+0000 -   U+007F ->          0x00 -          0x7f
   *  U+0080 -   U+07FF ->       0xc2_80 -       0xdf_bf
   *  U+0800 -   U+FFFF ->    0xe0_80_80 -    0xef_bf_bf
   * U+10000 - U+10FFFF -> 0xf0_80_80_80 - 0xf4_bf_bf_bf
   */

  test("1 byte character", () => {
    const buffer = new Uint8Array([0x01, 0x02, 0x03, 0x10, 0x20, 0x7f]);

    expect(readUtf8String(buffer, 0, 6)).toBe("\u0001\u0002\u0003\u0010\u0020\u007F");
  });

  test("2 bytes character", () => {
    const buffer = new Uint8Array([0xc2, 0x80, 0xc3, 0xbf, 0xc4, 0x80, 0xd3, 0xbf, 0xdc, 0x80, 0xdf, 0xbf]);

    expect(readUtf8String(buffer, 0, 12)).toBe("\u0080\u00FF\u0100\u04FF\u0700\u07FF");
  });

  test("3 bytes character", () => {
    const buffer = new Uint8Array([0xe0, 0xa0, 0x80, 0xe0, 0xbf, 0xbf, 0xef, 0x80, 0x80, 0xef, 0xbf, 0xbf]);

    expect(readUtf8String(buffer, 0, 12)).toBe("\u0800\u0FFF\uF000\uFFFF");
  });

  test("4 bytes character", () => {
    const buffer = new Uint8Array([0xf0, 0x90, 0x80, 0x80, 0xf0, 0xbf, 0xbf, 0xbf, 0xf4, 0x8f, 0xbf, 0xbf]);

    expect(readUtf8String(buffer, 0, 12)).toBe("\uD800\uDC00\uD8BF\uDFFF\uDBFF\uDFFF");
  });
});

describe("decode UTF-16 encoding little endian", () => {
  /*
   *  U+0000 -   U+FFFF ->       0x00_00 -       0xff_ff
   * U+10000 - U+10FFFF -> 0xd8_00_dc_00 - 0xdb_ff_df_ff
   */

  test("2 bytes character", () => {
    const buffer = new Uint8Array([0x01, 0x00, 0x02, 0x00, 0x03, 0x00, 0x10, 0x00, 0x20, 0x00, 0x7f, 0x00]);

    expect(readUtf16leString(buffer, 0, 6)).toBe("\u0001\u0002\u0003");
    expect(readUtf16leString(buffer, 6, 6)).toBe("\u0010\u0020\u007F");
  });

  test("4 bytes character", () => {
    const buffer = new Uint8Array([0x00, 0xd8, 0x00, 0xdc, 0xbf, 0xd8, 0xff, 0xdf, 0xff, 0xdb, 0xff, 0xdf]);

    expect(readUtf16leString(buffer, 0, 4)).toBe("\uD800\uDC00");
    expect(readUtf16leString(buffer, 4, 4)).toBe("\uD8BF\uDFFF");
    expect(readUtf16leString(buffer, 8, 4)).toBe("\uDBFF\uDFFF");
  });
});
