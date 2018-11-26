import {assert} from 'chai';
import * as mm from '../src';
import * as path from 'path';
import {Parsers} from './metadata-parsers';

const t = assert;

describe("Parse MP3 files", () => {

  const samplePath = path.join(__dirname, 'samples');

  it("should handle audio-frame-header-bug", function() {

    this.timeout(15000); // It takes a long time to parse

    const filePath = path.join(samplePath, 'audio-frame-header-bug.mp3');

    return mm.parseFile(filePath, {duration: true}).then(result => {
      // FooBar: 3:20.556 (8.844.527 samples); 44100 Hz => 200.5561678004535 seconds
      // t.strictEqual(result.format.duration, 200.59591666666665); // previous
      // t.strictEqual(result.format.duration, 200.5561678004535); // FooBar

      // If MPEG Layer II is accepted, it will give back third frame with a different frame length;
      // therefore it start counting actual parsable frames ending up on ~66.86
      t.approximately(result.format.duration, 200.5, 1 / 10);
    });
  });

  it('should be able to parse: Sleep Away.mp3', function() {

    this.timeout(15000); // Parsing this file can take a bit longer

    const filePath = path.join(samplePath, 'mp3', 'Sleep Away.mp3');

    return mm.parseFile(filePath, {duration: true}).then(metadata => {
      const {format, common} = metadata;

      assert.deepEqual(format.container, 'MPEG', 'format.container');
      assert.deepEqual(format.codec, 'MP3', 'format.codec');
      assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
      assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');

      assert.strictEqual(common.title, 'Sleep Away');
      assert.strictEqual(common.artist, 'Bob Acri');
      assert.deepEqual(common.composer, ['Robert R. Acri']);
      assert.deepEqual(common.genre, ['Jazz']);

      assert.strictEqual(common.picture.length, 1, 'should contain the cover');
      const picture = common.picture[0];
      assert.strictEqual(picture.description, 'thumbnail');
      assert.strictEqual(picture.format, 'image/jpeg');
      assert.strictEqual(picture.data.length, 27852);
    });
  });

  describe('should handle incomplete MP3 file', () => {

    const filePath = path.join(samplePath, "incomplete.mp3");

    function checkFormat(format: mm.IFormat) {
      t.deepEqual(format.tagTypes, ['ID3v2.3', 'ID3v1'], 'format.tagTypes');
      t.approximately(format.duration, 61.73, 1 / 100, 'format.duration');
      t.strictEqual(format.container, 'MPEG', 'format.container');
      t.strictEqual(format.codec, 'MP3', 'format.codec');
      t.strictEqual(format.lossless, false, 'format.lossless');
      t.strictEqual(format.sampleRate, 22050, 'format.sampleRate = 44.1 kHz');
      t.strictEqual(format.bitrate, 64000, 'format.bitrate = 128 kbit/sec');
      t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
    }

    it("should decode from a file", () => {

      return mm.parseFile(filePath).then(metadata => {
        for (const tagType in metadata.native) {
          throw new Error("Do not expect any native tag type, got: " + tagType);
        }
        checkFormat(metadata.format);
      });
    });
  });

  describe('Duration flag behaviour', () => {

    describe("MP3/CBR without Xing header", () => {

      const filePath = path.join(samplePath, 'mp3', 'Sleep Away.mp3');

      describe("duration=false", () => {

        Parsers
          .forEach(parser => {
            it(parser.description, () => {
              return parser.initParser(filePath, 'audio/mpeg', {duration: false, native: true}).then(metadata => {
                assert.isUndefined(metadata.format.duration, 'Don\'t expect a duration');
              });
            });
          });
      });

      describe("duration=true", function() {

        this.timeout(15000); // Parsing this file can take a bit longer

        Parsers
          .forEach(parser => {
            it(parser.description, () => {
              return parser.initParser(filePath, 'audio/mpeg', {duration: true, native: true}).then(metadata => {
                assert.approximately(metadata.format.duration, 200.5,  1 / 10, 'Expect a duration');
              });
            });
          });
      });

    });

  });

});
