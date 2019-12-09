import { assert } from 'chai';
import * as mm from '../lib';
import * as path from 'path';
import { Parsers } from './metadata-parsers';

const samplePath = path.join(__dirname, 'samples');

describe('Parse APE (Monkey\'s Audio)', () => {

  function checkFormat(format) {
    assert.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample');
    assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 [kHz]');
    assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
    assert.strictEqual(format.duration, 1.2134240362811792, 'duration [sec]');
  }

  function checkCommon(common) {
    assert.strictEqual(common.title, '07. Shadow On The Sun', 'common.title');
    assert.strictEqual(common.artist, 'Audioslave', 'common.artist');
    assert.deepEqual(common.artists, ['Audioslave', 'Chris Cornell'], 'common.artists');
    // Used to be ['Audioslave'], but 'APEv2/Album Artist'->'albumartist' is not set in actual file!
    assert.deepEqual(common.albumartist, undefined, 'common.albumartist');
    assert.strictEqual(common.album, 'Audioslave', 'common.album');
    assert.strictEqual(common.year, 2002, 'common.year');
    assert.deepEqual(common.genre, ['Alternative'], 'common.genre');
    assert.deepEqual(common.track, {no: 7, of: null}, 'common.track');
    assert.deepEqual(common.disk, {no: 3, of: null}, 'common.disk');
    assert.strictEqual(common.picture[0].format, 'image/jpeg', 'common.picture 0 format');
    assert.strictEqual(common.picture[0].data.length, 48658, 'common.picture 0 length');
    assert.strictEqual(common.picture[1].format, 'image/jpeg', 'common.picture 1 format');
    assert.strictEqual(common.picture[1].data.length, 48658, 'common.picture 1 length');
  }

  function checkNative(ape: mm.INativeTagDict) {
    assert.deepEqual(ape.ENSEMBLE, ['Audioslave']);
    assert.deepEqual(ape.Artist, ['Audioslave', 'Chris Cornell']);
    assert.strictEqual(ape['Cover Art (Front)'][0].data.length, 48658, 'raw cover art (front) length');
    assert.strictEqual(ape['Cover Art (Back)'][0].data.length, 48658, 'raw cover art (front) length');
  }

  Parsers.forEach(parser => {
    it(parser.description, async () => {
      const metadata = await parser.initParser(path.join(samplePath, 'monkeysaudio.ape'), 'audio/ape');
      assert.isDefined(metadata, 'metadata should be defined');
      checkFormat(metadata.format);
      checkCommon(metadata.common);
      assert.isDefined(metadata.native, 'metadata.native should be defined');
      assert.isDefined(metadata.native.APEv2, 'metadata.native.APEv2 should be defined');
      checkNative(mm.orderTags(metadata.native.APEv2));

    });
  });

});

describe('Parse APEv2 header', () => {

  it('Handle APEv2 with item count to high(issue #331)', async () => {

    const filePath = path.join(samplePath, 'mp3', 'issue-331.apev2.mp3');

    const metadata = await mm.parseFile(filePath, {
      duration: false
    });
    const {format, common, quality} = metadata;
    assert.strictEqual(format.container, 'MPEG', 'format.container');
    assert.strictEqual(format.codec, 'MPEG 1 Layer 3', 'format.codec');
    assert.strictEqual(format.codecProfile, 'CBR', 'format.codecProfile');
    assert.strictEqual(format.tool, 'LAME3.99r', 'format.codecProfile');
    assert.approximately(format.duration, 348.421, 1 / 500, 'format.duration');
    assert.deepEqual(format.sampleRate, 44100, 'format.sampleRate');
    assert.deepEqual(format.tagTypes, ['ID3v2.4', 'APEv2', 'ID3v1'], 'format.tagTypes');
    assert.strictEqual(format.bitrate, 320000, 'format.bitrate');

    assert.strictEqual(common.artist, 'Criminal Vibes', 'common.artist');
    assert.strictEqual(common.title, 'Push The Feeling On (Groove Phenomenon Remix)', 'common.title');

    assert.strictEqual(quality.warnings.filter(warning => {
      return warning.message === 'APEv2 Tag-header: 1 items remaining, but no more tag data to read.';
    }).length, 1, 'quality.warnings');
  });

});
