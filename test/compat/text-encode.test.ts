import { expect, test } from "vitest";
import { decodeLatin1, decodeUtf16le, decodeUtf8 } from "../../lib/compat/text-decoder";
import { encodeUtf8 } from "../../lib/compat/text-encoder";

test("latin1 decode", () => {
  const uint8array = Uint8Array.of(0x48, 0x65, 0x6c, 0x6c, 0x6f);
  expect(decodeLatin1(uint8array)).toBe("Hello");
});

test("utf-8 decode", () => {
  const uint8array = Uint8Array.of(
    0x41, // A
    0x61, // a
    0xc4,
    0x94, // Ĕ
    0xeb,
    0x94,
    0x80, // 딀
    0xf0,
    0x90,
    0x90,
    0x96 // 𐐖
  );
  expect(decodeUtf8(uint8array)).toBe("AaĔ딀𐐖");
});

test("utf-8 encode", () => {
  const uint8array = Uint8Array.of(
    0x41, // A
    0x61, // a
    0xc4,
    0x94, // Ĕ
    0xeb,
    0x94,
    0x80, // 딀
    0xf0,
    0x90,
    0x90,
    0x96 // 𐐖
  );
  expect(encodeUtf8("AaĔ딀𐐖")).toEqual(uint8array);
});

test("utf-16 little endian decode", () => {
  const uint8array = Uint8Array.of(
    0x41,
    0x00, // A
    0x61,
    0x00, // a
    0x14,
    0x01, // Ĕ
    0x00,
    0xb5, // 딀
    0x01,
    0xd8,
    0x16,
    0xdc // 𐐖
  );
  expect(decodeUtf16le(uint8array)).toBe("AaĔ딀𐐖");
});
