import { describe, test, expect } from "vitest";

import { getTokenizerWithData, tokenizerCases } from "./util";

describe.each(tokenizerCases)("tokenizer from %s", (_name, load) => {
  test("should contain fileSize if constructed from file-read-stream", async () => {
    // ToDo
    const rst = await getTokenizerWithData("1A00", load);
    expect(rst.fileInfo.size, " ReadStreamTokenizer.fileSize.size").toBe(16);

    await rst.close();
  });
});
