import { describe, assert, it } from "vitest";
import * as path from "path";

import * as mm from "../lib";
import { samplePath } from "./util";

it("should reject files that can't be parsed", async () => {
  const filePath = path.join(samplePath, "flac.flac.jpg");

  // Run with default options
  try {
    await mm.parseFile(filePath);
    assert.fail("Should reject a file which cannot be parsed");
  } catch (err) {
    assert.isDefined(err);
    assert.isDefined(err.message);
  }
});
