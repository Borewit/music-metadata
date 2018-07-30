import {} from "mocha";
import {assert} from "chai";
import * as mm from "../lib";
import * as fs from "fs-extra";
import * as path from "path";
import {SourceStream} from "./util";

const t = assert;

describe("WavPack decoding", () => {

  const samplePath = path.join(__dirname, 'samples');
  const wv1 = path.join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer.wv");

  function checkFormat(format) {
    t.strictEqual(format.dataformat, 'WavPack', 'format.dataformat');
    t.deepEqual(format.tagTypes, ['APEv2'], 'format.tagTypes');
    t.approximately(format.duration, 2.123, 1 / 1000, "format.duration");
  }

  function checkCommon(common) {
    t.strictEqual(common.title, "Sinner's Prayer", "common.title");
    t.deepEqual(common.artists, ['Beth Hart', 'Joe Bonamassa'], "common.artist");
  }

  it("should decode a WavPack audio file (.wv)", () => {

    return mm.parseFile(wv1, {native: true}).then(metadata => {
      checkFormat(metadata.format);
      checkCommon(metadata.common);
    });

  });

  it("should decode a WavPack audio stream (audio/x-wavpack)", () => {

    const stream = fs.createReadStream(wv1);

    return mm.parseStream(stream, 'audio/x-wavpack', {native: true}).then(metadata => {
      checkFormat(metadata.format);
      checkCommon(metadata.common);
    }).then(() => {
      stream.close();
    });

  });

});
