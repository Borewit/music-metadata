import { assert } from 'chai';
import path from 'node:path';

import { Parsers } from './metadata-parsers.js';
import { samplePath } from './util.js';

const t = assert;

const wavpackSamplePath = path.join(samplePath, 'wavpack');

describe('Parse WavPack (audio/x-wavpack)', () => {

  describe('codec: WavPack', () => {

    function checkFormat(format) {
      t.strictEqual(format.container, 'WavPack', 'format.container');
      t.deepEqual(format.tagTypes, ['APEv2'], 'format.tagTypes');
      t.approximately(format.duration, 2.123, 1 / 1000, 'format.duration');
      t.strictEqual(format.codec, 'PCM', 'format.codecProfile');
    }

    function checkCommon(common) {
      t.strictEqual(common.title, 'Sinner\'s Prayer', 'common.title');
      t.deepEqual(common.artists, ['Beth Hart', 'Joe Bonamassa'], 'common.artist');
    }

    const wv1 = path.join(wavpackSamplePath, 'MusicBrainz - Beth Hart - Sinner\'s Prayer.wv');

    Parsers.forEach(parser => {
      it(parser.description, async () => {
        const metadata = await parser.initParser(wv1, 'audio/x-wavpack');
        checkFormat(metadata.format);
        checkCommon(metadata.common);
      });
    });
  });

  describe('codec: DSD128', () => {

    function checkFormat(format) {
      t.strictEqual(format.container, 'WavPack', 'format.container');
      t.strictEqual(format.codec, 'DSD', 'format.codecProfile');
      t.deepEqual(format.numberOfSamples, 564480, 'format.numberOfSamples');
      t.strictEqual(format.sampleRate, 5644800, 'format.sampleRate');
      t.strictEqual(format.duration, 0.1, 'format.duration');
      t.deepEqual(format.tagTypes, [], 'format.tagTypes');
    }

    const wv1 = path.join(wavpackSamplePath, 'DSD128.wv');

    Parsers.forEach(parser => {
      it(parser.description, async () => {
        const metadata = await parser.initParser(wv1, 'audio/x-wavpack');
        checkFormat(metadata.format);
      });
    });
  });

  describe('codec: DSD128 compressed', () => {

    function checkFormat(format) {
      t.strictEqual(format.container, 'WavPack', 'format.container');
      t.strictEqual(format.codec, 'DSD', 'format.codecProfile');
      t.deepEqual(format.numberOfSamples, 564480, 'format.numberOfSamples');
      t.strictEqual(format.sampleRate, 5644800, 'format.sampleRate');
      t.strictEqual(format.duration, 0.1, 'format.duration');
      t.deepEqual(format.tagTypes, [], 'format.tagTypes');
      t.approximately(format.bitrate, 4810400, 1);
    }

    const wv1 = path.join(wavpackSamplePath, 'DSD128 high compression.wv');

    Parsers.forEach(parser => {
      it(parser.description, async () => {
        const metadata = await parser.initParser(wv1, 'audio/x-wavpack');
        checkFormat(metadata.format);
      });
    });
  });

});
