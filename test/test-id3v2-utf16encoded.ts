import { expect, test } from "vitest";
import { join } from "node:path";

import { parseFile } from "../lib";
import { samplePath } from "./util";

test("decode id3v2-utf16", async () => {
  const filename = "id3v2-utf16.mp3";
  const filePath = join(samplePath, filename);

  const metadata = await parseFile(filePath, { duration: true });
  const { common } = metadata;

  expect(common.title, "title").toBe("Redial (Feat. LeafRunner and Nowacking)");
  expect(common.artist, "artist 0").toBe("YourEnigma");
  expect(common.year, "year").toBe(2014);
  expect(common.picture[0].format, "picture 0 format").toBe("image/jpeg");
  expect(common.picture[0].data.length, "picture 0 length").toBe(214_219);
  expect(common.picture[0].data[0], "picture 0 JFIF magic header").toBe(0xff);
  expect(common.picture[0].data[1], "picture 0 JFIF magic header").toBe(0xd8);

  const native = metadata.native["ID3v2.3"];
  expect(native, "Native id3v2.3 tags should be present").toBeTruthy();

  expect(native[0], "['ID3v2.4'].TIT2").toStrictEqual({
    id: "TIT2",
    value: "Redial (Feat. LeafRunner and Nowacking)",
  });
  expect(native[1], "['ID3v2.4'].TIT2").toStrictEqual({
    id: "TPE1",
    value: "YourEnigma",
  });
  expect(native[2], "['ID3v2.4'].TYER").toStrictEqual({
    id: "TYER",
    value: "2014",
  });
});
