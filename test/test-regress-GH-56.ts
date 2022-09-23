import { join } from "node:path";

import { expect, test } from "vitest";

import { Parsers } from "./metadata-parsers";
import { samplePath } from "./util";

// should calculate duration for a CBR encoded MP3

/*
 * --------------------------------------------------------
 * TAG headers:
 *  - ID3v2.3 at position 0, length is 191 bytes
 *  - APE v2.0 at position 5973245, length is 206 bytes
 *
 * MPEG-length:	   5973054
 * Sample-rate:	     44100
 * frame_size:	       417
 * Samples per frame	1152
 *
 * No errors found in file.
 *
 * Summary:
 * ===============
 * Total number of frames: 14291, unpadded: 584, padded: 13707
 * File is CBR. Bitrate of each frame is 128 kbps.
 * Exact length: 06:13
 *
 * Audacity:   16463232
 * Calculated: 16462080
 * --------------------------------------------------------
 */

const filePath = join(samplePath, "regress-GH-56.mp3");

test.each(Parsers)("%s", async (description, parser) => {
  const metadata = await parser(filePath, "audio/mpeg");
  const expectedTags = description === "file" || description === "buffer" ? ["ID3v2.3", "APEv2"] : ["ID3v2.3"];
  expect(metadata.format.tagTypes, "format.tagTypes").toStrictEqual(expectedTags);
  expect(metadata.format.sampleRate, "format.sampleRate").toBe(44_100);
  expect(metadata.format.duration, "format.duration").toBe(16_462_080 / 44_100);
});
