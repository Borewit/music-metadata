/* eslint-disable unicorn/consistent-function-scoping */
import { describe, assert, it } from "vitest";
import * as path from "node:path";

import { Parsers } from "./metadata-parsers";
import { samplePath } from "./util";
import { ICommonTagsResult, IFormat } from "../lib";

const t = assert;

const wavpackSamplePath = path.join(samplePath, "wavpack");

describe("Parse WavPack (audio/x-wavpack)", () => {
  describe("codec: WavPack", () => {
    function checkFormat(format: IFormat) {
      t.strictEqual(format.container, "WavPack", "format.container");
      t.deepEqual(format.tagTypes, ["APEv2"], "format.tagTypes");
      t.approximately(format.duration, 2.123, 1 / 1000, "format.duration");
      t.strictEqual(format.codec, "PCM", "format.codecProfile");
    }

    function checkCommon(common: ICommonTagsResult) {
      t.strictEqual(common.title, "Sinner's Prayer", "common.title");
      t.deepEqual(
        common.artists,
        ["Beth Hart", "Joe Bonamassa"],
        "common.artist"
      );
    }

    const wv1 = path.join(
      wavpackSamplePath,
      "MusicBrainz - Beth Hart - Sinner's Prayer.wv"
    );

    for (const parser of Parsers) {
      it(parser.description, async () => {
        const metadata = await parser.initParser(wv1, "audio/x-wavpack");
        checkFormat(metadata.format);
        checkCommon(metadata.common);
      });
    }
  });

  describe("codec: DSD128", () => {
    function checkFormat(format: IFormat) {
      t.strictEqual(format.container, "WavPack", "format.container");
      t.strictEqual(format.codec, "DSD", "format.codecProfile");
      t.deepEqual(format.numberOfSamples, 564_480, "format.numberOfSamples");
      t.strictEqual(format.sampleRate, 5_644_800, "format.sampleRate");
      t.strictEqual(format.duration, 0.1, "format.duration");
      t.deepEqual(format.tagTypes, [], "format.tagTypes");
    }

    const wv1 = path.join(wavpackSamplePath, "DSD128.wv");

    for (const parser of Parsers) {
      it(parser.description, async () => {
        const metadata = await parser.initParser(wv1, "audio/x-wavpack");
        checkFormat(metadata.format);
      });
    }
  });

  describe("codec: DSD128 compressed", () => {
    function checkFormat(format: IFormat) {
      t.strictEqual(format.container, "WavPack", "format.container");
      t.strictEqual(format.codec, "DSD", "format.codecProfile");
      t.deepEqual(format.numberOfSamples, 564_480, "format.numberOfSamples");
      t.strictEqual(format.sampleRate, 5_644_800, "format.sampleRate");
      t.strictEqual(format.duration, 0.1, "format.duration");
      t.deepEqual(format.tagTypes, [], "format.tagTypes");
      t.approximately(format.bitrate, 4_810_400, 1);
    }

    const wv1 = path.join(wavpackSamplePath, "DSD128 high compression.wv");

    for (const parser of Parsers) {
      it(parser.description, async () => {
        const metadata = await parser.initParser(wv1, "audio/x-wavpack");
        checkFormat(metadata.format);
      });
    }
  });
});
