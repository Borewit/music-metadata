import { join } from "node:path";

import { expect, test } from "vitest";

import { Parsers } from "./metadata-parsers";
import { samplePath } from "./util";

test.each(Parsers)("should reject files that can't be parsed", async (_, parser) => {
  const filePath = join(samplePath, "flac.flac.jpg");

  // Run with default options
  const rejected = expect(() => parser(filePath)).rejects;
  await rejected.toBeDefined();
  await rejected.toHaveProperty("error.message");
});
