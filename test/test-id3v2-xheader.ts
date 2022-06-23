import { expect, test } from "vitest";
import { join } from "node:path";

import { parseFile } from "../lib";
import { samplePath } from "./util";

test("should be able to read id3v2 files with extended headers", async () => {
  const filename = "id3v2-xheader.mp3";
  const filePath = join(samplePath, filename);

  const metadata = await parseFile(filePath, { duration: true });
  const format = metadata.format;
  const common = metadata.common;

  expect(format.numberOfSamples, "format.numberOfSamples").toBe(10_944);
  expect(format.sampleRate, "format.sampleRate").toBe(22_050);
  expect(format.duration, "format.duration").toBe(10_944 / format.sampleRate);
  expect(common.title, "common.title").toBe("title");
  expect(common.track, "common.track").toStrictEqual({ no: null, of: null });
  expect(common.disk, "common.disk").toStrictEqual({ no: null, of: null });
});
