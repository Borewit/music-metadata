import { assert } from 'chai';

import path from 'node:path';

import * as mm from '../lib/index.js';
import { Parsers } from './metadata-parsers.js';
import { samplePath } from './util.js';

describe('Parsing MPEG / ID3v1', () => {

  const fileBloodSugar = path.join(samplePath, 'id3v1_Blood_Sugar.mp3');

  describe('should be able to read an ID3v1 tag', () => {

    function checkFormat(format: mm.IFormat) {
      assert.deepEqual(format.tagTypes, ['ID3v1'], 'format.tagTypes');
      assert.strictEqual(format.container, 'MPEG', 'format.container');
      assert.strictEqual(format.codec, 'MPEG 1 Layer 3', 'format.codec');
      assert.strictEqual(format.lossless, false, 'format.lossless');
      assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
      assert.strictEqual(format.bitrate, 160000, 'format.bitrate = 160 kbit/sec');
      assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
      assert.strictEqual(format.duration, 241920 / format.sampleRate, 'format.duration');
    }

    function checkCommon(common: mm.ICommonTagsResult) {
      assert.strictEqual(common.title, 'Blood Sugar', 'common.title');
      assert.strictEqual(common.artist, 'Pendulum', 'common.artist');
      assert.strictEqual(common.album, 'Blood Sugar (Single)', 'common.album');
      assert.isUndefined(common.albumartist, 'common.albumartist');
      assert.strictEqual(common.year, 2007, 'common.year');
      assert.strictEqual(common.track.no, 1, 'common.track.no = 1 (ID3v1 tag)');
      assert.strictEqual(common.track.of, null, 'common.track.of = null');
      assert.deepEqual(common.genre, ['Electronic'], 'common.genre');
      assert.deepEqual(common.comment, [{text: 'abcdefg'}], 'common.comment');
    }

    /**
     * 241920 samples
     */
    Parsers.forEach(parser => {
      it(parser.description, async function(){
        const { format, common } = await parser.parse(() => this.skip(), fileBloodSugar, 'audio/mpeg');
        checkFormat(format);
        checkCommon(common);
      });
    });
  });

  describe('it should skip id3v1 header if options.skipPostHeaders is set', () => {

    const filePath = path.join(samplePath, '07 - I\'m Cool.mp3');
    Parsers.forEach(parser => {
      it(parser.description, async function(){
        const { format } = await parser.parse(() => this.skip(), filePath, 'audio/mpeg', {skipPostHeaders: true});
        assert.deepEqual(format.tagTypes, ['ID3v2.3'], 'format.tagTypes');
      });
    });
  });

  describe('should handle MP3 without any tags', () => {

    const filePath = path.join(samplePath, 'silence-2s-16000 [no-tags].CBR-128.mp3');

    function checkFormat(format: mm.IFormat) {
      assert.deepEqual(format.tagTypes, [], 'format.tagTypes');
      assert.strictEqual(format.duration, 2.088, 'format.duration');
      assert.strictEqual(format.container, 'MPEG', 'format.container');
      assert.strictEqual(format.codec, 'MPEG 2 Layer 3', 'format.codec');
      assert.strictEqual(format.lossless, false, 'format.lossless');
      assert.strictEqual(format.sampleRate, 16000, 'format.sampleRate = 44.1 kHz');
      assert.strictEqual(format.bitrate, 128000, 'format.bitrate = 128 kbit/sec');
      assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
    }

    Parsers.forEach(parser => {
      it(parser.description, async function(){
        const { format } = await parser.parse(() => this.skip(), filePath, 'audio/mpeg');
        checkFormat(format);
      });
    });
  });

  describe('should decode ID3v1.0 with undefined tags', () => {

    /**
     * Kept 25 frames from original MP3; concatenated copied last 128 bytes to restore ID3v1.0 header
     */
    const filePath = path.join(samplePath, 'Luomo - Tessio (Spektre Remix) ID3v10.mp3');

    function checkFormat(format: mm.IFormat) {
      assert.strictEqual(format.duration, 33.38448979591837, 'format.duration (checked with foobar)');
      assert.deepEqual(format.tagTypes, ['ID3v1'], 'format.tagTypes');
      assert.deepEqual(format.container, 'MPEG', 'format.container');
      assert.deepEqual(format.codec, 'MPEG 1 Layer 3', 'format.codec');
      assert.strictEqual(format.lossless, false, 'format.lossless');
      assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
      // t.strictEqual(format.bitrate, 128000, 'format.bitrate = 128 bit/sec');
      assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
    }

    function checkCommon(common: mm.ICommonTagsResult) {
      assert.strictEqual(common.title, 'Luomo - Tessio (Spektre Remix)', 'common.title');
      assert.isUndefined(common.artist, 'common.artist');
      assert.isUndefined(common.album, 'common.album');
      assert.strictEqual(common.albumartist, undefined, 'common.albumartist');
      assert.isUndefined(common.year, 'common.year');
      assert.strictEqual(common.track.no, null, 'common.track.no = null');
      assert.strictEqual(common.track.of, null, 'common.track.of = null');
      assert.isUndefined(common.genre, 'common.genre');
      assert.isUndefined(common.comment, 'common.comment');
    }

    Parsers.forEach(parser => {
      it(parser.description, async function(){
        const { format, common } = await parser.parse(() => this.skip(), filePath, 'audio/mpeg');
        checkFormat(format);
        checkCommon(common);
      });
    });

  });

  /**
   * Related issue: https://github.com/Borewit/music-metadata/issues/69
   */
  it('should respect null terminated tag values correctly', () => {

    const filePath = path.join(samplePath, 'issue_69.mp3');

    Parsers.forEach(parser => {
      it(parser.description, async function(){
        const { native } = await parser.parse(() => this.skip(), filePath, 'audio/mpeg', {duration: true});
        const id3v1 = mm.orderTags(native.ID3v1);
        assert.deepEqual(id3v1.title, ['Skupinove foto'], 'id3v1.title');
        assert.deepEqual(id3v1.artist, ['Pavel Dobes'], 'id3v1.artist');
        assert.deepEqual(id3v1.album, ['Skupinove foto'], 'id3v1.album');
        assert.deepEqual(id3v1.year, ['1988'], 'id3v1.year');
      });
    });

  });

});
