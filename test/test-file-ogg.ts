import {assert, expect} from 'chai';
import * as mm from '../src';
import * as path from 'path';
import {IdHeader} from "../src/ogg/opus/Opus";
import {Parsers} from './metadata-parsers';

describe("Parse Ogg", function() {

  const samplePath = path.join(__dirname, 'samples');

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
    assert.strictEqual(common.picture[0].format, 'image/jpeg', 'picture format');
    assert.strictEqual(common.picture[0].data.length, 30966, 'picture length');
    assert.strictEqual(common.barcode, '0720642442524', 'common.barcode (including leading zero)');
    assert.strictEqual(common.asin, 'B000003TA4', 'common.asin');
    assert.deepEqual(common.catalognumber, ['GED24425'], 'common.asin');
    assert.deepEqual(common.isrc, ['USGF19942502'], 'common.isrc');
  }

  function check_Nirvana_In_Bloom_VorbisTags(vorbis) {

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

      const filePath = path.join(samplePath, "Nirvana - In Bloom - 2-sec.ogg");

      function checkFormat(format) {
        assert.deepEqual(format.tagTypes, ['vorbis'], 'format.tagTypes');
        assert.strictEqual(format.duration, 2.0, 'format.duration = 2.0 sec');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels = 2 (stereo)');
        assert.strictEqual(format.bitrate, 64000, 'bitrate = 64 kbit/sec');
      }

      Parsers.forEach(parser => {
        it(parser.description, () => {
          return parser.initParser(filePath, 'audio/ogg', {native: true}).then(metadata => {
            checkFormat(metadata.format);
            check_Nirvana_In_Bloom_VorbisTags(mm.orderTags(metadata.native.vorbis));
            check_Nirvana_In_Bloom_commonTags(metadata.common);
          });
        });
      });

    });

    it("should handle page not finalized with the lastPage flag", () => {

      const filePath = path.join(samplePath, "issue_62.ogg");

      return mm.parseFile(filePath, {native: true}).then(metadata => {

        assert.deepEqual(metadata.format.tagTypes, ['vorbis'], 'format.tagTypes');
        // ToDo? assert.strictEqual(metadata.format.duration, 2.0, 'format.duration = 2.0 sec');
        assert.strictEqual(metadata.format.sampleRate, 22050, 'format.sampleRate = 44.1 kHz');
        assert.strictEqual(metadata.format.numberOfChannels, 2, 'format.numberOfChannels = 2 (stereo)');
        assert.strictEqual(metadata.format.bitrate, 56000, 'bitrate = 64 kbit/sec');

        // Following is part a page which is not correctly finalized with lastPage flag
        assert.isDefined(metadata.common.title, "should provide: metadata.common.title");
        assert.equal(metadata.common.title, "Al-Fatihah", "metadata.common.title");
        assert.equal(metadata.common.artist, "Mishary Alafasi - www.TvQuran.com", "metadata.common.artist");
      });
    });

    /**
     * Related issue: https://github.com/Borewit/music-metadata/issues/70
     */
    it("should not fail on an Ogg/Vorbis 'Setup header'", () => {

      const filePath = path.join(samplePath, 'issue_70.ogg');

      return mm.parseFile(filePath, {duration: true, native: true}).then(metadata => {
        assert.strictEqual(metadata.format.container, 'Ogg/Vorbis I');
        assert.strictEqual(metadata.format.sampleRate, 44100);

        const vorbis = mm.orderTags(metadata.native.vorbis);
        assert.deepEqual(vorbis.ALBUM, ['Dropsonde']);
        assert.deepEqual(vorbis.ARTIST, ['Biosphere']);
        assert.deepEqual(vorbis['ALBUM ARTIST'], ['Biosphere']);
        assert.deepEqual(vorbis.ORGANIZATION, ['Touch UK']);
        assert.deepEqual(vorbis.DATE, ['2006']);
        assert.deepEqual(vorbis.RATING, ['-1']);
        assert.deepEqual(vorbis.REPLAYGAIN_TRACK_PEAK, ['0.999969']);
        assert.deepEqual(vorbis.REPLAYGAIN_TRACK_GAIN, ['0.440000 dB']);
        assert.deepEqual(vorbis.REPLAYGAIN_ALBUM_GAIN, ['0.440000 dB']);
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

      const filePath = path.join(samplePath, "Nirvana - In Bloom - 2-sec.opus");

      function checkFormat(format) {
        assert.deepEqual(format.tagTypes, ['vorbis'], 'format.tagTypes');
        assert.strictEqual(format.numberOfSamples, 96000, 'format.numberOfSamples = 96000');
        // ToDo: assert.strictEqual(format.duration, 2.0, 'format.duration = 2.0 sec');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels = 2 (stereo)');
        // ToDo: assert.strictEqual(format.bitrate, 64000, 'bitrate = 64 kbit/sec');
      }

      Parsers.forEach(parser => {
        it(parser.description, () => {
          return parser.initParser(filePath, 'audio/ogg', {native: true}).then(metadata => {
            checkFormat(metadata.format);
            check_Nirvana_In_Bloom_VorbisTags(mm.orderTags(metadata.native.vorbis));
            check_Nirvana_In_Bloom_commonTags(metadata.common);
          });
        });
      });

    });
  });

  describe("Parsing Ogg/Speex", () => {

    describe("decode: 'female_scrub.spx'", () => {

      const filePath = path.join(samplePath, 'female_scrub.spx');

      function checkFormat(format) {
        assert.strictEqual(format.container, 'Ogg/Speex', 'format.container');
        assert.strictEqual(format.codec, '1.0beta1');
        assert.strictEqual(format.sampleRate, 8000, 'format.sampleRate = 8 kHz');
      }

      Parsers.forEach(parser => {
        it(parser.description, () => {
          return parser.initParser(filePath, 'audio/ogg', {native: true}).then(metadata => {
            checkFormat(metadata.format);
          });
        });
      });

    });

    it("check for ogg-multipage-metadata-bug", () => {

      const filePath = path.join(samplePath, 'ogg-multipagemetadata-bug.ogg');

      return mm.parseFile(filePath).then(result => {
        assert.strictEqual(result.common.title, 'Modestep - To The Stars (Break the Noize & The Autobots Remix)', 'title');
        assert.strictEqual(result.common.artist, 'Break The Noize & The Autobots', 'artist');
        assert.strictEqual(result.common.albumartist, 'Modestep', 'albumartist');
        assert.strictEqual(result.common.album, 'To The Stars', 'album');
        assert.strictEqual(result.common.date, '2011-01-01', 'year');
        assert.strictEqual(result.common.track.no, 2, 'track no');
        assert.strictEqual(result.common.track.of, 5, 'track of');
        assert.strictEqual(result.common.disk.no, 1, 'disk no');
        assert.strictEqual(result.common.disk.of, 1, 'disk of');
        assert.strictEqual(result.common.genre[0], 'Dubstep', 'genre');
        assert.strictEqual(result.common.picture[0].format, 'image/jpeg', 'picture format');
        assert.strictEqual(result.common.picture[0].data.length, 207439, 'picture length');
      });

    });

  });

});
