import { assert } from 'chai';
import path from 'node:path';

import { Parsers } from './metadata-parsers.js';
import { samplePath } from './util.js';

const wavpackSamplePath = path.join(samplePath, 'wavpack');

describe('Parse WavPack (audio/x-wavpack)', () => {

  describe('codec: WavPack', () => {

    function checkFormat(format) {
      assert.strictEqual(format.container, 'WavPack', 'format.container');
      assert.deepEqual(format.tagTypes, ['APEv2'], 'format.tagTypes');
      assert.approximately(format.duration, 2.123, 1 / 1000, 'format.duration');
      assert.strictEqual(format.codec, 'PCM', 'format.codecProfile');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasAudio');
    }

    function checkCommon(common) {
      assert.strictEqual(common.title, 'Sinner\'s Prayer', 'common.title');
      assert.deepEqual(common.artists, ['Beth Hart', 'Joe Bonamassa'], 'common.artist');
    }

    const wv1 = path.join(wavpackSamplePath, 'MusicBrainz - Beth Hart - Sinner\'s Prayer.wv');

    Parsers.forEach(parser => {
      it(parser.description, async function(){
        const { format, common } = await parser.parse(() => this.skip(), wv1, 'audio/x-wavpack');
        checkFormat(format);
        checkCommon(common);
      });
    });
  });

  describe('codec: DSD128', () => {

    function checkFormat(format) {
      assert.strictEqual(format.container, 'WavPack', 'format.container');
      assert.strictEqual(format.codec, 'DSD', 'format.codecProfile');
      assert.deepEqual(format.numberOfSamples, 564480, 'format.numberOfSamples');
      assert.strictEqual(format.sampleRate, 5644800, 'format.sampleRate');
      assert.strictEqual(format.duration, 0.1, 'format.duration');
      assert.deepEqual(format.tagTypes, [], 'format.tagTypes');
    }

    const wv1 = path.join(wavpackSamplePath, 'DSD128.wv');

    Parsers.forEach(parser => {
      it(parser.description, async function(){
        const { format } = await parser.parse(() => this.skip(), wv1, 'audio/x-wavpack');
        checkFormat(format);
      });
    });
  });

  describe('codec: DSD128 compressed', () => {

    function checkFormat(format) {
      assert.strictEqual(format.container, 'WavPack', 'format.container');
      assert.strictEqual(format.codec, 'DSD', 'format.codecProfile');
      assert.deepEqual(format.numberOfSamples, 564480, 'format.numberOfSamples');
      assert.strictEqual(format.sampleRate, 5644800, 'format.sampleRate');
      assert.strictEqual(format.duration, 0.1, 'format.duration');
      assert.deepEqual(format.tagTypes, [], 'format.tagTypes');
      assert.approximately(format.bitrate, 4810400, 1);
    }

    const wv1 = path.join(wavpackSamplePath, 'DSD128 high compression.wv');

    Parsers.forEach(parser => {
      it(parser.description, async function(){
        const { format } = await parser.parse(() => this.skip(), wv1, 'audio/x-wavpack');
        checkFormat(format);
      });
    });
  });

});
