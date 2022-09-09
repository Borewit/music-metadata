import { expect, test } from "vitest";
import { join } from "node:path";

import { samplePath } from "./util";
import { Parsers } from "./metadata-parsers";

test.each(Parsers)("should reject files that can't be parsed", async (parser) => {
  const filePath = join(samplePath, "flac.flac.jpg");

  // Run with default options
  const rejected = expect(() => parser.initParser(filePath)).rejects;
  await rejected.toBeDefined();
  await rejected.toHaveProperty("error.message");
});
