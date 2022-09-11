import { expect, test } from "vitest";

import { join } from "node:path";
import { samplePath } from "./util";
import { Parsers } from "./metadata-parsers";

test.each(Parsers)("should decode id3v2-duration-allframes", async (_, parser) => {
  /**
   * Audacity:         64512 samples (counts 56 frames??)
   * ---------------------------
   * MPEG-length:	     47647
   * Sample-rate:	     44100
   * frame_size:	       835
   * Samples per frame	1152
   *
   * Summary:
   * ===============
   * Total number of frames: 57, unpadded: 5, padded: 52
   * File is CBR. Bitrate of each frame is 256 kbps.
   * Exact length: 00:01
   */
  const filePath = join(samplePath, "id3v2-duration-allframes.mp3");

  const metadata = await parser(filePath, "audio/mpeg", { duration: true });
  const format = metadata.format;
  const common = metadata.common;

  expect(format.tagTypes, "format.tagTypes").toStrictEqual(["ID3v2.3"]);
  expect(format.bitrate, "format.bitrate").toBe(256_000);
  expect(format.numberOfChannels, "format.numberOfChannels").toBe(2);
  expect(format.sampleRate, "format.sampleRate").toBe(44_100);
  expect(format.duration, "format.duration (test duration=true)").toBe((57 * 1152) / format.sampleRate);
  expect(format.container, "format.container").toBe("MPEG");
  expect(format.codec, "format.codec").toBe("MPEG 1 Layer 3");
  expect(format.tool, "format.tool").toBe("LAME 3.98.4");

  expect(common.title, "common.album").toBe("Turkish Rondo");
  expect(common.album, "common.title").toBe("Piano Classics");
  expect(common.year, "common.year").toBe(0);
  expect(common.artist, "common.artist").toBe("Aubrey Hilliard");
  expect(common.composer, "common.composer").toStrictEqual(["Mozart"]);
  expect(common.track, "common.track").toStrictEqual({ no: 1, of: null });
  expect(common.genre, "common.genre").toStrictEqual(["Classical"]);
  expect(common.disk, "common.disk").toStrictEqual({ no: null, of: null });
  expect(common.picture, "common.picture").toBeUndefined();
});
