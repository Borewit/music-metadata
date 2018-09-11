
import {assert} from "chai";
import * as mm from "../src";
import * as fs from "fs-extra";
import * as path from "path";
import {SourceStream} from "./util";
import {Parsers} from './metadata-parsers';

const t = assert;
describe("WavPack decoding (audio/x-wavpack)", () => {

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

  Parsers.forEach(parser => {
    it(parser.description, () => {
      parser.initParser(wv1, 'audio/x-wavpack', {native: true}).then(metadata => {
        checkFormat(metadata.format);
        checkCommon(metadata.common);
      });
    });
  });

});
