import { test, expect, describe } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { samplePath } from "./util";
import { Parsers } from "./metadata-parsers";

const files = ["flac.flac", "flac-bug.flac"];

describe.each(Parsers)("parser: %s", (parser) => {
  test.each(files)("should handle concurrent parsing of pictures %s", async (file) => {
    const path = join(samplePath, file);
    const result = await parser.initParser(path);
    const data = readFileSync(path + ".jpg");
    expect(result.common.picture[0].data, "check picture").toEqual(data);
  });
});
