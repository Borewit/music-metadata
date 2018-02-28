import {} from "mocha";
import {assert, expect} from 'chai';
import * as mm from '../src';
import * as path from 'path';
import * as fs from 'fs-extra';
import {IdHeader} from "../src/opus/Opus";
import {OggParser} from "../src/ogg/OggParser";

describe("Parsing Ogg", function() {

  this.timeout(15000); // It takes a log time to parse, due to sync errors and assumption it is VBR (which is caused by the funny 224 kbps frame)

  function check_Nirvana_In_Bloom_commonTags(common) {
    assert.strictEqual(common.title, 'In Bloom', 'common.title');
    assert.strictEqual(common.artist, 'Nirvana', 'common.artist');
    assert.strictEqual(common.albumartist, 'Nirvana', 'common.albumartist');
    assert.strictEqual(common.album, 'Nevermind', 'common.album');
    assert.strictEqual(common.year, 1991, 'common.year');
    assert.deepEqual(common.track, {no: 2, of: 12}, 'common.track');
    assert.deepEqual(common.disk, {no: 1, of: 1}, 'common.disk');
    assert.deepEqual(common.genre, ['Grunge', 'Alternative'], 'genre');
    assert.strictEqual(common.picture[0].format, 'jpg', 'picture format');
    assert.strictEqual(common.picture[0].data.length, 30966, 'picture length');
    assert.strictEqual(common.barcode, '0720642442524', 'common.barcode (including leading zero)');
  }

  function  check_Nirvana_In_Bloom_VorbisTags(vorbis) {

    assert.deepEqual(vorbis.TRACKNUMBER, ['2'], 'vorbis.TRACKNUMBER');
    assert.deepEqual(vorbis.TRACKTOTAL, ['12'], 'vorbis.TRACKTOTAL');
    assert.deepEqual(vorbis.ALBUM, ['Nevermind'], 'vorbis.ALBUM');
    assert.deepEqual(vorbis.COMMENT, ["Nirvana's Greatest Album"], 'vorbis.COMMENT');
    assert.deepEqual(vorbis.GENRE, ['Grunge', 'Alternative'], 'vorbis.GENRE');
    assert.deepEqual(vorbis.TITLE, ['In Bloom'], 'vorbis.TITLE');

    const cover = vorbis.METADATA_BLOCK_PICTURE[0];

    assert.strictEqual(cover.format, 'image/jpeg', 'vorbis.METADATA_BLOCK_PICTURE format');
    assert.strictEqual(cover.type, 'Cover (front)', 'vorbis.METADATA_BLOCK_PICTURE tagTypes');
    // test exact contents too
    assert.strictEqual(cover.data.length, 30966, 'vorbis.METADATA_BLOCK_PICTURE length');
    assert.strictEqual(cover.data[0], 255, 'vorbis.METADATA_BLOCK_PICTURE data 0');
    assert.strictEqual(cover.data[1], 216, 'vorbis.METADATA_BLOCK_PICTURE data 1');
    assert.strictEqual(cover.data[cover.data.length - 1], 217, 'vorbis.METADATA_BLOCK_PICTURE data -1');
    assert.strictEqual(cover.data[cover.data.length - 2], 255, 'vorbis.METADATA_BLOCK_PICTURE data -2');
  }

  describe("Parsing Ogg/Vorbis", () => {

    describe("decode: Nirvana - In Bloom - 2-sec.ogg", () => {

      const filePath = path.join(__dirname, 'samples', "Nirvana - In Bloom - 2-sec.ogg");

      function checkFormat(format) {
        assert.deepEqual(format.tagTypes, ['vorbis'], 'format.tagTypes');
        assert.strictEqual(format.duration, 2.0, 'format.duration = 2.0 sec');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels = 2 (stereo)');
        assert.strictEqual(format.bitrate, 64000, 'bitrate = 64 kbit/sec');
      }

      it("as a file", () => {

        return mm.parseFile(filePath, {native: true}).then(metadata => {
          checkFormat(metadata.format);
          check_Nirvana_In_Bloom_VorbisTags(mm.orderTags(metadata.native.vorbis));
          check_Nirvana_In_Bloom_commonTags(metadata.common);
        });

      });

      it("as a stream", () => {

        const stream = fs.createReadStream(filePath);

        return mm.parseStream(stream, 'audio/ogg', {native: true}).then(metadata => {
          checkFormat(metadata.format);
          check_Nirvana_In_Bloom_VorbisTags(mm.orderTags(metadata.native.vorbis));
          check_Nirvana_In_Bloom_commonTags(metadata.common);
        }).then(() => stream.close());
      });
    });
  });

  describe("Parsing Ogg/Opus", () => {

    describe("components", () => {

      it("IdHeader should throw error if data is shorter than header", () => {
        try {
          const idHeader = new IdHeader(18);
        } catch (err) {
          expect(err.message).to.equal('ID-header-page 0 should be at least 19 bytes long');
        }
      });
    });

    describe("decode: Nirvana - In Bloom - 2-sec.opus", () => {

      const filePath = path.join(__dirname, 'samples', "Nirvana - In Bloom - 2-sec.opus");

      function checkFormat(format) {
        assert.deepEqual(format.tagTypes, ['vorbis'], 'format.tagTypes');
        assert.strictEqual(format.numberOfSamples, 96000, 'format.numberOfSamples = 96000');
        // ToDo: assert.strictEqual(format.duration, 2.0, 'format.duration = 2.0 sec');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels = 2 (stereo)');
        // ToDo: assert.strictEqual(format.bitrate, 64000, 'bitrate = 64 kbit/sec');
      }

      it("as a file", () => {

        return mm.parseFile(filePath, {native: true}).then(metadata => {
          checkFormat(metadata.format);
          check_Nirvana_In_Bloom_VorbisTags(mm.orderTags(metadata.native.vorbis));
          check_Nirvana_In_Bloom_commonTags(metadata.common);
        });

      });

      it("as a stream", () => {

        const stream = fs.createReadStream(filePath);

        return mm.parseStream(stream, 'audio/ogg', {native: true}).then(metadata => {
          checkFormat(metadata.format);
          check_Nirvana_In_Bloom_VorbisTags(mm.orderTags(metadata.native.vorbis));
          check_Nirvana_In_Bloom_commonTags(metadata.common);
        }).then(() => stream.close());
      });
    });
  });

});
