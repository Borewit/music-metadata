import { describe, assert, it } from "vitest";
import * as path from "node:path";

import * as mm from "../lib";
import { samplePath } from "./util";
import { ratioToDb, dbToRatio, toRatio } from "../lib/common/Util";

describe("Decode replaygain tags", () => {
  const filePath = path.join(samplePath, "04 Long Drive.flac");

  it("Convert ratio to dB", () => {
    assert.approximately(ratioToDb(0.999_145_51), -0.003_712_59, 0.000_000_005);
  });

  it("Convert dB to ratio", () => {
    assert.approximately(dbToRatio(-7.03), 0.198_152_7, 0.000_000_005);
  });

  it("Convert dB string value to IRatio", () => {
    assert.deepEqual(toRatio("-7.03 dB"), {
      dB: -7.03,
      ratio: 0.198_152_702_580_509_8,
    });
    assert.deepEqual(toRatio("xxx"), { dB: Number.NaN, ratio: Number.NaN });
  });

  it("should decode replaygain tags from FLAC/Vorbis", async () => {
    return mm.parseFile(filePath).then((metadata) => {
      assert.deepEqual(
        metadata.common.replaygain_track_gain,
        { dB: -7.03, ratio: 0.198_152_702_580_509_8 },
        "replaygain_track_gain.ratio"
      );
      assert.deepEqual(
        metadata.common.replaygain_track_peak,
        { dB: -0.003_712_589_329_636_550_3, ratio: 0.999_145_51 },
        "replaygain_track_peak.ratio = -0.00371259 dB"
      );
    });
  });
});
