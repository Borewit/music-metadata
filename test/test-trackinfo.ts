import { describe, test, expect } from "vitest";
import { join } from "node:path";

import { ITrackInfo, TrackType } from "../lib/type";
import { samplePath } from "./util";
import { Parsers } from "./metadata-parsers";

describe.each(Parsers)("parser: %s", (_, parser) => {
  describe("ASF", () => {
    const asfPath = join(samplePath, "asf");

    test("wma", async () => {
      const filePath = join(asfPath, "issue_57.wma");
      const { format } = await parser(filePath);

      expect(format.trackInfo, "format.trackInfo").toMatchObject([
        {
          codecName: "Windows Media Audio 9.2",
          type: TrackType.audio,
        },
      ]);
    });

    test("elephant.asf", async () => {
      const filePath = join(asfPath, "elephant.asf");
      const { format } = await parser(filePath);

      expect(format.trackInfo, "format.trackInfo").toEqual(
        expect.arrayContaining([
          {
            codecName: "Windows Media Audio V2",
            type: TrackType.audio,
          },
          {
            codecName: "Microsoft MPEG-4 Video Codec V3",
            type: TrackType.video,
          },
        ])
      );
    });
  });

  describe("Matroska", () => {
    test("WebM", async () => {
      const filePath = join(samplePath, "matroska", "big-buck-bunny_trailer-short.vp8.webm");
      const { format } = await parser(filePath);

      expect(format.trackInfo[0], "format.trackInfo").toStrictEqual({
        audio: undefined,
        codecName: "VP8",
        codecSettings: undefined,
        flagDefault: undefined,
        flagEnabled: undefined,
        flagLacing: undefined,
        language: undefined,
        name: undefined,
        type: TrackType.video,
        video: {
          displayHeight: 360,
          displayWidth: 640,
          pixelHeight: 360,
          pixelWidth: 640,
        },
      });

      expect(format.trackInfo[1], "format.trackInfo").toStrictEqual({
        audio: {
          samplingFrequency: 44_100,
        },
        codecName: "VORBIS",
        codecSettings: undefined,
        flagDefault: undefined,
        flagEnabled: undefined,
        flagLacing: undefined,
        language: undefined,
        name: undefined,
        type: TrackType.audio,
        video: undefined,
      });
    });

    test("matroska-test-w1-test5-short.mkv", async () => {
      const filePath = join(samplePath, "matroska", "matroska-test-w1-test5-short.mkv");
      const { format } = await parser(filePath);

      const expectedList: ITrackInfo[] = [
        {
          audio: undefined,
          codecName: "MPEG4/ISO/AVC",
          codecSettings: undefined,
          flagDefault: undefined,
          flagEnabled: undefined,
          flagLacing: false,
          language: "und",
          name: undefined,
          type: TrackType.video,
          video: {
            displayHeight: 576,
            displayWidth: 1024,
            pixelHeight: 576,
            pixelWidth: 1024,
          },
        },
        {
          audio: {
            channels: 2,
            samplingFrequency: 48_000,
          },
          codecName: "AAC",
          codecSettings: undefined,
          flagDefault: undefined,
          flagEnabled: undefined,
          flagLacing: undefined,
          language: "und",
          name: undefined,
          type: TrackType.audio,
          video: undefined,
        },
        {
          audio: undefined,
          codecName: "S_TEXT/UTF8",
          codecSettings: undefined,
          flagDefault: undefined,
          flagEnabled: undefined,
          flagLacing: false,
          language: undefined,
          name: undefined,
          type: TrackType.subtitle,
          video: undefined,
        },
        {
          audio: undefined,
          codecName: "S_TEXT/UTF8",
          codecSettings: undefined,
          flagDefault: false,
          flagEnabled: undefined,
          flagLacing: false,
          language: "hun",
          name: undefined,
          type: TrackType.subtitle,
          video: undefined,
        },
        {
          audio: undefined,
          codecName: "S_TEXT/UTF8",
          codecSettings: undefined,
          flagDefault: false,
          flagEnabled: undefined,
          flagLacing: false,
          language: "ger",
          name: undefined,
          type: 17,
          video: undefined,
        },
        {
          audio: undefined,
          codecName: "S_TEXT/UTF8",
          codecSettings: undefined,
          flagDefault: false,
          flagEnabled: undefined,
          flagLacing: false,
          language: "fre",
          name: undefined,
          type: TrackType.subtitle,
          video: undefined,
        },
        {
          audio: undefined,
          codecName: "S_TEXT/UTF8",
          codecSettings: undefined,
          flagDefault: false,
          flagEnabled: undefined,
          flagLacing: false,
          language: "spa",
          name: undefined,
          type: TrackType.subtitle,
          video: undefined,
        },
        {
          audio: undefined,
          codecName: "S_TEXT/UTF8",
          codecSettings: undefined,
          flagDefault: false,
          flagEnabled: undefined,
          flagLacing: false,
          name: undefined,
          language: "ita",
          type: TrackType.subtitle,
          video: undefined,
        },
        {
          audio: {
            outputSamplingFrequency: 44_100,
            samplingFrequency: 22_050,
          },
          codecName: "AAC",
          codecSettings: undefined,
          flagDefault: false,
          flagEnabled: undefined,
          flagLacing: undefined,
          language: undefined,
          name: "Commentary",
          type: TrackType.audio,
          video: undefined,
        },
        {
          audio: undefined,
          codecName: "S_TEXT/UTF8",
          codecSettings: undefined,
          flagDefault: false,
          flagEnabled: undefined,
          flagLacing: false,
          language: "jpn",
          name: undefined,
          type: TrackType.subtitle,
          video: undefined,
        },
        {
          audio: undefined,
          codecName: "S_TEXT/UTF8",
          codecSettings: undefined,
          flagDefault: false,
          flagEnabled: undefined,
          flagLacing: false,
          language: "und",
          name: undefined,
          type: TrackType.subtitle,
          video: undefined,
        },
      ];

      for (const i of expectedList.keys()) {
        expect(format.trackInfo[i], "format.trackInfo").toStrictEqual(expectedList[i]);
      }
    });
  });

  describe("MPEG-4", () => {
    test('.mp4: "Mr. Pickles S02E07 My Dear Boy.mp4"', async () => {
      const filePath = join(samplePath, "mp4", "Mr. Pickles S02E07 My Dear Boy.mp4");
      const { format } = await parser(filePath);

      const expectedList: ITrackInfo[] = [
        {
          audio: {
            bitDepth: 16,
            channels: 2,
            samplingFrequency: 48_000,
          },
          codecName: "MPEG-4/AAC",
          type: TrackType.audio,
        },
        {
          audio: {
            bitDepth: 0,
            channels: 0,
            samplingFrequency: 1916.1076,
          },
          codecName: "<avc1>",
          type: TrackType.audio,
        },
        {
          audio: {
            bitDepth: 16,
            channels: 2,
            samplingFrequency: 48_000,
          },
          codecName: "AC-3",
          type: TrackType.audio,
        },
        {
          codecName: "CEA-608",
        },
      ];

      for (const i of expectedList.keys()) {
        expect(format.trackInfo[i], "format.trackInfo").toStrictEqual(expectedList[i]);
      }
    });
  });
});
