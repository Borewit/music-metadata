import { test, expect } from "vitest";
import { parseFile } from "../lib";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { samplePath } from "./util";

const files = [join(samplePath, "flac.flac"), join(samplePath, "flac-bug.flac")];

test.each(files)("should handle concurrent parsing of pictures", async (file) => {
  const result = await parseFile(file);
  const data = readFileSync(file + ".jpg");
  expect(result.common.picture[0].data, "check picture").toEqual(data);
});
