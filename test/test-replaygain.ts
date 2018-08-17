import {assert} from "chai";
import * as mm from "../src";

import * as path from "path";

const t = assert;

describe("Decode replaygain tags", () => {

  const filePath = path.join(__dirname, "samples", "04 Long Drive.flac");

  it("should decode replaygain tags from FLAC/Vorbis", () => {

    return mm.parseFile(filePath, {native: true}).then(metadata => {
      t.strictEqual(metadata.common.replaygain_track_gain, "-7.03 dB", "common.replaygain_track_gain");
      t.strictEqual(metadata.common.replaygain_track_peak, 0.99914551, "common.replaygain_track_peak");
    });
  });

});
