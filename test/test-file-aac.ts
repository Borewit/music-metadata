import { assert } from 'chai';
import path from 'node:path';

import { Parsers } from './metadata-parsers.js';

import type { IFormat } from '../lib/index.js';
import { samplePath } from './util.js';

const aacSamplePath = path.join(samplePath, 'aac');

describe('Parse ADTS/AAC', () => {

  function checkFormat(format: IFormat, dataFormat: string, codec: string, codecProfile: string, sampleRate: number, channels: number, bitrate: number, samples: number) {
    assert.strictEqual(format.container, dataFormat, 'format.container');
    assert.strictEqual(format.codec, codec, 'format.codec');
    assert.strictEqual(format.codecProfile!, codecProfile, 'format.codecProfile');
    assert.strictEqual(format.lossless, false, 'format.lossless');
    assert.strictEqual(format.sampleRate, sampleRate, 'format.sampleRate');
    assert.strictEqual(format.numberOfChannels, channels, 'format.numberOfChannels');
    assert.approximately(format.bitrate!, bitrate, 500, 'format.bitrate');
    assert.strictEqual(format.numberOfSamples, samples, `format.numberOfSamples = ${samples} samples`);
    assert.approximately(format.duration!, samples / sampleRate, 0.1, 'format.duration');
    assert.isTrue(format.hasAudio, 'format.hasAudio');
    assert.isFalse(format.hasVideo, 'format.hasAudio');
  }

  describe('parse: adts-mpeg4.aac AAC-LC, 16.0 kHz, 2 channels, 3 kBit', ()=> {

    Parsers.forEach(parser => {
      it(parser.description, async function (){
        const {format} = await parser.parse(() => this.skip(), path.join(aacSamplePath, 'adts-mpeg4.aac'), 'audio/aac', {
          duration: true
        });
        checkFormat(format, 'ADTS/MPEG-4', 'AAC', 'AAC LC', 16000, 1, 20399, 256000);
      });
    });
  });

  describe('parse: adts-mpeg4-2.aac: AAC-LC, 44.1 kHz, 2 channels', () => {

    Parsers.forEach(parser => {
      it(parser.description, async function(){
        const {format} = await parser.parse(() => this.skip(), path.join(aacSamplePath, 'adts-mpeg4-2.aac'), 'audio/aac', {
          duration: true
        });
        checkFormat(format, 'ADTS/MPEG-4', 'AAC', 'AAC LC', 44100, 2, 128000, 14336);
      });
    });
  });

  describe('parse: adts-sf-escape.aac: explicit sampling-frequency index (15)', () => {
    // When the ADTS sampling-frequency index is the escape value (15), the rate is
    // not encoded in the fixed header and cannot be derived from the lookup table.
    // It must surface as an unknown rate, never as a bogus negative value that
    // propagates into a negative bitrate (issue #2644).
    Parsers.forEach(parser => {
      it(parser.description, async function(){
        const {format} = await parser.parse(() => this.skip(), path.join(aacSamplePath, 'adts-sf-escape.aac'), 'audio/aac', {
          duration: true
        });
        assert.strictEqual(format.container, 'ADTS/MPEG-4', 'format.container');
        assert.strictEqual(format.codec, 'AAC', 'format.codec');
        assert.isNotOk(format.sampleRate, 'format.sampleRate should be unknown, not a negative value');
        assert.isAtLeast(format.bitrate ?? 0, 0, 'format.bitrate must never be negative');
      });
    });
  });

});
