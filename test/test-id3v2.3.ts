import { assert } from 'chai';
import path from 'node:path';
import * as strtok from 'strtok3';

import { ID3v2Parser } from '../lib/id3v2/ID3v2Parser.js';
import { MetadataCollector } from '../lib/common/MetadataCollector.js';
import * as mm from '../lib/index.js';
import { samplePath } from './util.js';
import { LyricsContentType, TimestampFormat, type ILyricsTag } from '../lib/core.js';
import type { IPicture } from '../lib/index.js';
import type { IGeneralEncapsulatedObject } from '../lib/id3v2/FrameParser.js';

describe('Extract metadata from ID3v2.3 header', () => {

  it('should parse a raw ID3v2.3 header', () => {

    const filePath = path.join(samplePath, 'MusicBrainz - Beth Hart - Sinner\'s Prayer.id3v23');

    const metadata = new MetadataCollector({});

    return strtok.fromFile(filePath).then(tokenizer => {
      return new ID3v2Parser().parse(metadata, tokenizer, {}).then(() => {

        assert.strictEqual(33, metadata.native['ID3v2.3'].length);

        const id3v23 = mm.orderTags(metadata.native['ID3v2.3']);
        assert.isDefined(id3v23.UFID, 'check if ID3v2.3-UFID is set');
      });
    });
  });

  it('parse a ID3v2.3', async () => {

    const filePath = path.join(samplePath, 'id3v2.3.mp3');

    function checkFormat(format) {
      assert.deepEqual(format.tagTypes, ['ID3v2.3', 'ID3v1'], 'format.type');
      assert.strictEqual(format.duration, 0.7836734693877551, 'format.duration'); // FooBar says 0.732 seconds (32.727 samples)
      assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
      assert.strictEqual(format.bitrate, 128000, 'format.bitrate = 128 kbit/sec');
      assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
      assert.strictEqual(format.container, 'MPEG', 'format.container');
      assert.strictEqual(format.codec, 'MPEG 1 Layer 3', 'format.codec');
      assert.strictEqual(format.tool, 'LAME 3.98r', 'format.tool');
      assert.strictEqual(format.codecProfile, 'CBR', 'format.codecProfile');
    }

    function checkCommon(common) {
      assert.strictEqual(common.title, 'Home', 'common.title');
      assert.deepEqual(common.artists, ['Explosions In The Sky', 'Another', 'And Another'], 'common.artists');
      assert.strictEqual(common.albumartist, 'Soundtrack', 'common.albumartist');
      assert.strictEqual(common.album, 'Friday Night Lights [Original Movie Soundtrack]', 'common.album');
      assert.strictEqual(common.year, 2004, 'common.year');
      assert.strictEqual(common.track.no, 5, 'common.track.no');
      assert.strictEqual(common.track.of, null, 'common.track.of');
      assert.strictEqual(common.disk.no, 1, 'common.disk.no');
      assert.strictEqual(common.disk.of, 1, 'common.disk.of');
      assert.strictEqual(common.genre[0], 'Soundtrack', 'common.genre');
      assert.strictEqual(common.picture[0].format, 'image/jpeg', 'common.picture format');
      assert.strictEqual(common.picture[0].data.length, 80938, 'common.picture length');
    }

    function checkID3v1(id3v11: mm.INativeTagDict) {

      assert.deepEqual(id3v11.title, ['Home'], 'id3v11.title');
      assert.deepEqual(id3v11.album, ['Friday Night Lights [Original'], 'id3v11.album');
      assert.deepEqual(id3v11.artist, ['Explosions In The Sky/Another/'], 'id3v11.artist');
      assert.deepEqual(id3v11.genre, ['Soundtrack'], 'id3v11.genre');
      assert.deepEqual(id3v11.track, [5], 'id3v11.track');
      assert.deepEqual(id3v11.year, ['2004'], 'id3v11.year');
    }

    function checkID3v23(id3v23: mm.INativeTagDict) {

      assert.deepEqual(id3v23.TALB, ['Friday Night Lights [Original Movie Soundtrack]'], 'native: TALB');
      assert.deepEqual(id3v23.TPE1, ['Explosions In The Sky', 'Another', 'And Another'], 'native: TPE1');
      assert.deepEqual(id3v23.TPE2, ['Soundtrack'], 'native: TPE2');
      assert.deepEqual(id3v23.TCOM, ['Explosions in the Sky'], 'native: TCOM');
      assert.deepEqual(id3v23.TPOS, ['1/1'], 'native: TPOS');
      assert.deepEqual(id3v23.TCON, ['Soundtrack'], 'native: TCON');
      assert.deepEqual(id3v23.TIT2, ['Home'], 'native: TIT2');
      assert.deepEqual(id3v23.TRCK, ['5'], 'native: TRCK');
      assert.deepEqual(id3v23.TYER, ['2004'], 'native: TYER');
      assert.deepEqual(id3v23['TXXX:PERFORMER'], ['Explosions In The Sky'], 'native: TXXX:PERFORMER');
      assert.deepEqual(id3v23['TXXX:PERFORMER'], ['Explosions In The Sky'], 'native: TXXX:PERFORMER');

      const apic = id3v23.APIC[0] as IPicture;
      assert.strictEqual(apic.format, 'image/jpeg', 'raw APIC format');
      assert.strictEqual(apic.type, 'Cover (front)', 'raw APIC tagTypes');
      assert.strictEqual(apic.description, '', 'raw APIC description');
      assert.strictEqual(apic.data.length, 80938, 'raw APIC length');
    }

    const metadata = await mm.parseFile(filePath, {duration: true});
    checkFormat(metadata.format);
    checkCommon(metadata.common);
    checkID3v1(mm.orderTags(metadata.native.ID3v1));
    checkID3v23(mm.orderTags(metadata.native['ID3v2.3']));

  });

  describe('corrupt header / tags', () => {

    it('should decode corrupt ID3v2.3 header: \'Strawberry\'', () => {

      /**
       * Kept 25 frames from original MP3; concatenated copied last 128 bytes to restore ID3v1.0 header
       */
      const filePath = path.join(samplePath, '04-Strawberry.mp3');

      function checkFormat(format: mm.IFormat) {
        assert.strictEqual(format.duration, 247.84979591836733, 'format.duration');
        assert.deepEqual(format.tagTypes, ['ID3v2.3'], 'format.tagTypes');
        assert.strictEqual(format.container, 'MPEG', 'format.container');
        assert.strictEqual(format.codec, 'MPEG 1 Layer 3', 'format.codec');
        assert.strictEqual(format.lossless, false, 'format.lossless');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        assert.strictEqual(format.bitrate, 128000, 'format.bitrate = 128 bit/sec');
        assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
      }

      function checkCommon(common: mm.ICommonTagsResult) {
        assert.strictEqual(common.title, 'Strawberry', 'common.title');
        assert.strictEqual(common.artist, 'Union Youth', 'common.artist');
        assert.strictEqual(common.album, 'The Royal Gene', 'common.album');
        assert.strictEqual(common.albumartist, undefined, 'common.albumartist');
        assert.strictEqual(common.year, 2002, 'common.year');
        assert.deepEqual(common.track, {no: 4, of: null}, 'common.track = 4/?');
        assert.strictEqual(common.track.of, null, 'common.track.of = null');
        assert.deepEqual(common.genre, ['Alternative'], 'common.genre');
        assert.isUndefined(common.comment, 'common.comment');
      }

      return mm.parseFile(filePath).then(result => {
        checkFormat(result.format);
        checkCommon(result.common);
      });

    });

    it('should decode PeakValue without data', async () => {

      const filePath = path.join(samplePath, 'issue_56.mp3');

      const metadata = await mm.parseFile(filePath, {duration: true});
      assert.deepEqual(metadata.format.tagTypes, ['ID3v2.3', 'APEv2', 'ID3v1'], 'format.tagTypes'); // ToDo: has hale APEv2 tag header
    });

  });

  /**
   * id3v2.4 defines that multiple T* values are separated by 0x00
   * id3v2.3 defines that multiple T* values are separated by /
   * Related issue: https://github.com/Borewit/music-metadata/issues/52
   * Specification: http://id3.org/id3v2.3.0#line-290
   */
  it('slash delimited fields', async () => {
    const filePath = path.join(samplePath, 'Their - They\'re - Therapy - 1sec.mp3');

    const metadata = await mm.parseFile(filePath);
    assert.isDefined(metadata.native['ID3v2.3'], 'Expect ID3v2.3 tag');
    const id3v23 = mm.orderTags(metadata.native['ID3v2.3']);
    // It should not split the id3v23.TIT2 tag (containing '/')
    assert.deepEqual(id3v23.TIT2, ['Their / They\'re / Therapy'], 'id3v23.TIT2');
    // The artist name is actually "Their / They're / There"
    // Specification: http://id3.org/id3v2.3.0#line-455
    assert.deepEqual(id3v23.TPE1, ['Their', 'They\'re', 'There'], 'id3v23.TPE1');
  });

  it('null delimited fields (non-standard)', async () => {

    const filePath = path.join(samplePath, 'mp3', 'null-separator.id3v2.3.mp3');

    const {format, common, native, quality} = await mm.parseFile(filePath);

    assert.strictEqual(format.container, 'MPEG', 'format.container');
    assert.strictEqual(format.codec, 'MPEG 1 Layer 3', 'format.codec');
    assert.deepEqual(format.tagTypes, ['ID3v2.3'], 'format.tagTypes');

    const id3v23 = mm.orderTags(native['ID3v2.3']);
    assert.deepEqual(id3v23.TPE1, ['2 Unlimited2', 'Ray', 'Anita'], 'null separated id3v23.TPE1');

    assert.deepEqual(common.artists, ['2 Unlimited2', 'Ray', 'Anita'], 'common.artists');
    assert.isDefined(common.comment, 'common.comment');
    assert.deepEqual(common.comment, [
      {
        descriptor: "",
        language: "eng",
        text: "[DJSet]"
      },
      {
        descriptor: "",
        language: "eng",
        text: "[All]"
      }
    ], 'common.comment');
    assert.deepEqual(common.genre, ['Dance', 'Classics'], 'common.genre');

    ['TPE1', 'TCOM', 'TCON'].forEach(tag => {
      assert.includeDeepMembers(quality.warnings, [{message: `ID3v2.3 ${tag} uses non standard null-separator.`}], `expect warning: null separator ID3v2.3 ${tag}`);
    });
  });

  describe('4.2.1 Text information frames', () => {

    // http://id3.org/id3v2.3.0#line-299
    it('TCON: Content type (genres)', async () => {
      const filePath = path.join(samplePath, 'mp3', 'tcon.mp3');
      const {format, common} = await mm.parseFile(filePath);
      assert.strictEqual(format.container, 'MPEG', 'format.container');
      assert.strictEqual(format.codec, 'MPEG 2 Layer 3', 'format.codec');
      assert.deepStrictEqual(common.genre, ['Electronic', 'Pop-Folk'], 'common.genre');
    });

  });

  describe('Decode frames', () => {

    // http://id3.org/id3v2.3.0#URL_link_frames_-_details
    it('4.3.1 WCOM: Commercial information', async () => {
      const metadata = await mm.parseFile(path.join(samplePath, 'id3v2-lyrics.mp3'));
      const id3v23 = mm.orderTags(metadata.native['ID3v2.3']);
      /* eslint-disable max-len */
      assert.deepEqual(id3v23.WCOM[0], 'http://www.amazon.com/Rotation-Cute-What-We-Aim/dp/B0018QCXAU%3FSubscriptionId%3D0R6CGKPJ3EKNPQBPYJR2%26tag%3Dsoftpointer-20%26linkCode%3Dxm2%26camp%3D2025%26creative%3D165953%26creativeASIN%3DB0018QCXAU');
    });

    describe('4.3.2 WXXX: User defined URL link frame', () => {

      // http://id3.org/id3v2.3.0#User_defined_URL_link_frame
      it('decoding #1', async () => {
        const metadata = await mm.parseFile(path.join(samplePath, 'bug-unkown encoding.mp3'));
        const id3v23 = mm.orderTags(metadata.native['ID3v2.3']);
        assert.deepEqual(id3v23.WXXX[0], {
          description: 'Tempa at bleep',
          url: 'http://www.bleep.com/tempa'
        });
      });

      it('decoding #2', async () => {

        const filePath = path.join(samplePath, 'mp3', 'issue-453.mp3');

        const metadata = await mm.parseFile(filePath);
        assert.deepEqual(metadata.format.tagTypes, ['ID3v2.3', 'ID3v1']);

        const id3 = mm.orderTags(metadata.native['ID3v2.3']);
        assert.deepEqual(id3.WXXX[0], {
          description: 'あ',
          url: 'https://www.example.com'
        });
      });

    });

    // http://id3.org/id3v2.3.0#Music_CD_identifier
    it('4.5 MCDI: Music CD identifier', async () => {
      const metadata = await mm.parseFile(path.join(samplePath, '04-Strawberry.mp3'));
      const id3v23 = mm.orderTags(metadata.native['ID3v2.3']);
      assert.equal((id3v23.MCDI[0] as string).length, 804, 'TOC');
    });

    // https://id3.org/id3v2.3.0#Unsychronised_lyrics.2Ftext_transcription
    it('4.9 USLT: Unsychronised lyrics/text transcription', async () => {

      const expectedLyricsText = "Lord, have mercy, Lord, have mercy on me\nLord, have mercy, Lord, have mercy on me\n" +
        "Well, if I've done somebody wrong\nLord, have mercy if you please\n\n" +
        "I used to have plenty of money\nThe finest clothes in town\n" +
        "Bad luck and trouble overtook me\nAnd God, look at me now\n\n" +
        "Please have mercy, Lord, have mercy on me\nAnd if I've done somebody wrong\nLord, have mercy if you please\n\n" +
        "Keep on working, my child\nOh, in the morning, oh\nLord, have mercy\n\nIf I've been a bad girl, baby\nYeah, I'll change my ways\n" +
        "Don't want bad luck and trouble\nOn me all my days\n\n" +
        "Please have mercy, Lord, have mercy on me\nAnd if I've done somebody wrong\nLord, have mercy if you please\n" +
        "Have mercy on me";

      const {native, common} = await mm.parseFile(path.join(samplePath, 'MusicBrainz - Beth Hart - Sinner\'s Prayer [id3v2.3].V2.mp3'));

      const id3v23 = mm.orderTags(native['ID3v2.3']);
      assert.isDefined(id3v23.USLT, 'Should contain ID3v2.3 USLT tag');
      assert.strictEqual(id3v23.USLT.length, 1, 'id3v23.USLT.length');
      const uslt = id3v23.USLT[0] as ILyricsTag;
      assert.strictEqual(uslt.descriptor, "Sinner's Prayer", 'id3v23.USLT.description');
      assert.strictEqual(uslt.language, "eng", 'id3v23.USLT.language');
      assert.isDefined(uslt.text, 'id3v23.USLT.text');
      assert.strictEqual(uslt.text, expectedLyricsText, 'id3v23.USLT.text');

      // Check mapping to common IDv2.3 tag
      assert.isDefined(common.lyrics, 'Should map tag id3v23.USLT to common.lyrics');
      const lyrics = common.lyrics[0];
      assert.strictEqual(lyrics.descriptor, "Sinner's Prayer", 'common.lyrics.descriptor');
      assert.strictEqual(lyrics.language, "eng", 'common.lyrics.language');
      assert.isDefined(lyrics.text, 'common.lyrics.text');
      assert.strictEqual(lyrics.text, expectedLyricsText, 'common.lyrics.text');
    });

    // Issue: https://github.com/Borewit/music-metadata/issues/2134
    it('4.10. Synchronised lyrics/text', async () => {
      const filePath = path.join(samplePath, 'mp3', 'menu-sash.mp3');

      const {format, native} = await mm.parseFile(filePath);

      assert.strictEqual(format.container, 'MPEG');
      assert.strictEqual(format.codec, 'MPEG 1 Layer 3');
      assert.isDefined(native['ID3v2.3'], 'Presence of ID3v2.3 tag header');
      const id3v23 = mm.orderTags(native['ID3v2.3']);
      const syltTags = id3v23.SYLT as ILyricsTag[];
      assert.strictEqual(syltTags.length, 3, 'Number of SYLT tags');

      [syltTags[0], syltTags[1]].forEach(sylt => {
        assert.strictEqual(sylt.descriptor, 'captions', 'id3v23.sylt.descriptor');
        assert.strictEqual(sylt.timeStampFormat, TimestampFormat.milliseconds, 'id3v23.sylt.timeStampFormat in milliseconds');
        assert.strictEqual(sylt.language, 'eng', 'id3v23.sylt.language');
        assert.strictEqual(sylt.contentType, LyricsContentType.text, 'id3v23.sylt.contentType');
        assert.deepEqual(sylt.syncText, [
          {
            text: 'Check out your sash!',
            timestamp: 9
          }
        ], 'id3v23.sylt.syncText');
      });

      assert.strictEqual(syltTags[2].descriptor, 'lipsync', 'id3v23.sylt.descriptor');
      assert.strictEqual(syltTags[2].timeStampFormat, TimestampFormat.milliseconds, 'id3v23.sylt.timeStampFormat in milliseconds');
      assert.strictEqual(syltTags[2].language, 'eng', 'id3v23.sylt.language');
      assert.strictEqual(syltTags[2].contentType, LyricsContentType.other, 'id3v23.sylt.contentType');
      assert.deepEqual(syltTags[2].syncText, [
        {
          text: 'X',
          timestamp: 0
        }, {
          text: 'F',
          timestamp: 110
        }, {
          text: 'C',
          timestamp: 280
        }, {
          text: 'F',
          timestamp: 350
        }, {
          text: 'B',
          timestamp: 560
        }, {
          text: 'C',
          timestamp: 630
        }, {
          text: 'B',
          timestamp: 980
        }, {
          text: 'X',
          timestamp: 1120
        }], 'id3v23.sylt.syncText');
    });

    describe('4.16 GEOB', async () => {

      // http://id3.org/id3v2.3.0#General_encapsulated_object
      // Issue: https://github.com/Borewit/music-metadata/issues/406
      it('Decode Serato DJ meta-data', async () => {

        const filePath = path.join(samplePath, 'mp3', 'issue-406-geob.mp3');

        const {format, common, native} = await mm.parseFile(filePath);

        await mm.parseFile(filePath);

        assert.strictEqual(format.container, 'MPEG', 'format.container');
        assert.deepEqual(format.tagTypes, ['ID3v2.3'], 'format.tagTypes');
        assert.strictEqual(common.title, 'test', 'common.title');

        assert.isDefined(native['ID3v2.3'], 'Presence of ID3v2.3 tag header');
        const id3v2 = mm.orderTags(native['ID3v2.3']);

        assert.isArray(id3v2.GEOB, 'id3v2.GEOB');
        assert.strictEqual(id3v2.GEOB.length, 7, 'id3v2.GEOB.length');
        id3v2.GEOB.forEach(geobObj => {
          const geob = geobObj as IGeneralEncapsulatedObject;

          assert.strictEqual(geob.type, 'application/octet-stream', 'ID3v2.GEOB.type');
          assert.strictEqual(geob.filename, '', 'ID3v2.GEOB.filename');
          assert.isString(geob.description, 'ID3v2.GEOB.description');

          // For decoding Serato tags, see : https://github.com/Holzhaus/serato-tags
          switch (geob.description) {
            case 'Serato Overview':
              assert.deepEqual(geob.data.subarray(0, 2), new Uint8Array([0x01, 0x05]), 'Serato Overview');
              break;

            case 'Serato Analysis':
              assert.deepEqual(geob.data[0], 2, 'Serato Analysis, major version');
              assert.deepEqual(geob.data[1], 1, 'Serato Analysis, minor version');
              break;

            case 'Serato Autotags':
            case 'Serato Markers2':
              assert.deepEqual(geob.data.subarray(0, 2), new Uint8Array([0x01, 0x01]), geob.description);
              break;

            case 'Serato Markers_':
              assert.deepEqual(geob.data.subarray(0, 2), new Uint8Array([0x02, 0x05]), 'Serato Markers_');
              break;

            case 'Serato BeatGrid':
              assert.deepEqual(geob.data.subarray(0, 2), new Uint8Array([0x01, 0x00]), geob.description);
              break;

            case 'Serato Offsets_':
              assert.deepEqual(geob.data.subarray(0, 2), new Uint8Array([0x01, 0x02]), geob.description);
              break;

            default:
              assert.fail(`Unexpected GEOB.description ${geob.description}`);
          }
        });
      });
    });


    it('4.18 POPM', async () => {

      // Rating (stars) assigned with Winamp 5.666 Media Library.
      const testCaseFiles = [
        {file: 'testcase-0star.mp3', stars: undefined},
        {file: 'testcase-1star.mp3', stars: 1},
        {file: 'testcase-2star.mp3', stars: 2},
        {file: 'testcase-3star.mp3', stars: 3},
        {file: 'testcase-4star.mp3', stars: 4},
        {file: 'testcase-5star.mp3', stars: 5}
      ];

      for (const testCaseFile of testCaseFiles) {
        const filePath = path.join(samplePath, 'rating', testCaseFile.file);
        const {common} = await mm.parseFile(filePath);
        if (common.rating === undefined) {
          assert.isUndefined(common.rating, `Expect no rating property to be present in: ${testCaseFile.file}`);
        } else {
          assert.isDefined(common.rating, `Expect rating property to be present in: ${testCaseFile.file}`);
          assert.equal(Math.round(common.rating[0].rating * 4 + 1), testCaseFile.stars, `ID3v2.3 rating conversion in: ${testCaseFile.file}`);
          assert.equal(mm.ratingToStars(common.rating[0].rating), testCaseFile.stars, `ID3v2.3 rating conversion in: ${testCaseFile.file}`);
        }
      }
    });

    describe('TXXX', async () => {

      it('Handle empty TXXX', async () => {
        const {format, quality, common} = await mm.parseFile(path.join(samplePath, 'mp3', 'issue-471.mp3'));

        assert.strictEqual(format.container, 'MPEG', 'format.container');
        assert.strictEqual(format.codec, 'MPEG 1 Layer 3', 'format.codec');
        assert.approximately(format.duration, 309.629387755102, 1 / 200, 'format.duration');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
        assert.strictEqual(format.bitrate, 128000, 'format.bitrate');

        assert.includeDeepMembers(quality.warnings, [{message: 'id3v2.3 header has empty tag type=TXXX'}], 'quality.warnings includes: \'id3v2.3 header has empty tag type=TXXX\'');

        assert.strictEqual(common.title, 'Between Worlds', 'common.title');
        assert.strictEqual(common.artist, 'Roger Subirana', 'common.artist');
        assert.strictEqual(common.album, 'XII', 'common.album');
      });
    });

    describe('PRIV', async () => {

      it('Handle empty PRIV tag', async () => {

        const filePath = path.join(samplePath, 'mp3', 'issue-691.mp3');
        const {format, quality} = await mm.parseFile(filePath);

        assert.strictEqual(format.container, 'MPEG', 'format.container');
        assert.strictEqual(format.codec, 'MPEG 1 Layer 3', 'format.codec');

        assert.includeDeepMembers(quality.warnings, [
          {message: 'id3v2.3 header has empty tag type=PRIV'},
          {message: 'Invalid ID3v2.3 frame-header-ID: \u0000\u0000\u0000\u0000'}
        ], 'quality.warnings includes');

      });

    });

    it('Handle ID32.2 tag ID\'s in ID32.3 header', async () => {
      const filePath = path.join(samplePath, 'mp3', 'issue-795.mp3');

      const {native, quality, common} = await mm.parseFile(filePath);
      assert.isDefined(native['ID3v2.3'], 'native[\'ID3v2.3\']');
      const ids = native['ID3v2.3'].map(tag => {
        return tag.id;
      });
      assert.deepStrictEqual(ids, ['TP1\u0000', 'TP2\u0000', 'TAL\u0000', 'TEN\u0000', 'TIT2'], 'Decode id3v2.3 TAG names');

      assert.includeDeepMembers(quality.warnings, [
        {message: 'Invalid ID3v2.3 frame-header-ID: TP1\u0000'},
        {message: 'Invalid ID3v2.3 frame-header-ID: TP2\u0000'},
        {message: 'Invalid ID3v2.3 frame-header-ID: TAL\u0000'},
        {message: 'Invalid ID3v2.3 frame-header-ID: TEN\u0000'}
      ], 'Warning invalid ID: TP1\u0000, TP2\u0000, TAL\u0000 & TEN\u0000');

      assert.strictEqual(common.title, 'FDP (Clean Edit)', 'common.title');
    });

    it('GRP1', async () => {

      const filePath = path.join(samplePath, 'mp3', 'herbal-tea-GRP1.mp3');

      const {native, common} = await mm.parseFile(filePath);
      assert.isDefined(native['ID3v2.4'], 'Expect ID3v2.4 tag header to be present');
      const grp1Tags = native['ID3v2.4'].filter(tag => tag.id === 'GRP1');
      assert.strictEqual(grp1Tags.length, 1, 'Expect ID3v2.4 GRP1 tag be present');
      assert.strictEqual(grp1Tags[0].value, 'GRP1-Test', 'Expect ID3v2.4 GRP1 value');

      assert.deepStrictEqual(common.grouping, 'GRP1-Test', 'Mapping ID3v2.4 GRP1 => common.grouping');
    });

  });

});
