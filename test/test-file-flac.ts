import { assert } from 'chai';
import fs from 'node:fs';
import * as path from 'node:path';

import * as mm from '../lib/index.js';
import { Parsers } from './metadata-parsers.js';
import { samplePath } from './util.js';

const t = assert;

describe('Parse FLAC Vorbis comment', () => {

  const flacFilePath = path.join(samplePath, 'flac');

  function checkFormat(format) {
    t.strictEqual(format.container, 'FLAC', 'format.container');
    t.strictEqual(format.codec, 'FLAC', 'format.codec');
    t.deepEqual(format.tagTypes, ['vorbis'], 'format.tagTypes');
    t.strictEqual(format.duration, 271.7733333333333, 'format.duration');
    t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
    t.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample = 16 bit');
    t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
  }

  function checkCommon(common) {
    t.strictEqual(common.title, 'Brian Eno', 'common.title');
    t.deepEqual(common.artists, ['MGMT'], 'common.artists');
    t.strictEqual(common.albumartist, undefined, 'common.albumartist');
    t.strictEqual(common.album, 'Congratulations', 'common.album');
    t.strictEqual(common.year, 2010, 'common.year');
    t.deepEqual(common.track, {no: 7, of: null}, 'common.track');
    t.deepEqual(common.disk, {no: null, of: null}, 'common.disk');
    t.deepEqual(common.genre, ['Alt. Rock'], 'genre');
    t.strictEqual(common.picture[0].format, 'image/jpeg', 'common.picture format');
    t.strictEqual(common.picture[0].data.length, 175668, 'common.picture length');
  }

  function checkNative(vorbis) {
    // Compare expectedCommonTags with result.common
    t.deepEqual(vorbis.TITLE, ['Brian Eno'], 'vorbis.TITLE');
    t.deepEqual(vorbis.ARTIST, ['MGMT'], 'vorbis.ARTIST');
    t.deepEqual(vorbis.DATE, ['2010'], 'vorbis.DATE');
    t.deepEqual(vorbis.TRACKNUMBER, ['07'], 'vorbis.TRACKNUMBER');
    t.deepEqual(vorbis.GENRE, ['Alt. Rock'], 'vorbis.GENRE');
    t.deepEqual(vorbis.COMMENT, ['EAC-Secure Mode=should ignore equal sign'], 'vorbis.COMMENT');
    const pic = vorbis.METADATA_BLOCK_PICTURE[0];

    t.strictEqual(pic.type, 'Cover (front)', 'raw METADATA_BLOCK_PICTUREtype');
    t.strictEqual(pic.format, 'image/jpeg', 'raw METADATA_BLOCK_PICTURE format');
    t.strictEqual(pic.description, '', 'raw METADATA_BLOCK_PICTURE description');
    t.strictEqual(pic.width, 450, 'raw METADATA_BLOCK_PICTURE width');
    t.strictEqual(pic.height, 450, 'raw METADATA_BLOCK_PICTURE height');
    t.strictEqual(pic.colour_depth, 24, 'raw METADATA_BLOCK_PICTURE colour depth');
    t.strictEqual(pic.indexed_color, 0, 'raw METADATA_BLOCK_PICTURE indexed_color');
    t.strictEqual(pic.data.length, 175668, 'raw METADATA_BLOCK_PICTURE length');
  }

  describe('decode flac.flac', () => {

    Parsers.forEach(parser => {
      it(parser.description, async function(){
        const metadata = await parser.initParser(this.skip(), path.join(samplePath, 'flac.flac'), 'audio/flac');
        checkFormat(metadata.format);
        checkCommon(metadata.common);
        checkNative(mm.orderTags(metadata.native.vorbis));
      });
    });

  });

  describe('should be able to recognize a ID3v2 tag header prefixing a FLAC file', () => {

    const filePath = path.join(samplePath, 'a kind of magic.flac');

    Parsers.forEach(parser => {
      it(parser.description, async function(){
        const metadata = await parser.initParser(this.skip(), filePath, 'audio/flac');
        t.deepEqual(metadata.format.tagTypes, ['ID3v2.3', 'vorbis', 'ID3v1'], 'File has 3 tag types: "vorbis", "ID3v2.3" & "ID3v1"');
      });
    });

  });

  describe('should be able to determine the bit-rate', () => {

    const filePath = path.join(samplePath, '04 Long Drive.flac');

    Parsers.forEach(parser => {
      it(parser.description, async function(){
        const metadata = await parser.initParser(() => this.skip(), filePath, 'audio/flac');
        assert.approximately(496000, metadata.format.bitrate, 500);
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
          return parser.initParser(() => this.skip(), tmpFilePath, 'audio/flac').then(() => {
            t.fail('Should reject');
            fs.unlinkSync(tmpFilePath);
          }).catch(err => {
            t.strictEqual(err.message, 'FourCC contains invalid characters');
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

    assert.strictEqual(common.albumartist, 'Various Artists', 'common.albumartist');
  });

  it('RATING mapping', async () => {

    const filePath = path.join(samplePath, 'rating', 'testcase.flac');
    const {common} = await mm.parseFile(filePath);

    assert.isDefined(common.rating, 'Expect rating property to be present');
    assert.equal(common.rating[0].rating, 0.80, 'Vorbis tag rating score of 80%');
    assert.equal(mm.ratingToStars(common.rating[0].rating), 4, 'Vorbis tag rating conversion');
  });

});

