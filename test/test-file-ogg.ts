import { assert, expect } from 'chai';
import path from 'node:path';

import { Parsers } from './metadata-parsers.js';
import * as mm from '../lib/index.js';
import { samplePath } from './util.js';
import { IdHeader } from '../lib/ogg/opus/Opus.js';

const oggSamplePath = path.join(samplePath, 'ogg');

describe('Parse Ogg', () => {

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
    assert.deepEqual(vorbis.COMMENT, ['Nirvana\'s Greatest Album'], 'vorbis.COMMENT');
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

  describe('Different Ogg formats', () => {

    it('should handle Ogg/Vorbis', async () => {
      const filePath = path.join(oggSamplePath, 'audio.vorbis.ogg');
      const {format} = await mm.parseFile(filePath);
      assert.deepEqual(format.codec, 'Vorbis I', 'format.codec');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasAudio');
    });

    it('should handle Ogg/Speex', async () => {
      const filePath = path.join(oggSamplePath, 'audio.speex.ogg');
      const {format} = await mm.parseFile(filePath);
      assert.deepEqual(format.codec, 'Speex 1.2.0', 'format.codec');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasAudio');
    });

    it('should handle Ogg/Opus', async () => {
      const filePath = path.join(oggSamplePath, 'audio.opus.ogg');
      const {format} = await mm.parseFile(filePath);
      assert.deepEqual(format.codec, 'Opus', 'format.codec');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasAudio');
    });

    it('should handle Ogg/FLAC', async () => {
      const filePath = path.join(oggSamplePath, 'audio.flac.ogg');
      const {format} = await mm.parseFile(filePath);
      assert.deepEqual(format.codec, 'FLAC', 'format.codec');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasAudio');
    });

    it('should handle Ogg/Theora', async () => {
      const filePath = path.join(oggSamplePath, 'short.ogv');
      const {format} = await mm.parseFile(filePath);
      assert.deepEqual(format.codec, 'Vorbis I', 'format.codec');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isTrue(format.hasVideo, 'format.hasVideo');
    });
  });

  describe('Parsing Ogg/Vorbis', () => {

    describe('decode: nirvana-2sec.vorbis.ogg', () => {

      const filePath = path.join(oggSamplePath, 'nirvana-2sec.vorbis.ogg');

      function checkFormat(format) {
        assert.deepEqual(format.tagTypes, ['vorbis'], 'format.tagTypes');
        assert.strictEqual(format.duration, 2.0, 'format.duration [seconds]');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate [hz]');
        assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels = 2 (stereo)');
        assert.strictEqual(format.bitrate, 64000, 'format.bitrate [bit/sec]');
        assert.isTrue(format.hasAudio, 'format.hasAudio');
        assert.isFalse(format.hasVideo, 'format.hasAudio');
      }

      Parsers.forEach(parser => {
        it(parser.description, async function(){
          const { format, native, common } = await parser.parse(() => this.skip(), filePath, 'audio/ogg');
          checkFormat(format);
          check_Nirvana_In_Bloom_VorbisTags(mm.orderTags(native.vorbis));
          check_Nirvana_In_Bloom_commonTags(common);
        });
      });
    });

    it('should handle page not finalized with the lastPage flag', async () => {

      const filePath = path.join(oggSamplePath, 'issue_62.ogg');

      const {format, common, quality} = await mm.parseFile(filePath);

      assert.deepEqual(format.tagTypes, ['vorbis'], 'format.tagTypes');
      // assert.strictEqual(format.duration, 2.0, 'format.duration = 2.0 sec');
      assert.strictEqual(format.sampleRate, 22050, 'format.sampleRate = 44.1 kHz');
      assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels = 2 (stereo)');
      assert.strictEqual(format.bitrate, 56000, 'bitrate = 64 kbit/sec');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasAudio');

      // Following is part a page which is not correctly finalized with lastPage flag
      assert.isDefined(common.title, 'should provide: metadata.common.title');
      assert.equal(common.title, 'Al-Fatihah', 'metadata.common.title');
      assert.equal(common.artist, 'Mishary Alafasi - www.TvQuran.com', 'metadata.common.artist');

      assert.includeDeepMembers(quality.warnings, [
        {message: 'Corrupt Ogg content at 333'},
        {message: 'End-of-stream reached before reaching last page in Ogg stream serial=0'}
      ]);
    });

    /**
     * Related issue: https://github.com/Borewit/music-metadata/issues/70
     */
    it('should not fail on an Ogg/Vorbis \'Setup header\'', async () => {

      const filePath = path.join(oggSamplePath, 'issue_70.ogg');

      const {format, native} = await mm.parseFile(filePath);
      assert.strictEqual(format.container, 'Ogg', 'format.container');
      assert.strictEqual(format.codec, 'Vorbis I', 'format.codec');
      assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasAudio');

      const vorbis = mm.orderTags(native.vorbis);
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

    it('check for ogg-multipage-metadata-bug', async () => {

      const filePath = path.join(oggSamplePath, 'ogg-multipagemetadata-bug.ogg');

      const {format, common} = await mm.parseFile(filePath)

      assert.strictEqual(format.container, 'Ogg', 'format.container');
      assert.strictEqual(format.codec, 'Vorbis I', 'format.codec');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasAudio');

      assert.strictEqual(common.title, 'Modestep - To The Stars (Break the Noize & The Autobots Remix)', 'title');
      assert.strictEqual(common.artist, 'Break The Noize & The Autobots', 'artist');
      assert.strictEqual(common.albumartist, 'Modestep', 'albumartist');
      assert.strictEqual(common.album, 'To The Stars', 'album');
      assert.strictEqual(common.date, '2011-01-01', 'year');
      assert.strictEqual(common.track.no, 2, 'track no');
      assert.strictEqual(common.track.of, 5, 'track of');
      assert.strictEqual(common.disk.no, 1, 'disk no');
      assert.strictEqual(common.disk.of, 1, 'disk of');
      assert.strictEqual(common.genre[0], 'Dubstep', 'genre');
      assert.strictEqual(common.picture[0].format, 'image/jpeg', 'picture format');
      assert.strictEqual(common.picture[0].data.length, 207439, 'picture length');

    });

  });

  describe('Parsing Ogg/Opus', () => {

    describe('components', () => {

      it('IdHeader should throw error if data is shorter than header', () => {
        try {
          const _idHeader = new IdHeader(18);
        } catch (err) {
          expect(err.message).to.equal('ID-header-page 0 should be at least 19 bytes long');
        }
      });
    });

    describe('decode: nirvana-2sec.opus.ogg', () => {

      const filePath = path.join(oggSamplePath, 'nirvana-2sec.opus.ogg');

      function checkFormat(format) {
        assert.deepEqual(format.tagTypes, ['vorbis'], 'format.tagTypes');
        assert.strictEqual(format.numberOfSamples, 96000, 'format.numberOfSamples = 96000');
        assert.approximately(format.duration, 2.0, 1 / 200, 'format.duration = 2.0 sec');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels = 2 (stereo)');
        assert.isTrue(format.hasAudio, 'format.hasAudio');
        assert.isFalse(format.hasVideo, 'format.hasAudio');
        // assert.strictEqual(format.bitrate, 64000, 'bitrate = 64 kbit/sec');
      }

      Parsers.forEach(parser => {
        it(parser.description, async function(){
          const { format, native, common } = await parser.parse(() => this.skip(), filePath, 'audio/ogg');
          checkFormat(format);
          check_Nirvana_In_Bloom_VorbisTags(mm.orderTags(native.vorbis));
          check_Nirvana_In_Bloom_commonTags(common);
        });
      });

    });
  });

  describe('Parsing Ogg/Speex', () => {

    describe('decode: \'female_scrub.spx\'', () => {

      const filePath = path.join(samplePath, 'female_scrub.spx');

      function checkFormat(format) {
        assert.strictEqual(format.container, 'Ogg', 'format.container');
        assert.strictEqual(format.codec, 'Speex 1.0beta1');
        assert.strictEqual(format.sampleRate, 8000, 'format.sampleRate = 8 kHz');
        assert.isTrue(format.hasAudio, 'format.hasAudio');
        assert.isFalse(format.hasVideo, 'format.hasAudio');
      }

      Parsers.forEach(parser => {
        it(parser.description, async function(){
          const { format } = await parser.parse(() => this.skip(), filePath, 'audio/ogg');
          checkFormat(format);
        });
      });

    });

  });

  describe('Parsing Ogg/Theora', () => {

    it('Parse short.ogv', async () => {

      const filePath = path.join(oggSamplePath, 'short.ogv');

      const {format} = await mm.parseFile(filePath, {duration: true});

      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isTrue(format.hasVideo, 'format.hasAudio');
      assert.approximately(format.duration, 5.758548752834467, 1/1000000, 'format.duration');
    });

  });

  describe('Parsing Ogg/Flac', () => {

    it('Parse audio.flac.ogg', async () => {

      const filePath = path.join(oggSamplePath, 'audio.flac.ogg');
      const {format} = await mm.parseFile(filePath);

      assert.strictEqual(format.container, 'Ogg', 'format.container');
      assert.strictEqual(format.codec, 'FLAC', 'format.codec');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasAudio');
      assert.isTrue(format.lossless, 'format.lossless');
      assert.strictEqual(format.sampleRate, 44100, 'format.bitrate');
      assert.strictEqual(format.duration, undefined, 'format.duration');
    });
  });

  it('RATING mapping', async () => {

    const filePath = path.join(samplePath, 'rating', 'testcase.opus');
    const {common} = await mm.parseFile(filePath);

    assert.isDefined(common.rating, 'Expect rating property to be present');
    assert.equal(common.rating[0].rating, 0.80, 'Vorbis tag rating score of 80%');
    assert.equal(mm.ratingToStars(common.rating[0].rating), 4, 'Vorbis tag rating conversion');
  });

  describe('Calculate duration', () => {

    it('with proper last page header', async() => {

      const filePath = path.join(oggSamplePath, 'last-page.oga');

      const {format} = await mm.parseFile(filePath);

      assert.strictEqual(format.container, 'Ogg', 'format.container');
      assert.strictEqual(format.codec, 'Opus', 'format.codec');
      assert.strictEqual(format.sampleRate, 48000, 'format.sampleRate');
      assert.strictEqual(format.numberOfSamples, 253440, 'format.numberOfSamples');
      assert.approximately(format.duration, 5.28, 1 / 200, 'format.duration');
    });

    it('with no last page', async() => {

      const filePath = path.join(oggSamplePath, 'no-last-page.oga');

      const {format, quality} = await mm.parseFile(filePath);

      assert.strictEqual(format.container, 'Ogg', 'format.container');
      assert.strictEqual(format.codec, 'Opus', 'format.codec');
      assert.strictEqual(format.sampleRate, 16000, 'format.sampleRate');
      assert.strictEqual(format.numberOfSamples, 270720, 'format.numberOfSamples');
      assert.approximately(format.duration, 5.64, 1 / 200, 'format.duration');

      assert.includeDeepMembers(quality.warnings, [{message: 'End-of-stream reached before reaching last page in Ogg stream serial=0'}]);
    });

  });

});
