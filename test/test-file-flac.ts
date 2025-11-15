import { assert } from 'chai';
import fs from 'node:fs';
import * as path from 'node:path';

import * as mm from '../lib/index.js';
import { LyricsContentType, TimestampFormat } from '../lib/index.js';
import { Parsers } from './metadata-parsers.js';
import { samplePath } from './util.js';

describe('Parse FLAC Vorbis comment', () => {

  const flacFilePath = path.join(samplePath, 'flac');

  function checkFormat(format) {
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

  function checkCommon(common) {
    assert.strictEqual(common.title, 'Brian Eno', 'common.title');
    assert.deepEqual(common.artists, ['MGMT'], 'common.artists');
    assert.strictEqual(common.albumartist, undefined, 'common.albumartist');
    assert.strictEqual(common.album, 'Congratulations', 'common.album');
    assert.strictEqual(common.year, 2010, 'common.year');
    assert.deepEqual(common.track, {no: 7, of: null}, 'common.track');
    assert.deepEqual(common.disk, {no: null, of: null}, 'common.disk');
    assert.deepEqual(common.genre, ['Alt. Rock'], 'genre');
    assert.strictEqual(common.picture[0].format, 'image/jpeg', 'common.picture format');
    assert.strictEqual(common.picture[0].data.length, 175668, 'common.picture length');
  }

  function checkNative(vorbis) {
    // Compare expectedCommonTags with result.common
    assert.deepEqual(vorbis.TITLE, ['Brian Eno'], 'vorbis.TITLE');
    assert.deepEqual(vorbis.ARTIST, ['MGMT'], 'vorbis.ARTIST');
    assert.deepEqual(vorbis.DATE, ['2010'], 'vorbis.DATE');
    assert.deepEqual(vorbis.TRACKNUMBER, ['07'], 'vorbis.TRACKNUMBER');
    assert.deepEqual(vorbis.GENRE, ['Alt. Rock'], 'vorbis.GENRE');
    assert.deepEqual(vorbis.COMMENT, ['EAC-Secure Mode=should ignore equal sign'], 'vorbis.COMMENT');
    const pic = vorbis.METADATA_BLOCK_PICTURE[0];

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
      it(parser.description, async function(){
        const {format, common, native} = await parser.parse(() => this.skip(), path.join(samplePath, 'flac.flac'), 'audio/flac');
        checkFormat(format);
        checkCommon(common);
        checkNative(mm.orderTags(native.vorbis));
      });
    });

  });

  describe('should be able to recognize a ID3v2 tag header prefixing a FLAC file', () => {

    const filePath = path.join(samplePath, 'a kind of magic.flac');

    Parsers.forEach(parser => {
      it(parser.description, async function(){
        const {format} = await parser.parse(() => this.skip(), filePath, 'audio/flac');
        assert.deepEqual(format.tagTypes, ['ID3v2.3', 'vorbis', 'ID3v1'], 'File has 3 tag types: "vorbis", "ID3v2.3" & "ID3v1"');
      });
    });

  });

  describe('should be able to determine the bit-rate', () => {

    const filePath = path.join(samplePath, '04 Long Drive.flac');

    Parsers.forEach(parser => {
      it(parser.description, async function(){
        const {format} = await parser.parse(() => this.skip(), filePath, 'audio/flac');
        assert.approximately(496000, format.bitrate, 500);
      });
    });

  });

  describe('handle corrupt FLAC data', () => {

    it('should handle a corrupt data', () => {

      const emptyStreamSize = 10 * 1024;
      const buf = new Uint8Array(emptyStreamSize).fill(0);
      const tmpFilePath = path.join(samplePath, 'zeroes.flac');

      fs.writeFileSync(tmpFilePath, buf);

      Parsers.forEach(parser => {
        it(parser.description, async function(){
          return parser.parse(() => this.skip(), tmpFilePath, 'audio/flac').then(() => {
            assert.fail('Should reject');
            fs.unlinkSync(tmpFilePath);
          }).catch(err => {
            assert.strictEqual(err.message, 'FourCC contains invalid characters');
            return fs.unlinkSync(tmpFilePath);
          });
        });
      });
    });
  });

  /**
   * Issue: https://github.com/Borewit/music-metadata/issues/266
   */
  it('Support Vorbis METADATA_BLOCK_PICTURE tags', async () => {

    const filePath = path.join(samplePath, 'issue-266.flac');

    const metadata = await mm.parseFile(filePath);
    const {format, common} = metadata;

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

  it('Handle FLAC with undefined duration (number of samples == 0)', async() => {

    const filePath = path.join(flacFilePath, 'test-unknown-duration.flac');

    const {format} = await mm.parseFile(filePath);

    assert.isUndefined(format.duration, 'format.duration');
  });

  it('Support additional Vorbis comment TAG mapping "ALMBUM ARTIST"', async () => {

    const filePath = path.join(flacFilePath, '14. Samuel L. Jackson and John Travolta - Personality Goes a Long Way.flac');
    const {format, common} = await mm.parseFile(filePath);

    assert.strictEqual(format.container, 'FLAC', 'format.container');
    assert.strictEqual(format.codec, 'FLAC', 'format.codec');
    assert.isTrue(format.hasAudio, 'format.hasAudio');
    assert.isFalse(format.hasVideo, 'format.hasAudio');

    assert.strictEqual(common.albumartist, 'Various Artists', 'common.albumartist');
  });

  it('RATING mapping', async () => {

    const filePath = path.join(samplePath, 'rating', 'testcase.flac');
    const {common} = await mm.parseFile(filePath);

    assert.isDefined(common.rating, 'Expect rating property to be present');
    assert.equal(common.rating[0].rating, 0.80, 'Vorbis tag rating score of 80%');
    assert.equal(mm.ratingToStars(common.rating[0].rating), 4, 'Vorbis tag rating conversion');
  });

  it('Should decode LRC lyrics', async () => {

    const filePath = path.join(flacFilePath, 'Dance In The Game - ZAQ - LRC.flac');
    const {format, common} = await mm.parseFile(filePath);

    assert.isTrue(format.hasAudio, 'format.hasAudio');
    assert.isFalse(format.hasVideo, 'format.hasAudio');

    assert.isArray(common.lyrics, 'common.lyrics');
    assert.strictEqual(common.lyrics.length, 1, 'common.lyrics.length');
    const lrcLyrics = common.lyrics[0];
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

    const _syncText = lrcLyrics.syncText
    assert.isArray(common.lyrics, 'common.lyrics');

  });

  it('Should decode unsynced lyrics', async () => {
    const filePath = path.join(flacFilePath, '01. Make It Out Alive.flac');
    const {format, common} = await mm.parseFile(filePath);

    assert.strictEqual(format.container, "FLAC", "format.container");
    assert.strictEqual(format.codec, "FLAC", "format.codec");

    assert.isArray(common.lyrics, 'common.lyrics');
    assert.isNotEmpty(common.lyrics, 'common.lyrics');

    const unsyncedLyrics = common.lyrics[0].text;
    assert.strictEqual(
      unsyncedLyrics,
      "Run away, run away, run away\r\n" +
      "You don't know who to run from\r\n" +
      "Nowhere to go, don't wanna go, nowhere to go\r\n" +
      "No road is left to run on\r\n" +
      "I was born, I was born with horns\r\n" +
      "Demons couldn't shake me up\r\n" +
      "Bring it on, bring it on, bring it on\r\n" +
      "'Cause we haven't had enough\r\n" +
      "Won't give up the fight\r\n" +
      "Make it out alive\r\n" +
      "Set this world on fire now\r\n" +
      "Whoa (whoa), whoa (whoa)\r\n" +
      "Don't give up, it's gonna be alright\r\n" +
      "'Cause I won't let you burn out\r\n" +
      "Whoa (whoa), whoa (whoa)\r\n" +
      "We gotta make it out alive\r\n" +
      "Tonight, tonight, tonight\r\n" +
      "I'm screaming on the inside, I was\r\n" +
      "Trying to hide, trying to hide, trying to hide\r\n" +
      "Now I'm ready for this ride\r\n" +
      "Gotta face, gotta face the unknown\r\n" +
      "It's the only way to live\r\n" +
      "I'm ready to go, ready to go, ready to go\r\n" +
      "Somewhere I've never been\r\n" +
      "Won't give up the fight\r\n" +
      "Make it out alive\r\n" +
      "Set this world on fire now\r\n" +
      "Whoa (whoa), whoa (whoa)\r\n" +
      "Don't give up, it's gonna be alright\r\n" +
      "'Cause I won't let you burn out\r\n" +
      "Whoa (whoa), whoa (whoa)\r\n" +
      "We gotta make it out alive\r\n" +
      "...\r\n" +
      "Make it out alive\r\n" +
      "Set this world on fire now\r\n" +
      "Whoa (whoa), whoa (whoa)\r\n" +
      "Don't give up, it's gonna be alright\r\n" +
      "'Cause I won't let you burn out\r\n" +
      "Whoa (whoa), whoa (whoa)\r\n" +
      "We gotta make it out alive\r\n" +
      "Whoa (oh, yeah), whoa (oh, yeah)\r\n" +
      "We gotta make it out alive\r\n" +
      "Whoa (oh, yeah), whoa (oh, yeah)\r\n" +
      "We gotta make it out alive",
      'common.lyrics[0].text'
    );
  })

  it('Should map ENCODER to common.tool', async () => {

    const filePath = path.join(flacFilePath, 'Lavf.flac');
    const {format, native} = await mm.parseFile(filePath);


    assert.isTrue(format.hasAudio, 'format.hasAudio');
    assert.isFalse(format.hasVideo, 'format.hasAudio');
    assert.strictEqual(format.container, 'FLAC');

    const vorbis = mm.orderTags(native.vorbis);
    assert.deepEqual(vorbis.ENCODER, [ 'Lavf62.3.100' ]);
    assert.strictEqual(format.tool, 'Lavf62.3.100');
  });

  it('Should decode the vendor from the VORBIS-COMMENT tag header', async () => {

    const filePath = path.join(flacFilePath, 'libFLAC.flac');
    const {format} = await mm.parseFile(filePath);

    assert.isTrue(format.hasAudio, 'format.hasAudio');
    assert.isFalse(format.hasVideo, 'format.hasAudio');
    assert.strictEqual(format.container, 'FLAC');

    assert.strictEqual(format.tool, 'reference libFLAC 1.4.2 20221022');
  });

});
