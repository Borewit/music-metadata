import { join } from "node:path";

import { test, expect, describe } from "vitest";

import { Parsers } from "./metadata-parsers";
import { samplePath } from "./util";

import type { TagType } from "../lib/common/GenericTagTypes";

type ReplayGainSample = [
  string,
  TagType,
  {
    filename: string;
    container: string;
    track?: {
      gain: number;
      peak: number;
    };
    album?: {
      gain: number;
      peak: number;
    };
  }
];

const samples: ReplayGainSample[] = [
  [
    "album",
    "ID3v2.3",
    {
      filename: "id3v23-txxx-album.mp3",
      container: "MPEG",
      track: { gain: -24, peak: 0 },
      album: { gain: -12, peak: 0 },
    },
  ],
  [
    "album-nopeak",
    "ID3v2.3",
    {
      filename: "id3v23-txxx-album-nopeak.mp3",
      container: "MPEG",
      track: { gain: 24, peak: -12 },
      album: { gain: 12, peak: 0 },
    },
  ],
  [
    "case sensitivity",
    "ID3v2.3",
    {
      filename: "id3v23-txxx-case.mp3",
      container: "MPEG",
      track: { gain: -12, peak: 0 },
      album: { gain: -24, peak: 0 },
    },
  ],
  [
    "latin-1",
    "ID3v2.3",
    {
      filename: "id3v23-txxx-latin1.mp3",
      container: "MPEG",
      track: { gain: 12, peak: -6 },
    },
  ],
  [
    "peak",
    "ID3v2.3",
    {
      filename: "id3v23-txxx-peak.mp3",
      container: "MPEG",
      track: { gain: 0, peak: 6 },
      album: { gain: 0, peak: 12 },
    },
  ],
  [
    "track",
    "ID3v2.3",
    {
      filename: "id3v23-txxx-track.mp3",
      container: "MPEG",
      track: { gain: -12, peak: 0 },
      album: { gain: -24, peak: 0 },
    },
  ],
  [
    "track-nopeak",
    "ID3v2.3",
    {
      filename: "id3v23-txxx-track-nopeak.mp3",
      container: "MPEG",
      track: { gain: 12, peak: 0 },
      album: { gain: 0, peak: 6 },
    },
  ],
  [
    "track-only",
    "ID3v2.3",
    {
      filename: "id3v23-txxx-track-only.mp3",
      container: "MPEG",
      track: { gain: 12, peak: -6 },
    },
  ],
  [
    "album",
    "ID3v2.4",
    {
      filename: "id3v24-txxx-album.mp3",
      container: "MPEG",
      track: { gain: -24, peak: 0 },
      album: { gain: -12, peak: 0 },
    },
  ],
  [
    "track",
    "ID3v2.4",
    {
      filename: "id3v24-txxx-track.mp3",
      container: "MPEG",
      track: { gain: -12, peak: 0 },
      album: { gain: -24, peak: 0 },
    },
  ],
  [
    "track-only",
    "ID3v2.4",
    {
      filename: "id3v24-txxx-track-only.mp3",
      container: "MPEG",
      track: { gain: 12, peak: -6 },
    },
  ],
  [
    "utf8",
    "ID3v2.4",
    {
      filename: "id3v24-txxx-track-only.mp3",
      container: "MPEG",
      track: { gain: 12, peak: -6 },
    },
  ],
  [
    "utf8",
    "vorbis",
    {
      filename: "vorbis.flac",
      container: "FLAC",
      track: { gain: -3.26, peak: -5.195_95 },
      album: { gain: -3.26, peak: -5.195_95 },
    },
  ],
];

/**
 * Samples provided by: https://github.com/kepstin/replaygain-test-vectors
 */

describe.each(Parsers)("parser: %s", (_, parser) => {
  describe("Test Replay-Gain", () => {
    const gainSamplesPath = join(samplePath, "replay-gain");

    test.each(samples)("Test %s, mapping from tag header: %s", async (_desc, tagType, sample) => {
      const filePath = join(gainSamplesPath, sample.filename);

      const metadata = await parser(filePath);
      const { format, common } = metadata;

      expect(format.container, "format.container").toBe(sample.container);
      expect(format.tagTypes, "format.tagTypes").toStrictEqual([tagType]);

      if (sample.track) {
        expect(common.replaygain_track_gain!.dB, "replay-gain: track gain").toBeCloseTo(sample.track.gain, 3);
        expect(common.replaygain_track_peak!.dB, "replay-gain: track peak").toBeCloseTo(sample.track.peak, 3);
      } else {
        expect(common.replaygain_track_gain, "replay-gain: track gain").toBeUndefined();
        expect(common.replaygain_track_peak, "replay-gain: track peak").toBeUndefined();
      }

      if (sample.album) {
        expect(common.replaygain_album_gain!.dB, "replay-gain: album gain").toBeCloseTo(sample.album.gain, 3);
        expect(common.replaygain_album_peak!.dB, "replay-gain: album peak").toBeCloseTo(sample.album.peak, 3);
      } else {
        expect(common.replaygain_album_gain, "replay-gain: album gain").toBeUndefined();
        expect(common.replaygain_album_peak, "replay-gain: album peak").toBeUndefined();
      }
    });
  });
});
