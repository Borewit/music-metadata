import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, test, expect, beforeAll } from "vitest";

import { EndOfStreamError } from "../../lib/peek-readable";
import { UINT8 } from "../../lib/token-types";

import { getTokenizerWithData, tokenizerCases } from "./util";

const size = 10 * 1024;
const buf = Buffer.alloc(size);

beforeAll(async () => {
  for (let i = 0; i < size; ++i) {
    buf[i] = i % 255;
  }

  const testFile = "tmp-transparency.dat";
  const pathTestFile = join(__dirname, "resources", testFile);
  await writeFile(pathTestFile, buf);
});

describe.each(tokenizerCases)("tokenizer from %s", (_name, load) => {
  test("Transparency", async () => {
    const rst = await getTokenizerWithData("tmp-transparency", load);
    let expected = 0;

    try {
      do {
        const v = await rst.readNumber(UINT8);
        expect(v, `offset=${expected}`).toBe(expected % 255);
        ++expected;
      } while (true);
    } catch (error) {
      expect(error).toBeInstanceOf(EndOfStreamError);
      expect(size, "total number of parsed bytes").toBe(expected);
    }

    await rst.close();
  }, 5000);
});
