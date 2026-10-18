import path from 'node:path';
import { assert } from 'chai';
import type { IPicture } from '../lib/index.js';
import * as mm from '../lib/index.js';
import { Parsers } from './metadata-parsers.js';
import { samplePath } from './util.js';

describe("Parse APE (Monkey's Audio)", () => {
  function checkFormat(format: mm.IFormat) {
    assert.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample');
    assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 [kHz]');
    assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
    assert.strictEqual(format.duration, 1.2134240362811792, 'duration [sec]');
    assert.isTrue(format.hasAudio, 'format.hasAudio');
    assert.isFalse(format.hasVideo, 'format.hasAudio');
  }

  function checkCommon(common: mm.ICommonTagsResult) {
    assert.strictEqual(common.title, '07. Shadow On The Sun', 'common.title');
    assert.strictEqual(common.artist, 'Audioslave', 'common.artist');
    assert.deepEqual(common.artists, ['Audioslave', 'Chris Cornell'], 'common.artists');
    // Used to be ['Audioslave'], but 'APEv2/Album Artist'->'albumartist' is not set in actual file!
    assert.deepEqual(common.albumartist, undefined, 'common.albumartist');
    assert.strictEqual(common.album, 'Audioslave', 'common.album');
    assert.strictEqual(common.year, 2002, 'common.year');
    assert.deepEqual(common.genre, ['Alternative'], 'common.genre');
    assert.deepEqual(common.track, { no: 7, of: null }, 'common.track');
    assert.deepEqual(common.disk, { no: 3, of: null }, 'common.disk');
    assert.strictEqual(common.picture![0].format, 'image/jpeg', 'common.picture 0 format');
    assert.strictEqual(common.picture![0].data.length, 48658, 'common.picture 0 length');
    assert.strictEqual(common.picture![1].format, 'image/jpeg', 'common.picture 1 format');
    assert.strictEqual(common.picture![1].data.length, 48658, 'common.picture 1 length');
  }

  function checkNative(ape: mm.INativeTagDict) {
    assert.deepEqual(ape.ENSEMBLE, ['Audioslave']);
    assert.deepEqual(ape.Artist, ['Audioslave', 'Chris Cornell']);
    assert.strictEqual((ape['Cover Art (Front)'][0] as IPicture).data.length, 48658, 'raw cover art (front) length');
    assert.strictEqual((ape['Cover Art (Back)'][0] as IPicture).data.length, 48658, 'raw cover art (front) length');
  }

  Parsers.forEach(parser => {
    it(parser.description, async function () {
      const { format, common, native } = await parser.parse(
        () => this.skip(),
        path.join(samplePath, 'monkeysaudio.ape'),
        'audio/ape'
      );
      checkFormat(format);
      checkCommon(common);
      assert.isDefined(native, 'metadata.native should be defined');
      assert.isDefined(native.APEv2, 'metadata.native.APEv2 should be defined');
      checkNative(mm.orderTags(native.APEv2));
    });
  });
});
