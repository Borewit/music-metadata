import { describe, assert, it } from "vitest";
import * as path from "path";

import * as mm from "../lib";
import { TagType } from "../lib/common/GenericTagTypes";

interface IReplayGainSample {
  description: string;
  filename: string;
  container: string;
  tagType: TagType;
  track?: {
    gain: number;
    peak: number;
  };
  album?: {
    gain: number;
    peak: number;
  };
}

const samples: IReplayGainSample[] = [
  {
    description: "album",
    filename: "id3v23-txxx-album.mp3",
    container: "MPEG",
    tagType: "ID3v2.3",
    track: {
      gain: -24,
      peak: 0,
    },
    album: {
      gain: -12,
      peak: 0,
    },
  },
  {
    description: "album-nopeak",
    filename: "id3v23-txxx-album-nopeak.mp3",
    container: "MPEG",
    tagType: "ID3v2.3",
    track: {
      gain: 24,
      peak: -12,
    },
    album: {
      gain: 12,
      peak: 0,
    },
  },
  {
    description: "case sensitivity",
    filename: "id3v23-txxx-case.mp3",
    container: "MPEG",
    tagType: "ID3v2.3",
    track: {
      gain: -12,
      peak: 0,
    },
    album: {
      gain: -24,
      peak: 0,
    },
  },
  {
    description: "latin-1",
    filename: "id3v23-txxx-latin1.mp3",
    container: "MPEG",
    tagType: "ID3v2.3",
    track: {
      gain: 12,
      peak: -6,
    },
  },
  {
    description: "peak",
    filename: "id3v23-txxx-peak.mp3",
    container: "MPEG",
    tagType: "ID3v2.3",
    track: {
      gain: 0,
      peak: 6.0,
    },
    album: {
      gain: 0,
      peak: 12.0,
    },
  },
  {
    description: "track",
    filename: "id3v23-txxx-track.mp3",
    container: "MPEG",
    tagType: "ID3v2.3",
    track: {
      gain: -12,
      peak: 0,
    },
    album: {
      gain: -24,
      peak: 0,
    },
  },
  {
    description: "track-nopeak",
    filename: "id3v23-txxx-track-nopeak.mp3",
    container: "MPEG",
    tagType: "ID3v2.3",
    track: {
      gain: 12,
      peak: 0,
    },
    album: {
      gain: 0,
      peak: 6,
    },
  },
  {
    description: "track-only",
    filename: "id3v23-txxx-track-only.mp3",
    container: "MPEG",
    tagType: "ID3v2.3",
    track: {
      gain: 12,
      peak: -6,
    },
  },
  {
    description: "album",
    filename: "id3v24-txxx-album.mp3",
    container: "MPEG",
    tagType: "ID3v2.4",
    track: {
      gain: -24,
      peak: 0,
    },
    album: {
      gain: -12,
      peak: 0,
    },
  },
  {
    description: "track",
    filename: "id3v24-txxx-track.mp3",
    container: "MPEG",
    tagType: "ID3v2.4",
    track: {
      gain: -12,
      peak: 0,
    },
    album: {
      gain: -24,
      peak: 0,
    },
  },
  {
    description: "track-only",
    filename: "id3v24-txxx-track-only.mp3",
    container: "MPEG",
    tagType: "ID3v2.4",
    track: {
      gain: 12,
      peak: -6,
    },
  },
  {
    description: "utf8",
    filename: "id3v24-txxx-track-only.mp3",
    container: "MPEG",
    tagType: "ID3v2.4",
    track: {
      gain: 12,
      peak: -6,
    },
  },
  {
    description: "utf8",
    filename: "vorbis.flac",
    container: "FLAC",
    tagType: "vorbis",
    track: {
      gain: -3.26,
      peak: -5.19595,
    },
    album: {
      gain: -3.26,
      peak: -5.19595,
    },
  },
];

/**
 * Samples provided by: https://github.com/kepstin/replaygain-test-vectors
 */
describe("Test Replay-Gain", () => {
  const pathGainSamples = path.join(__dirname, "samples", "replay-gain");

  samples.forEach((sample) => {
    it(`Test ${sample.description}, mapping from tag header: ${sample.tagType}`, async () => {
      const filePath = path.join(pathGainSamples, sample.filename);

      const metadata = await mm.parseFile(filePath);
      const { format, common } = metadata;

      assert.strictEqual(
        format.container,
        sample.container,
        "format.container"
      );
      assert.deepEqual(format.tagTypes, [sample.tagType], "format.tagTypes");

      const d = 1 / 1000;

      if (sample.track) {
        assert.approximately(
          common.replaygain_track_gain.dB,
          sample.track.gain,
          d,
          "replay-gain: track gain"
        );
        assert.approximately(
          common.replaygain_track_peak.dB,
          sample.track.peak,
          d,
          "replay-gain: track peak"
        );
      } else {
        assert.isUndefined(
          common.replaygain_track_gain,
          "replay-gain: track gain"
        );
        assert.isUndefined(
          common.replaygain_track_peak,
          "replay-gain: track peak"
        );
      }

      if (sample.album) {
        assert.approximately(
          common.replaygain_album_gain.dB,
          sample.album.gain,
          d,
          "replay-gain: album gain"
        );
        assert.approximately(
          common.replaygain_album_peak.dB,
          sample.album.peak,
          d,
          "replay-gain: album peak"
        );
      } else {
        assert.isUndefined(
          common.replaygain_album_gain,
          "replay-gain: album gain"
        );
        assert.isUndefined(
          common.replaygain_album_peak,
          "replay-gain: album peak"
        );
      }
    });
  });
});
