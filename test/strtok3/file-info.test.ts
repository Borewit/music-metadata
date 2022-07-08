import { describe, test, expect } from "vitest";
import { getTokenizerWithData, tokenizerCases } from "./util";

const buf1A00 = Buffer.from([
  0x1a, 0x00, 0x1a, 0x00, 0x1a, 0x00, 0x1a, 0x00, 0x1a, 0x00, 0x1a, 0x00, 0x1a,
  0x00, 0x1a, 0x00,
]);

describe.each(tokenizerCases)("tokenizer from %s", (_name, load) => {
  test("should contain fileSize if constructed from file-read-stream", async () => {
    // ToDo
    const rst = await getTokenizerWithData("1A00", buf1A00, load);
    expect(rst.fileInfo.size, " ReadStreamTokenizer.fileSize.size").toBe(16);

    await rst.close();
  });
});
