import {assert} from "chai";
import * as mm from "../src";

import * as fs from "fs";
import * as path from "path";
import {SourceStream} from "./util";
import {ID3v24TagMapper} from "../src/id3v2/ID3v24TagMapper";
import {Parsers} from './metadata-parsers';
import {IFormat, INativeTagDict} from '../src/type';

const t = assert;

describe("Parse ADTS/AAC", () => {

  const samplePath = path.join(__dirname, 'samples', 'aac');

  function checkFormat(format: IFormat, dataFormat: string, codec: string, codecProfile: string, sampleRate: number, channels: number, bitrate: number, samples?: number) {
    t.strictEqual(format.container, dataFormat, 'format.container');
    t.strictEqual(format.codec, codec, 'format.codec');
    t.strictEqual(format.codecProfile, codecProfile, 'format.codecProfile');
    t.strictEqual(format.lossless, false, 'format.lossless');
    t.strictEqual(format.sampleRate, sampleRate, 'format.sampleRate');
    t.strictEqual(format.numberOfChannels, channels, 'format.numberOfChannels');
    t.approximately(format.bitrate, bitrate, 500, 'format.bitrate');
    if (samples) {
      t.strictEqual(format.numberOfSamples, samples, `format.numberOfSamples = ${samples} samples`);
    } else {
      t.isUndefined(format.numberOfSamples, `format.numberOfSamples = ${samples} samples`);
    }
  }

  describe('parse: adts-mpeg4.aac AAC-LC, 16.0 kHz, 2 channels, 3 kBit', () => {

    Parsers.forEach(parser => {
      it(parser.description, () => {
        return parser.initParser(path.join(samplePath, 'adts-mpeg4.aac'), 'audio/mpeg', {native: true}).then(metadata => {
          checkFormat(metadata.format, 'ADTS/MPEG-4', 'AAC', 'AAC LC', 16000, 1, 3000);
        });
      });
    });
  });

  describe('parse: adts-mpeg4-2.aac: AAC-LC, 44.1 kHz, 2 channels', () => {

    Parsers.forEach(parser => {
      it(parser.description, () => {
        return parser.initParser(path.join(samplePath, 'adts-mpeg4-2.aac'), 'audio/mpeg', {native: true}).then(metadata => {
          checkFormat(metadata.format, 'ADTS/MPEG-4', 'AAC', 'AAC LC', 44100, 2, 128000);
        });
      });
    });
  });

});
