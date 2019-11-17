import { assert } from 'chai';
import * as path from 'path';
import { Parsers } from './metadata-parsers';
import { IFormat } from '../lib';

describe('Parse ADTS/AAC', () => {

  const samplePath = path.join(__dirname, 'samples', 'aac');

  function checkFormat(format: IFormat, dataFormat: string, codec: string, codecProfile: string, sampleRate: number, channels: number, bitrate: number, samples: number) {
    assert.strictEqual(format.container, dataFormat, 'format.container');
    assert.strictEqual(format.codec, codec, 'format.codec');
    assert.strictEqual(format.codecProfile, codecProfile, 'format.codecProfile');
    assert.strictEqual(format.lossless, false, 'format.lossless');
    assert.strictEqual(format.sampleRate, sampleRate, 'format.sampleRate');
    assert.strictEqual(format.numberOfChannels, channels, 'format.numberOfChannels');
    assert.approximately(format.bitrate, bitrate, 500, 'format.bitrate');
    assert.strictEqual(format.numberOfSamples, samples, `format.numberOfSamples = ${samples} samples`);
    assert.approximately(format.duration, samples / sampleRate, 0.1, 'format.duration');
  }

  describe('parse: adts-mpeg4.aac AAC-LC, 16.0 kHz, 2 channels, 3 kBit', () => {

    Parsers.forEach(parser => {
      it(parser.description, async () => {
        const metadata = await parser.initParser(path.join(samplePath, 'adts-mpeg4.aac'), 'audio/mpeg', {
          duration: true
        });
        checkFormat(metadata.format, 'ADTS/MPEG-4', 'AAC', 'AAC LC', 16000, 1, 20399, 256000);
      });
    });
  });

  describe('parse: adts-mpeg4-2.aac: AAC-LC, 44.1 kHz, 2 channels', () => {

    Parsers.forEach(parser => {
      it(parser.description, async () => {
        const metadata = await parser.initParser(path.join(samplePath, 'adts-mpeg4-2.aac'), 'audio/mpeg', {
          duration: true
        });
        checkFormat(metadata.format, 'ADTS/MPEG-4', 'AAC', 'AAC LC', 44100, 2, 128000, 14336);
      });
    });
  });

});
