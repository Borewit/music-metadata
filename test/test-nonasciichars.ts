import { join } from "node:path";

import { expect, test } from "vitest";

import { Parsers } from "./metadata-parsers";
import { samplePath } from "./util";

test.each(Parsers)("should decode non-ascii-characters", async (_, parser) => {
  const filename = "bug-non ascii chars.mp3";
  const filePath = join(samplePath, filename);

  const result = await parser(filePath);

  expect(result.common.artist, "common.artist").toBe("Janelle Monáe");
  expect(result.common.artists, "common.artists").toStrictEqual(["Janelle Monáe", "Roman Gianarthur", "Nate Wonder"]);
});
