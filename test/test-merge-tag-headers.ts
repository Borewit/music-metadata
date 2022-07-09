import { describe, test, expect } from "vitest";
import { join } from "node:path";

import { parseFile } from "../lib";
import { samplePath } from "./util";

const issueDir = join(samplePath);

/**
 * issue_77_empty_tag.mp3 (metadata of: 'Like Spinning Plates (Live)'):
 * Has an empty ID3v2.3 tag and a ID3v1 tag.
 */
test("should ignore empty tag headers", async () => {
  const metadata = await parseFile(join(issueDir, "issue_77_empty_tag.mp3"));
  expect(metadata.common.title).toBe("Like Spinning Plates (Live)");
  expect(metadata.common.album).toBe("I Might Be Wrong");
  expect(metadata.common.artist).toBe("Radiohead");
});

describe("mergeTagHeaders option", () => {
  const testSample = join(issueDir, "Dethklok-mergeTagHeaders.mp3");
  /**
   * About the sample:
   * - Has ID3v1 and ID3v2.4 tag headers.
   * - Album is set in ID3v1 but not in ID3v2.4
   * - Artist in ID3v1 is different than in ID3v2.4
   */
  test("should merge multiple headers information when true", async () => {
    const metadata = await parseFile(testSample);
    const id3v24 = metadata.native["ID3v2.4"];
    const id3v11 = metadata.native.ID3v1;

    expect(metadata.common.album).toBe(
      id3v11.filter((tag) => tag.id === "album").pop().value
    );
    expect(metadata.common.artist).toBe(
      id3v24.filter((tag) => tag.id === "TPE1").pop().value
    );
  });
});
