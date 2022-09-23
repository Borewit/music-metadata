import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { IFormat, parseFile } from "../lib";

import { Parsers } from "./metadata-parsers";
import { samplePath } from "./util";

// Parse AIFF (Audio Interchange File Format)

const aiffSamplePath = join(samplePath, "aiff");

function checkFormat(
  format: IFormat,
  codec: string,
  sampleRate: number,
  channels: number,
  bitsPerSample: number,
  samples: number
) {
  const lossless = codec === "PCM";
  const dataFormat = lossless ? "AIFF" : "AIFF-C";
  const duration = samples / sampleRate;

  expect(format.container, "format.container").toBe(dataFormat);
  expect(format.lossless, "format.lossless").toBe(lossless);
  expect(format.sampleRate, "format.sampleRate").toBe(sampleRate);
  expect(format.bitsPerSample, "format.bitsPerSample").toBe(bitsPerSample);
  expect(format.numberOfChannels, "format.numberOfChannels").toBe(channels);
  expect(format.numberOfSamples, "format.numberOfSamples").toBe(samples);
  expect(format.duration, "format.duration").toBe(duration);
  expect(format.codec, "format.codec").toBe(codec);
}

describe("Parse AIFF", () => {
  test.each(Parsers)("parser: %s", async (_, parser) => {
    // AIFF file, AIFF file, stereo 8-bit data
    // Source: http://www-mmsp.ece.mcgill.ca/Documents/AudioFormats/AIFF/Samples.html
    const filePath = join(aiffSamplePath, "M1F1-int8-AFsp.aif");
    const metadata = await parser(filePath, "audio/aiff");
    checkFormat(metadata.format, "PCM", 8000, 2, 8, 23_493);
  });
});

describe("Parse AIFF-C", () => {
  test.each(Parsers)("parser: %s", async (_, parser) => {
    // AIFF-C file, stereo A-law data (compression type: alaw)
    // Source: http://www-mmsp.ece.mcgill.ca/Documents/AudioFormats/AIFF/Samples.html
    const filePath = join(aiffSamplePath, "M1F1-AlawC-AFsp.aif");
    const metadata = await parser(filePath, "audio/aiff");
    checkFormat(metadata.format, "Alaw 2:1", 8000, 2, 16, 23_493);
  });

  // Issue: https://github.com/Borewit/music-metadata/issues/1211
  test("Uncompressed AIFC", async () => {
    const filePath = join(aiffSamplePath, "hit-broken.aif");

    const { format } = await parseFile(filePath);

    expect(format.container, "format.container").toBe("AIFF-C");
    expect(format.codec, "format.codec").toBe("32-bit floating point IEEE 32-bit float");
    expect(format.sampleRate, "format.sampleRate").toBe(44_100);
  });
});

describe("Parse perverse Files", () => {
  const ULAW = "ITU-T G.711 mu-law";

  describe("AIFF-C file (9 samples) with an odd length intermediate chunk", () => {
    test.each(Parsers)("parser: %s", async (_, parser) => {
      const filePath = join(aiffSamplePath, "Pmiscck.aif");
      const metadata = await parser(filePath, "audio/aiff");
      checkFormat(metadata.format, ULAW, 8000, 1, 16, 9);
    });
  });

  describe("AIFF-C file with 0 samples (no SSND chunk)", () => {
    test.each(Parsers)("parser: %s", async (_, parser) => {
      const filePath = join(aiffSamplePath, "Pnossnd.aif");
      const metadata = await parser(filePath, "audio/aiff");
      checkFormat(metadata.format, ULAW, 8000, 1, 16, 0);
    });
  });

  describe("AIFF-C file (9 samples), SSND chunk has a 5 byte offset to the data and trailing junk in the SSND chunk", () => {
    test.each(Parsers)("parser: %s", async (_, parser) => {
      const filePath = join(aiffSamplePath, "Poffset.aif");
      const metadata = await parser(filePath, "audio/aiff");
      checkFormat(metadata.format, ULAW, 8000, 1, 16, 9);
    });
  });

  describe("AIFF-C file (9 samples) with SSND chunk ahead of the COMM chunk", () => {
    test.each(Parsers)("parser: %s", async (_, parser) => {
      const filePath = join(aiffSamplePath, "Porder.aif");
      const metadata = await parser(filePath, "audio/aiff");
      checkFormat(metadata.format, ULAW, 8000, 1, 16, 9);
    });
  });

  describe("AIFF-C file (9 samples) with trailing junk after the FORM chunk", () => {
    test.each(Parsers)("parser: %s", async (_, parser) => {
      const filePath = join(aiffSamplePath, "Ptjunk.aif");
      const metadata = await parser(filePath, "audio/aiff");
      checkFormat(metadata.format, ULAW, 8000, 1, 16, 9);
    });
  });

  describe("AIFF-C file (9 samples) with COMM chunk declaring 92 bytes (1 byte longer than actual file length), SSND with 9 bytes, missing trailing fill byte", () => {
    test.each(Parsers)("parser: %s", async (_, parser) => {
      const filePath = join(aiffSamplePath, "Fnonull.aif");
      const metadata = await parser(filePath, "audio/aiff");
      checkFormat(metadata.format, ULAW, 8000, 1, 16, 9);
    });
  });
});

// Issue: https://github.com/Borewit/music-metadata/issues/643
test.each(Parsers)('Parse tag "(c) ": %s', async (_, parser) => {
  const filePath = join(aiffSamplePath, "No Sanctuary Here.aiff");

  const metadata = await parser(filePath);

  const format = metadata.format;

  expect(format.container, "format.container").toBe("AIFF");
  expect(format.codec, "format.codec").toBe("PCM");

  const common = metadata.common;

  expect(common.album, "common.album").toBe("Hdtracks 2020 Hi-Res Sampler");
  expect(common.artists, "common.artists").toStrictEqual(["Chris Jones"]);
  expect(common.encodersettings, "common.encodersettings").toBe("Lavf58.29.100");
  expect(common.year, "common.year").toBe(2020);
});

test("text chunks", async () => {
  const filePath = join(aiffSamplePath, "M1F1-AlawC-AFsp.aif");

  const { format, common } = await parseFile(filePath);

  expect(format.container, "format.container").toBe("AIFF-C");
  expect(format.codec, "format.codec").toBe("Alaw 2:1");

  expect(common.comment, "common.comment").toEqual([
    "AFspdate: 2003-01-30 03:28:34 UTC",
    "user: kabal@CAPELLA",
    "program: CopyAudio",
  ]);
});
