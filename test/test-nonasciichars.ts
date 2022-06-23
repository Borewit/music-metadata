import { expect, test } from "vitest";
import { join } from "node:path";

import { parseFile } from "../lib";
import { samplePath } from "./util";

test("should decode non-ascii-characters", async () => {
  const filename = "bug-non ascii chars.mp3";
  const filePath = join(samplePath, filename);

  const result = await parseFile(filePath);
  expect(result.common.artist, "common.artist").toBe("Janelle Monáe");
  expect(result.common.artists, "common.artists").toStrictEqual([
    "Janelle Monáe",
    "Roman Gianarthur",
    "Nate Wonder",
  ]);
});
