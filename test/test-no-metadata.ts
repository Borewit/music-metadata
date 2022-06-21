import { assert, it } from "vitest";
import * as path from "node:path";

import * as mm from "../lib";
import { samplePath } from "./util";

it("should reject files that can't be parsed", async () => {
  const filePath = path.join(samplePath, "flac.flac.jpg");

  // Run with default options
  try {
    await mm.parseFile(filePath);
    assert.fail("Should reject a file which cannot be parsed");
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    assert.isDefined(error);
    assert.isDefined(error.message);
  }
});
