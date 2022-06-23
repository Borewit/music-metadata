import { expect, test } from "vitest";
import { join } from "node:path";

import { parseFile } from "../lib";
import { samplePath } from "./util";

test('invalid "Date" frame should not cause crash', async () => {
  const filename = "bug-id3v2-unknownframe.mp3";
  const filePath = join(samplePath, filename);

  const metadata = await parseFile(filePath, { duration: true });
  const common = metadata.common;

  expect(common.title, "common.title").toBe("One");
  expect(common.artist, "common.artist").toBe("Coheed And Cambria");
  expect(common.album, "common.album").toBe("Year Of The Black Rainbow");
  expect(common.year, "common.year").toBe(2010);
  expect(common.track, "common.track").toStrictEqual({ no: 1, of: null });
  expect(common.genre, "common.genre").toStrictEqual(["Progressive Rock"]);
});
