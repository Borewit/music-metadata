import { expect, test } from "vitest";
import { join } from "node:path";

import { parseFile, orderTags } from "../lib";
import { samplePath } from "./util";

test("ID3v2.4", async () => {
  const filePath = join(samplePath, "29 - Dominator.mp3");

  const metadata = await parseFile(filePath);
  const nativeTags = orderTags(metadata.native["ID3v2.3"]);

  expect(nativeTags.UFID.length).toBe(1);

  expect(nativeTags.UFID, "UFID").toStrictEqual([
    {
      owner_identifier: "http://musicbrainz.org",
      identifier: new Uint8Array([
        0x33, 0x66, 0x32, 0x33, 0x66, 0x32, 0x63, 0x66, 0x2d, 0x32, 0x61, 0x34, 0x36, 0x2d, 0x34, 0x38, 0x65, 0x63,
        0x2d, 0x38, 0x36, 0x33, 0x65, 0x2d, 0x36, 0x65, 0x63, 0x34, 0x33, 0x31, 0x62, 0x35, 0x66, 0x65, 0x63, 0x61,
      ]),
    },
  ]);
});
