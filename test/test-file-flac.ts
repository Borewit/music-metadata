import { rejects } from 'node:assert/strict';
import fs from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { assert } from 'chai';
import * as mm from '../lib/index.js';
import { LyricsContentType, TimestampFormat } from '../lib/index.js';
import type { IVorbisPicture } from '../lib/ogg/vorbis/Vorbis.js';
import { Parsers } from './shared/metadata-parsers.js';
import { samplePath } from './shared/util.js';

describe('Parse FLAC Vorbis comment', () => {
  const flacFilePath = path.join(samplePath, 'flac');

  describe('issue #2651: map Vorbis UNSYNCEDLYRICS to common lyrics', () => {
    // Fixture: 0.1 seconds of generated silence with a multiline UTF-8 UNSYNCEDLYRICS tag.
    const filePath = path.join(flacFilePath, 'issue-2651-unsyncedlyrics.flac');
    const text = 'First line\nDeuxième ligne';

    for (const parser of Parsers) {
      it(parser.description, async function () {
        const { common, native } = await parser.parse(() => this.skip(), filePath, 'audio/flac');

        assert.deepEqual(mm.orderTags(native.vorbis).UNSYNCEDLYRICS, [text]);
        assert.deepEqual(common.lyrics, [
          {
            contentType: LyricsContentType.lyrics,
            timeStampFormat: TimestampFormat.notSynchronized,
            text,
            syncText: []
          }
        ]);
      });
    }
  });

  describe('standard recording date precedence over Discogs aliases', () => {
    const cases = [
      ['flac/date-precedence-standard-first.flac', '2009-10-05'],
      ['flac/date-precedence-standard-last.flac', '2009-10-05'],
      ['flac/date-precedence-year.flac', '2009'],
      ['flac/date-precedence-alias.flac', '2009-10-05'],
      ['flac/date-precedence-empty.flac', '2009-10-05'],
      ['flac/date-precedence-duplicate.flac', '2010-02-03'],
      ['Discogs - Yasmin Levy - Mi Korasón.flac', '2009-10-05']
    ];
    for (const [name, date] of cases) {
      for (const parser of Parsers) {
        it(`${name} (${parser.description})`, async function () {
          const { common, native, format } = await parser.parse(
            () => this.skip(),
            path.join(samplePath, name),
            'audio/flac'
          );
          assert.strictEqual(common.date, date);
          assert.strictEqual(common.year, Number(date.slice(0, 4)));
          assert.isAbove(format.duration ?? 0, 0);
          assert.isTrue(format.hasAudio);
          const tags = mm.orderTags(native.vorbis);
          assert.isDefined(tags.DISCOGS_RELEASED, 'native alias remains available');
          if (name.includes('standard-')) {
            assert.deepEqual(tags.DATE, ['2009-10-05']);
            assert.deepEqual(tags.DISCOGS_RELEASED, ['2009']);
          }
          if (name.includes('empty')) {
            assert.deepEqual(tags.DATE, ['', '   ']);
          }
          if (name.includes('duplicate')) {
            assert.deepEqual(tags.DATE, ['2009-10-05', '2010-02-03']);
          }
        });
      }
    }
  });

  function checkFormat(format: mm.IFormat) {
    assert.strictEqual(format.container, 'FLAC', 'format.container');
    assert.strictEqual(format.codec, 'FLAC', 'format.codec');
    assert.deepEqual(format.tagTypes, ['vorbis'], 'format.tagTypes');
    assert.strictEqual(format.duration, 271.7733333333333, 'format.duration');
    assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
    assert.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample = 16 bit');
    assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
    assert.isTrue(format.hasAudio, 'format.hasAudio');
    assert.isFalse(format.hasVideo, 'format.hasAudio');
  }

  function checkCommon(common: mm.ICommonTagsResult) {
    assert.strictEqual(common.title, 'Brian Eno', 'common.title');
    assert.deepEqual(common.artists, ['MGMT'], 'common.artists');
    assert.strictEqual(common.albumartist, undefined, 'common.albumartist');
    assert.strictEqual(common.album, 'Congratulations', 'common.album');
    assert.strictEqual(common.year, 2010, 'common.year');
    assert.deepEqual(common.track, { no: 7, of: null }, 'common.track');
    assert.deepEqual(common.disk, { no: null, of: null }, 'common.disk');
    assert.deepEqual(common.genre, ['Alt. Rock'], 'genre');
    assert.strictEqual(common.picture![0].format, 'image/jpeg', 'common.picture format');
    assert.strictEqual(common.picture![0].data.length, 175668, 'common.picture length');
  }

  function checkNative(vorbis: mm.INativeTagDict) {
    // Compare expectedCommonTags with result.common
    assert.deepEqual(vorbis.TITLE, ['Brian Eno'], 'vorbis.TITLE');
    assert.deepEqual(vorbis.ARTIST, ['MGMT'], 'vorbis.ARTIST');
    assert.deepEqual(vorbis.DATE, ['2010'], 'vorbis.DATE');
    assert.deepEqual(vorbis.TRACKNUMBER, ['07'], 'vorbis.TRACKNUMBER');
    assert.deepEqual(vorbis.GENRE, ['Alt. Rock'], 'vorbis.GENRE');
    assert.deepEqual(vorbis.COMMENT, ['EAC-Secure Mode=should ignore equal sign'], 'vorbis.COMMENT');
    const pic = vorbis.METADATA_BLOCK_PICTURE[0] as IVorbisPicture;

    assert.strictEqual(pic.type, 'Cover (front)', 'raw METADATA_BLOCK_PICTUREtype');
    assert.strictEqual(pic.format, 'image/jpeg', 'raw METADATA_BLOCK_PICTURE format');
    assert.strictEqual(pic.description, '', 'raw METADATA_BLOCK_PICTURE description');
    assert.strictEqual(pic.width, 450, 'raw METADATA_BLOCK_PICTURE width');
    assert.strictEqual(pic.height, 450, 'raw METADATA_BLOCK_PICTURE height');
    assert.strictEqual(pic.colour_depth, 24, 'raw METADATA_BLOCK_PICTURE colour depth');
    assert.strictEqual(pic.indexed_color, 0, 'raw METADATA_BLOCK_PICTURE indexed_color');
    assert.strictEqual(pic.data.length, 175668, 'raw METADATA_BLOCK_PICTURE length');
  }

  describe('decode flac.flac', () => {
    Parsers.forEach(parser => {
      it(parser.description, async function () {
        const { format, common, native } = await parser.parse(
          () => this.skip(),
          path.join(samplePath, 'flac.flac'),
          'audio/flac'
        );
        checkFormat(format);
        checkCommon(common);
        checkNative(mm.orderTags(native.vorbis));
      });
    });
  });

  it('should support multiple album artists (separate Vorbis tags)', async () => {
    const filePath = path.join(samplePath, 'flac-multiple-album-artists-tags.flac');
    const { common } = await mm.parseFile(filePath);

    assert.strictEqual(common.albumartist, 'Album Artist One', 'common.albumartist');
    assert.deepEqual(common.albumartists, ['Album Artist One', 'Album Artist Two'], 'common.albumartists');
  });

  describe('should be able to recognize a ID3v2 tag header prefixing a FLAC file', () => {
    const filePath = path.join(samplePath, 'a kind of magic.flac');

    Parsers.forEach(parser => {
      it(parser.description, async function () {
        const { format } = await parser.parse(() => this.skip(), filePath, 'audio/flac');
        assert.deepEqual(
          format.tagTypes,
          ['ID3v2.3', 'vorbis', 'ID3v1'],
          'File has 3 tag types: "vorbis", "ID3v2.3" & "ID3v1"'
        );
      });
    });
  });

  describe('should be able to determine the bit-rate', () => {
    const filePath = path.join(samplePath, '04 Long Drive.flac');

    Parsers.forEach(parser => {
      it(parser.description, async function () {
        const { format } = await parser.parse(() => this.skip(), filePath, 'audio/flac');
        assert.approximately(496000, format.bitrate!, 500);
      });
    });
  });

  describe('handle corrupt FLAC data', () => {
    Parsers.forEach(parser => {
      it(parser.description, async function () {
        const directory = await mkdtemp(path.join(tmpdir(), 'music-metadata-flac-'));
        const filePath = path.join(directory, 'zeroes.flac');
        try {
          await writeFile(filePath, new Uint8Array(10 * 1024));
          await rejects(
            parser.parse(() => this.skip(), filePath, 'audio/flac'),
            {
              message: /^FourCC contains invalid characters:/
            }
          );
        } finally {
          await rm(directory, { recursive: true, force: true });
        }
      });
    });
  });

  /**
   * Issue: https://github.com/Borewit/music-metadata/issues/266
   */
  it('Support Vorbis METADATA_BLOCK_PICTURE tags', async () => {
    const filePath = path.join(samplePath, 'issue-266.flac');

    const metadata = await mm.parseFile(filePath);
    const { format, common } = metadata;

    assert.strictEqual(format.container, 'FLAC');
    assert.deepEqual(format.tagTypes, ['vorbis']);
    assert.isTrue(format.hasAudio, 'format.hasAudio');
    assert.isFalse(format.hasVideo, 'format.hasAudio');

    const vorbis = mm.orderTags(metadata.native.vorbis);
    assert.isDefined(vorbis.METADATA_BLOCK_PICTURE, 'expect a Vorbis METADATA_BLOCK_PICTURE tag');
    assert.deepEqual(vorbis.METADATA_BLOCK_PICTURE.length, 2, 'expect 2 Vorbis METADATA_BLOCK_PICTURE tags');

    assert.isDefined(common.picture, 'common.picture');
    assert.deepEqual(common.picture.length, 2, 'common.picture.length');
    assert.deepEqual(common.picture[0].format, 'image/jpeg', 'ommon.picture[0].format');
    assert.deepEqual(common.picture[0].data.length, 107402, 'ommon.picture[0].data.length');
    assert.deepEqual(common.picture[1].format, 'image/jpeg', 'ommon.picture[1].format');
    assert.deepEqual(common.picture[1].data.length, 215889, 'ommon.picture[1].data.length');
  });

  it('Handle FLAC with undefined duration (number of samples == 0)', async () => {
    const filePath = path.join(flacFilePath, 'test-unknown-duration.flac');

    const { format } = await mm.parseFile(filePath);

    assert.isUndefined(format.duration, 'format.duration');
  });

  it('Support additional Vorbis comment TAG mapping "ALMBUM ARTIST"', async () => {
    const filePath = path.join(
      flacFilePath,
      '14. Samuel L. Jackson and John Travolta - Personality Goes a Long Way.flac'
    );
    const { format, common } = await mm.parseFile(filePath);

    assert.strictEqual(format.container, 'FLAC', 'format.container');
    assert.strictEqual(format.codec, 'FLAC', 'format.codec');
    assert.isTrue(format.hasAudio, 'format.hasAudio');
    assert.isFalse(format.hasVideo, 'format.hasAudio');

    assert.strictEqual(common.albumartist, 'Various Artists', 'common.albumartist');
  });

  it('RATING mapping', async () => {
    const filePath = path.join(samplePath, 'rating', 'testcase.flac');
    const { common } = await mm.parseFile(filePath);

    assert.isDefined(common.rating, 'Expect rating property to be present');
    assert.equal(common.rating[0].rating, 0.8, 'Vorbis tag rating score of 80%');
    assert.equal(mm.ratingToStars(common.rating[0].rating), 4, 'Vorbis tag rating conversion');
  });

  it('Should decode LRC lyrics', async () => {
    const filePath = path.join(flacFilePath, 'Dance In The Game - ZAQ - LRC.flac');
    const { format, common } = await mm.parseFile(filePath);

    assert.isTrue(format.hasAudio, 'format.hasAudio');
    assert.isFalse(format.hasVideo, 'format.hasAudio');

    assert.isArray(common.lyrics, 'common.lyrics');
    assert.strictEqual(common.lyrics!.length, 1, 'common.lyrics.length');
    const lrcLyrics = common.lyrics![0];
    assert.strictEqual(lrcLyrics.contentType, LyricsContentType.lyrics, 'lrcLyrics.contentType');
    assert.strictEqual(lrcLyrics.timeStampFormat, TimestampFormat.milliseconds, 'lrcLyrics.timeStampFormat');
    assert.isArray(lrcLyrics.syncText, 'lrcLyrics.syncText');
    assert.strictEqual(lrcLyrics.syncText.length, 39, 'lrcLyrics.syncText.length');
    assert.strictEqual(lrcLyrics.syncText[0].timestamp, 0, 'syncText[0].timestamp, decode [00:00.00]');
    assert.strictEqual(lrcLyrics.syncText[0].text, '作词 : ZAQ', 'lrcLyrics.syncText[0].text');
    assert.strictEqual(lrcLyrics.syncText[1].timestamp, 300, 'syncText[1].timestamp, decode [00:00.30]');
    assert.strictEqual(lrcLyrics.syncText[1].text, '作曲 : ZAQ', 'lrcLyrics.syncText[1].text');
    assert.strictEqual(lrcLyrics.syncText[3].timestamp, 920, 'syncText[3].timestamp, decode [00:00.920]');
    assert.strictEqual(lrcLyrics.syncText[3].text, '歪んだ憂いが飛び交う中で失い失い', 'lrcLyrics.syncText[3].text');
    assert.strictEqual(lrcLyrics.syncText[4].timestamp, 6240, 'syncText[4].timestamp, decode [00:06.240]');
    assert.strictEqual(lrcLyrics.syncText[4].text, '膝をつく道化', 'syncText[4].text');
    assert.strictEqual(lrcLyrics.syncText[7].timestamp, 24395, 'syncText[7].timestamp, decode [00:24.395]');
    assert.strictEqual(lrcLyrics.syncText[7].text, '昨日の自分に興味なんかない', 'syncText[7].text');

    const _syncText = lrcLyrics.syncText;
    assert.isArray(common.lyrics, 'common.lyrics');
  });

  it('Should decode unsynced lyrics', async () => {
    const filePath = path.join(flacFilePath, '01. Make It Out Alive.flac');
    const { format, common } = await mm.parseFile(filePath);

    assert.strictEqual(format.container, 'FLAC', 'format.container');
    assert.strictEqual(format.codec, 'FLAC', 'format.codec');

    assert.isArray(common.lyrics, 'common.lyrics');
    assert.isNotEmpty(common.lyrics, 'common.lyrics');

    const unsyncedLyrics = common.lyrics![0].text;
    assert.strictEqual(
      unsyncedLyrics,
      'Run away, run away, run away\r\n' +
        "You don't know who to run from\r\n" +
        "Nowhere to go, don't wanna go, nowhere to go\r\n" +
        'No road is left to run on\r\n' +
        'I was born, I was born with horns\r\n' +
        "Demons couldn't shake me up\r\n" +
        'Bring it on, bring it on, bring it on\r\n' +
        "'Cause we haven't had enough\r\n" +
        "Won't give up the fight\r\n" +
        'Make it out alive\r\n' +
        'Set this world on fire now\r\n' +
        'Whoa (whoa), whoa (whoa)\r\n' +
        "Don't give up, it's gonna be alright\r\n" +
        "'Cause I won't let you burn out\r\n" +
        'Whoa (whoa), whoa (whoa)\r\n' +
        'We gotta make it out alive\r\n' +
        'Tonight, tonight, tonight\r\n' +
        "I'm screaming on the inside, I was\r\n" +
        'Trying to hide, trying to hide, trying to hide\r\n' +
        "Now I'm ready for this ride\r\n" +
        'Gotta face, gotta face the unknown\r\n' +
        "It's the only way to live\r\n" +
        "I'm ready to go, ready to go, ready to go\r\n" +
        "Somewhere I've never been\r\n" +
        "Won't give up the fight\r\n" +
        'Make it out alive\r\n' +
        'Set this world on fire now\r\n' +
        'Whoa (whoa), whoa (whoa)\r\n' +
        "Don't give up, it's gonna be alright\r\n" +
        "'Cause I won't let you burn out\r\n" +
        'Whoa (whoa), whoa (whoa)\r\n' +
        'We gotta make it out alive\r\n' +
        '...\r\n' +
        'Make it out alive\r\n' +
        'Set this world on fire now\r\n' +
        'Whoa (whoa), whoa (whoa)\r\n' +
        "Don't give up, it's gonna be alright\r\n" +
        "'Cause I won't let you burn out\r\n" +
        'Whoa (whoa), whoa (whoa)\r\n' +
        'We gotta make it out alive\r\n' +
        'Whoa (oh, yeah), whoa (oh, yeah)\r\n' +
        'We gotta make it out alive\r\n' +
        'Whoa (oh, yeah), whoa (oh, yeah)\r\n' +
        'We gotta make it out alive',
      'common.lyrics[0].text'
    );
  });

  it('Should map ENCODER to common.tool', async () => {
    const filePath = path.join(flacFilePath, 'Lavf.flac');
    const { format, native } = await mm.parseFile(filePath);

    assert.isTrue(format.hasAudio, 'format.hasAudio');
    assert.isFalse(format.hasVideo, 'format.hasAudio');
    assert.strictEqual(format.container, 'FLAC');

    const vorbis = mm.orderTags(native.vorbis);
    assert.deepEqual(vorbis.ENCODER, ['Lavf62.3.100']);
    assert.strictEqual(format.tool, 'Lavf62.3.100');
  });

  it('Should decode the vendor from the VORBIS-COMMENT tag header', async () => {
    const filePath = path.join(flacFilePath, 'libFLAC.flac');
    const { format } = await mm.parseFile(filePath);

    assert.isTrue(format.hasAudio, 'format.hasAudio');
    assert.isFalse(format.hasVideo, 'format.hasAudio');
    assert.strictEqual(format.container, 'FLAC');

    assert.strictEqual(format.tool, 'reference libFLAC 1.4.2 20221022');
  });

  describe('Concurrent picture parsing', () => {
    it('should handle concurrent parsing of pictures', () => {
      const files = [path.join(samplePath, 'flac.flac'), path.join(samplePath, 'flac-bug.flac')];

      return Promise.all<void>(
        files.map(file => {
          return mm.parseFile(file).then(result => {
            const data = fs.readFileSync(`${file}.jpg`);
            assert.deepEqual(result.common.picture![0].data, data, 'check picture');
          });
        })
      );
    });
  });

  describe('MusicBrainz/Picard tags', () => {
    it('MusicBrains/Picard tags in FLAC', async () => {
      const filename = 'MusicBrainz-Picard-tags.flac';
      const filePath = path.join(samplePath, filename);

      function checkFormat(format) {
        assert.deepEqual(format.duration, 271.7733333333333, 'format.duration');
        assert.deepEqual(format.sampleRate, 44100, 'format.sampleRate');
        assert.deepEqual(format.bitsPerSample, 16, 'format.bitsPerSample');
        assert.deepEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
      }

      function checkCommonTags(common) {
        // Compare expectedCommonTags with result.common
        assert.deepEqual(common.title, 'Brian Eno', 'common.tagtitle');
        assert.deepEqual(common.artist, 'MGMT', 'common.artist');
        assert.deepEqual(common.artists, ['MGMT'], 'common.artist');
        assert.deepEqual(common.albumartist, 'MGMT', 'common.albumartist');
        assert.deepEqual(common.album, 'Oracular Spectacular / Congratulations', 'common.album');
        assert.deepEqual(common.track, { no: 7, of: 9 }, 'common.track');
        assert.deepEqual(common.disk, { no: 2, of: 2 }, 'common.disk');
        assert.deepEqual(common.discsubtitle, 'Cogratulations', 'common.discsubtitle');
        assert.deepEqual(common.date, '2011-09-11', 'common.date');
        assert.deepEqual(common.year, 2011, 'common.year');
        assert.deepEqual(common.releasecountry, 'XE', 'common.releasecountry');
        assert.deepEqual(common.asin, 'B0055U9LNC', 'common.asin');
        assert.deepEqual(common.barcode, '886979357723', 'common.barcode');
        assert.deepEqual(common.label, ['Sony Music'], 'common.label');
        assert.deepEqual(common.catalognumber, ['88697935772'], 'common.catalognumber');
        assert.deepEqual(common.originalyear, 2011, 'common.originalyear');
        assert.deepEqual(common.originaldate, '2011-09-11', 'common.originaldate');
        assert.deepEqual(common.releasestatus, 'official', 'common.releasestatus');
        assert.deepEqual(common.releasetype, ['album', 'compilation'], 'common.releasetype');
        assert.deepEqual(
          common.comment,
          [
            {
              text: 'EAC-Secure Mode'
            }
          ],
          'common.comment'
        );
        assert.deepEqual(common.genre, ['Alt. Rock'], 'common.genre');
        assert.deepEqual(
          common.musicbrainz_albumid,
          '6032dfc4-8880-4fea-b1c0-aaee52e1113c',
          'common.musicbrainz_albumid'
        );
        assert.deepEqual(
          common.musicbrainz_recordingid,
          'b0c1d984-ba93-4167-880a-ac02255bf9e7',
          'common.musicbrainz_recordingid'
        );
        assert.deepEqual(
          common.musicbrainz_albumartistid,
          ['c485632c-b784-4ee9-8ea1-c5fb365681fc'],
          'common.musicbrainz_albumartistid'
        );
        assert.deepEqual(
          common.musicbrainz_artistid,
          ['c485632c-b784-4ee9-8ea1-c5fb365681fc'],
          'common.musicbrainz_artistid'
        );
        assert.deepEqual(
          common.musicbrainz_releasegroupid,
          '9a3237f4-c2a5-467f-9a8e-fe1d247ff520',
          'common.musicbrainz_releasegroupid'
        );
        assert.deepEqual(
          common.musicbrainz_trackid,
          '0f53f7a3-89df-4069-9357-d04252239b6d',
          'common.musicbrainz_trackid'
        );

        assert.isDefined(common.picture, 'common.picture');
        assert.deepEqual(common.picture[0].format, 'image/jpeg', 'picture format');
        assert.deepEqual(common.picture[0].data.length, 175668, 'picture length');
      }

      function checkNativeTags(vorbis) {
        // Compare expectedCommonTags with result.vorbis
        assert.deepEqual(vorbis.TITLE, ['Brian Eno'], 'vorbis: .TITLE');
        assert.deepEqual(vorbis.ARTIST, ['MGMT'], 'vorbis: artist');
        assert.deepEqual(vorbis.ARTISTS, ['MGMT'], 'vorbis: artist');
        assert.deepEqual(vorbis.ALBUMARTIST, ['MGMT'], 'vorbis: albumartist');
        assert.deepEqual(vorbis.ALBUM, ['Oracular Spectacular / Congratulations'], 'vorbis: album');
        assert.deepEqual(vorbis.TRACKNUMBER, ['7'], 'vorbis: TRACK');
        assert.deepEqual(vorbis.TRACKTOTAL, ['9'], 'vorbis: TRACKTOTAL');
        assert.deepEqual(vorbis.DISCNUMBER, ['2'], 'vorbis: DISCNUMBER');
        assert.deepEqual(vorbis.DISCTOTAL, ['2'], 'vorbis: DISCTOTAL');
        assert.deepEqual(vorbis.DISCSUBTITLE, ['Cogratulations'], 'vorbis: DISCSUBTITLE');
        assert.deepEqual(vorbis.DATE, ['2011-09-11'], 'vorbis: DATE');
        assert.deepEqual(vorbis.RELEASECOUNTRY, ['XE'], 'vorbis: RELEASECOUNTRY');
        assert.deepEqual(vorbis.ASIN, ['B0055U9LNC'], 'vorbis: ASIN');
        assert.deepEqual(vorbis.BARCODE, ['886979357723'], 'vorbis: BARCODE');
        assert.deepEqual(vorbis.LABEL, ['Sony Music'], 'vorbis: LABEL');
        assert.deepEqual(vorbis.CATALOGNUMBER, ['88697935772'], 'vorbis: CATALOGNUMBER');
        assert.deepEqual(vorbis.ORIGINALYEAR, ['2011'], 'vorbis: ORIGINALYEAR');
        assert.deepEqual(vorbis.ORIGINALDATE, ['2011-09-11'], 'vorbis: ORIGINALDATE');
        assert.deepEqual(vorbis.RELEASESTATUS, ['official'], 'vorbis: RELEASESTATUS');
        assert.deepEqual(vorbis.RELEASETYPE, ['album', 'compilation'], 'vorbis: RELEASETYPE');
        assert.deepEqual(vorbis.COMMENT, ['EAC-Secure Mode'], 'vorbis: COMMENT');
        assert.deepEqual(vorbis.GENRE, ['Alt. Rock'], 'vorbis: GENRE');
        assert.deepEqual(
          vorbis.MUSICBRAINZ_ALBUMID,
          ['6032dfc4-8880-4fea-b1c0-aaee52e1113c'],
          'vorbis: MUSICBRAINZ_ALBUMID'
        );
        assert.deepEqual(
          vorbis.MUSICBRAINZ_TRACKID,
          ['b0c1d984-ba93-4167-880a-ac02255bf9e7'],
          'vorbis: MUSICBRAINZ_RECORDINGID'
        );
        assert.deepEqual(
          vorbis.MUSICBRAINZ_ALBUMARTISTID,
          ['c485632c-b784-4ee9-8ea1-c5fb365681fc'],
          'vorbis: MUSICBRAINZ_ALBUMARTISTID'
        );
        assert.deepEqual(
          vorbis.MUSICBRAINZ_ARTISTID,
          ['c485632c-b784-4ee9-8ea1-c5fb365681fc'],
          'vorbis: MUSICBRAINZ_ARTISTID'
        );
        assert.deepEqual(
          vorbis.MUSICBRAINZ_RELEASEGROUPID,
          ['9a3237f4-c2a5-467f-9a8e-fe1d247ff520'],
          'vorbis: MUSICBRAINZ_RELEASEGROUPID'
        );
        assert.deepEqual(
          vorbis.MUSICBRAINZ_RELEASETRACKID,
          ['0f53f7a3-89df-4069-9357-d04252239b6d'],
          'vorbis: MUSICBRAINZ_RELEASETRACKID'
        );

        // assert.deepEqual(common.picture[ 0 ].format, 'jpg', 'picture format')
        // i.deepEqual(common.picture[ 0 ].data.length, 175668, 'picture length')
      }

      // Run with default options
      const metadata = await mm.parseFile(filePath);
      assert.isDefined(metadata, 'metadata');
      assert.isDefined(metadata.common, 'should include common tags');
      assert.isDefined(metadata.native, 'metadata.common');
      assert.isDefined(metadata.native.vorbis, 'should include native Vorbis tags');
      checkFormat(metadata.format);
      checkNativeTags(mm.orderTags(metadata.native.vorbis));
      checkCommonTags(metadata.common);
    });
  });

  describe('ReplayGain tags', () => {
    const filePath = path.join(samplePath, '04 Long Drive.flac');

    it('should decode replaygain tags from FLAC/Vorbis', async () => {
      return mm.parseFile(filePath).then(metadata => {
        assert.deepEqual(
          metadata.common.replaygain_track_gain,
          { dB: -7.03, ratio: 0.1981527025805098 },
          'replaygain_track_gain.ratio'
        );
        assert.deepEqual(
          metadata.common.replaygain_track_peak,
          { dB: -0.0037125893296365503, ratio: 0.99914551 },
          'replaygain_track_peak.ratio = -0.00371259 dB'
        );
      });
    });
  });
});
