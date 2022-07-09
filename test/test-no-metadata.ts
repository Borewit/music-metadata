import { expect, test } from "vitest";
import { join } from "node:path";

import { parseFile } from "../lib";
import { samplePath } from "./util";

test("should reject files that can't be parsed", async () => {
  const filePath = join(samplePath, "flac.flac.jpg");

  const rejected = expect(() => parseFile(filePath)).rejects;
  await rejected.toBeDefined();
  await rejected.toHaveProperty("error.message");
  // Run with default options
  try {
    await parseFile(filePath);
    expect.fail("Should reject a file which cannot be parsed");
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    expect(error).toBeDefined();
    expect(error.message).toBeDefined();
  }
});
