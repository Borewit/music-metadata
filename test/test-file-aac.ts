import { describe, test, expect } from "vitest";
import { join } from "node:path";
import { Parsers } from "./metadata-parsers";
import type { IFormat } from "../lib";
import { samplePath } from "./util";

const aacSamplePath = join(samplePath, "aac");

function checkFormat(
  format: IFormat,
  dataFormat: string,
  codec: string,
  codecProfile: string,
  sampleRate: number,
  channels: number,
  bitrate: number,
  samples: number
) {
  expect(format.container, "format.container").toBe(dataFormat);
  expect(format.codec, "format.codec").toBe(codec);
  expect(format.codecProfile, "format.codecProfile").toBe(codecProfile);
  expect(format.lossless, "format.lossless").toBe(false);
  expect(format.sampleRate, "format.sampleRate").toBe(sampleRate);
  expect(format.numberOfChannels, "format.numberOfChannels").toBe(channels);
  expect(format.bitrate, "format.bitrate").toBeCloseTo(bitrate, -3);
  expect(format.numberOfSamples, "format.numberOfSamples").toBe(samples);
  expect(format.duration, "format.duration").toBeCloseTo(samples / sampleRate, 1);
}

describe("parse: adts-mpeg4.aac AAC-LC, 16.0 kHz, 2 channels, 3 kBit", () => {
  test.each(Parsers)("parser: %s", async (parser) => {
    const filePath = join(aacSamplePath, "adts-mpeg4.aac");
    const metadata = await parser.initParser(filePath, "audio/aac", {
      duration: true,
    });

    checkFormat(metadata.format, "ADTS/MPEG-4", "AAC", "AAC LC", 16_000, 1, 20_399, 256_000);
  });
});

describe("parse: adts-mpeg4-2.aac: AAC-LC, 44.1 kHz, 2 channels", () => {
  test.each(Parsers)("parser: %s", async (parser) => {
    const filePath = join(aacSamplePath, "adts-mpeg4-2.aac");
    const metadata = await parser.initParser(filePath, "audio/aac", {
      duration: true,
    });

    checkFormat(metadata.format, "ADTS/MPEG-4", "AAC", "AAC LC", 44_100, 2, 128_000, 14_336);
  });
});
