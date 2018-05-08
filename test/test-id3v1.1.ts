import {assert} from 'chai';
import * as mm from '../src';

import * as path from 'path';
import * as fs from 'fs-extra';

const t = assert;

describe("Parsing MPEG / ID3v1", () => {

  describe("should be able to read an ID3v1.1 tag", () => {

    function checkFormat(format: mm.IFormat) {
      t.deepEqual(format.tagTypes, ['ID3v1.1'], 'format.tagTypes');
      t.strictEqual(format.dataformat, 'mp3', 'format.dataformat');
      t.strictEqual(format.lossless, false, 'format.lossless');
      t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
      t.strictEqual(format.bitrate, 160000, 'format.bitrate = 160 kbit/sec');
      t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
      t.strictEqual(format.duration, 241920 / format.sampleRate, 'format.duration');
    }

    function checkCommon(common: mm.ICommonTagsResult) {
      t.strictEqual(common.title, 'Blood Sugar', 'common.title');
      t.strictEqual(common.artist, 'Pendulum', 'common.artist');
      t.strictEqual(common.album, 'Blood Sugar (Single)', 'common.album');
      t.isUndefined(common.albumartist, 'common.albumartist');
      t.strictEqual(common.year, 2007, 'common.year');
      t.strictEqual(common.track.no, 1, 'common.track.no = 1 (ID3v1.1 tag)');
      t.strictEqual(common.track.of, null, 'common.track.of = null');
      t.deepEqual(common.genre, ['Electronic'], 'common.genre');
      t.deepEqual(common.comment, ['abcdefg'], 'common.comment');
    }

    /**
     * 241920 samples
     */
    const filePath = path.join(__dirname, 'samples', 'id3v1_Blood_Sugar.mp3');

    it("should decode from a file", () => {

      return mm.parseFile(filePath).then(metadata => {
        checkFormat(metadata.format);
        checkCommon(metadata.common);
      });
    });

    it("should decode from a stream", () => {

      const stream = fs.createReadStream(filePath);

      return mm.parseStream(stream, 'audio/mpeg', {native: true}).then(metadata => {
        for (const tagType in metadata.native)
          throw new Error("Do not expect any native tag type, got: " + tagType);
      }).then(() => stream.close());

    });

  });

  describe("should handle MP3 without any tags", () => {

    const filePath = path.join(__dirname, 'samples', "silence-2s-16000 [no-tags].CBR-128.mp3");

    function checkFormat(format: mm.IFormat) {
      t.deepEqual(format.tagTypes, [], 'format.tagTypes');
      t.strictEqual(format.duration, 2.088, 'format.duration');
      t.strictEqual(format.dataformat, 'mp3', 'format.dataformat');
      t.strictEqual(format.lossless, false, 'format.lossless');
      t.strictEqual(format.sampleRate, 16000, 'format.sampleRate = 44.1 kHz');
      t.strictEqual(format.bitrate, 128000, 'format.bitrate = 128 kbit/sec');
      t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
    }

    it("should decode from a file", () => {

      return mm.parseFile(filePath).then(metadata => {
        for (const tagType in metadata.native)
          throw new Error("Do not expect any native tag type, got: " + tagType);
        checkFormat(metadata.format);
      });
    });

    it("should decode from a stream", () => {

      const stream = fs.createReadStream(filePath);

      return mm.parseStream(stream, 'audio/mpeg', {native: true}).then(metadata => {
        for (const tagType in metadata.native)
          throw new Error("Do not expect any native tag type, got: " + tagType);
        checkFormat(metadata.format);
      }).then(() => stream.close());

    });

  });

  it("should decode ID3v1.0 with undefined tags", () => {

    /**
     * Kept 25 frames from original MP3; concatenated copied last 128 bytes to restore ID3v1.0 header
     */
    const filePath = path.join(__dirname, 'samples', 'Luomo - Tessio (Spektre Remix) ID3v10.mp3');

    function checkFormat(format: mm.IFormat) {
      t.strictEqual(format.duration, 33.38448979591837, 'format.duration (checked with foobar)');
      t.deepEqual(format.tagTypes, ['ID3v1.1'], 'format.tagTypes');
      t.strictEqual(format.dataformat, 'mp3', 'format.dataformat');
      t.strictEqual(format.lossless, false, 'format.lossless');
      t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
      t.strictEqual(format.bitrate, 128000, 'format.bitrate = 128 bit/sec');
      t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
    }

    function checkCommon(common: mm.ICommonTagsResult) {
      t.strictEqual(common.title, 'Luomo - Tessio (Spektre Remix)', 'common.title');
      t.isUndefined(common.artist, 'common.artist');
      t.isUndefined(common.album, 'common.album');
      t.strictEqual(common.albumartist, undefined, 'common.albumartist');
      t.isUndefined(common.year, 'common.year');
      t.strictEqual(common.track.no, null, 'common.track.no = null');
      t.strictEqual(common.track.of, null, 'common.track.of = null');
      t.isUndefined(common.genre, 'common.genre');
      t.isUndefined(common.comment, 'common.comment');
    }

    return mm.parseFile(filePath).then(metadata => {
      t.isDefined(metadata, "should provide metadata");
      checkFormat(metadata.format);
      checkCommon(metadata.common);
    });
  });

  /**
   * Related issue: https://github.com/Borewit/music-metadata/issues/69
   */
  it("should respect null terminated tag values correctly", () => {

    const filePath = path.join(__dirname, 'samples', 'issue_69.mp3');

    return mm.parseFile(filePath, {duration: true, native: true}).then(metadata => {

      const id3v1 = mm.orderTags(metadata.native['ID3v1.1']);
      assert.deepEqual(id3v1.title, ['Skupinove foto'], 'id3v1.title');
      assert.deepEqual(id3v1.artist, ['Pavel Dobes'], 'id3v1.artist');
      assert.deepEqual(id3v1.album, ['Skupinove foto'], 'id3v1.album');
      assert.deepEqual(id3v1.year, ['1988'], 'id3v1.year');
    });
  });

});
