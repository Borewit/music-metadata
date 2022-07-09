import { describe, test, expect } from "vitest";
import { join } from "node:path";

import { parseFile } from "../lib";
import { samplePath } from "./util";
import { ratioToDb, dbToRatio, toRatio } from "../lib/common/Util";

describe("Decode replaygain tags", () => {
  const filePath = join(samplePath, "04 Long Drive.flac");

  test("Convert ratio to dB", () => {
    expect(ratioToDb(0.999_145_51)).toBeCloseTo(-0.003_712_59, 8);
  });

  test("Convert dB to ratio", () => {
    expect(dbToRatio(-7.03)).toBeCloseTo(0.198_152_7, 8);
  });

  test("Convert dB string value to IRatio", () => {
    expect(toRatio("-7.03 dB")).toStrictEqual({
      dB: -7.03,
      ratio: 0.198_152_702_580_509_8,
    });
    expect(toRatio("0.999_145_51")).toStrictEqual({
      dB: -0.004_345_117_740_176_917,
      ratio: 0.999,
    });
    expect(toRatio("xxx")).toStrictEqual({ dB: Number.NaN, ratio: Number.NaN });
  });

  test("should decode replaygain tags from FLAC/Vorbis", async () => {
    const metadata = await parseFile(filePath);
    expect(
      metadata.common.replaygain_track_gain,
      "replaygain_track_gain.ratio"
    ).toStrictEqual({ dB: -7.03, ratio: 0.198_152_702_580_509_8 });
    expect(
      metadata.common.replaygain_track_peak,
      "replaygain_track_peak.ratio = -0.00371259 dB"
    ).toStrictEqual({
      dB: -0.003_712_589_329_636_550_3,
      ratio: 0.999_145_51,
    });
  });
});
