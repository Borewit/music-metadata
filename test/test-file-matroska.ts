import path from 'node:path';
import  { assert, expect, use } from 'chai';

import * as mm from '../lib/index.js';
import { samplePath } from './util.js';

import chaiAsPromised from 'chai-as-promised';

use(chaiAsPromised);

describe('Matroska formats', () => {

  const matroskaSamplePath = path.join(samplePath, 'matroska');

  function verifyTrackSolidGround(common: mm.ICommonTagsResult) {
    // Common mapped EBML tags
    assert.strictEqual(common.title, 'Solid Ground', 'common.title');
    assert.strictEqual(common.artist, 'Poxfil', 'common.artist');
    assert.strictEqual(common.artistsort, 'Poxfil', 'common.artistsort');
    assert.deepEqual(common.label, ['blocSonic'], 'common.label');
    assert.strictEqual(common.musicbrainz_albumid, 'abf39f57-0b01-4b51-9c1e-b21e8ada5091', 'common.musicbrainz_albumid');
    assert.deepEqual(common.musicbrainz_artistid, ['ee315b01-df5e-451e-8cd6-90a9f1faaf51'], 'common.musicbrainz_artistid');
    assert.strictEqual(common.musicbrainz_recordingid, '209dbf50-509d-4ac3-aec5-e96da99dfdd9', 'common.musicbrainz_recordingid');
    assert.deepEqual(common.track, {no: 2, of: 10}, 'common.track');
  }

  describe('Matroska audio (.mka)', () => {

    it('parse: "alac-in-matroska-short.mka"', async () => {

      const mkaPath = path.join(matroskaSamplePath, 'alac-in-matroska-short.mka');

      const {format} = await mm.parseFile(mkaPath, {duration: false});

      // format chunk information
      assert.strictEqual(format.container, 'EBML/matroska', 'format.container');
      assert.strictEqual(format.codec, 'ALAC', 'format.codec');
      assert.approximately(format.duration, 196608 / 41000, 1 / 100000, 'format.duration');
      assert.strictEqual(format.sampleRate, 41000, 'format.sampleRate');
      assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasVideo');
    });

    async function parsePoxfile(options?: mm.IOptions) {

      const mkaPath = path.join(matroskaSamplePath, '02 - Poxfil - Solid Ground (5 sec).mka');

      const {format, common} = await mm.parseFile(mkaPath, options);

      // format chunk information
      assert.strictEqual(format.container, 'EBML/matroska', 'format.container');
      assert.strictEqual(format.codec, 'AAC', 'format.codec');
      assert.approximately(format.duration, 221184 / 44100, 1 / 100000, 'format.duration');
      assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
      assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasVideo');

      verifyTrackSolidGround(common);
    }

    it('parse: "02 - Poxfil - Solid Ground (5 sec).mka"', () => {
      return parsePoxfile();
    });

    it('parse: "02 - Poxfil - Solid Ground (5 sec).mka" with `mkvUseIndex` flag', () => {
      return parsePoxfile({mkvUseIndex: true});
    });
  });

  describe('WebM', () => {

    it('parse: "big-buck-bunny_trailer-short.vp8.webm"', async () => {

      const webmPath = path.join(matroskaSamplePath, 'big-buck-bunny_trailer-short.vp8.webm');

      const {format, common} = await mm.parseFile(webmPath, {duration: false});

      // format chunk information
      assert.strictEqual(format.container, 'EBML/webm', 'format.container');
      assert.strictEqual(format.codec, 'VORBIS', 'format.codec');
      assert.approximately(format.duration, 7.143, 1 / 100000, 'format.duration');
      assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isTrue(format.hasVideo, 'format.hasVideo');

      // common metadata
      assert.strictEqual(common.title, 'Big Buck Bunny', 'common.title');
      assert.isDefined(common.picture, 'common.picture');
      assert.strictEqual(common.picture[0].format, 'image/jpeg', 'common.picture[0].format');
      assert.strictEqual(common.picture[0].description, 'Poster', 'common.picture[0].description');
      assert.strictEqual(common.picture[0].name, 'Big buck bunny poster.jpg', 'common.picture[0].name');
    });

    it('parse: "02 - Poxfil - Solid Ground (5 sec).opus.webm"', async () => {

      const webmPath = path.join(matroskaSamplePath, '02 - Poxfil - Solid Ground (5 sec).opus.webm');

      const {format, common} = await mm.parseFile(webmPath, {duration: false});

      // format chunk information
      assert.strictEqual(format.container, 'EBML/webm', 'format.container');
      assert.strictEqual(format.codec, 'OPUS', 'format.codec');
      assert.approximately(format.duration, 5.006509896, 1 / 100000, 'format.duration');
      assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasVideo');

      assert.strictEqual(common.title, 'Solid Ground', 'common.title');
      assert.strictEqual(common.artist, 'Poxfil', 'common.artist');
      assert.deepStrictEqual(common.track, {no: 2, of: 10}, 'common.track');
      assert.strictEqual(common.encodedby, 'Max 0.8b', 'common.encodersettings');
      assert.strictEqual(common.encodersettings, '--bitrate 96 --vbr', 'common.encodersettings');
    });

    it('should parse "My Baby Boy.webm"', async () => {

      const filePath = path.join(matroskaSamplePath, 'My Baby Boy.webm');

      const {format, common} = await mm.parseFile(filePath);
      assert.strictEqual(format.container, 'EBML/webm', 'format.container');
      assert.strictEqual(format.codec, 'OPUS', 'format.codec');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasVideo');

      assert.strictEqual(common.title, 'My Baby Boy', 'common.title');
      assert.strictEqual(common.artist, 'theAngelcy', 'common.artist');
      assert.strictEqual(common.albumartist, 'theAngelcy', 'common.albumartist');
      assert.deepStrictEqual(common.track, {no: 2, of: 13}, 'common.track');
      assert.deepStrictEqual(common.disk, {no: 1, of: 1}, 'common.disk');
      assert.deepStrictEqual(common.genre, ['Folk'], 'common.genre');
      assert.strictEqual(common.encodedby, 'opusenc from opus-tools 0.2', 'common.encodersettings');
      assert.strictEqual(common.encodersettings, '--bitrate 96 --vbr', 'common.encodersettings');
    });

    it('shoud ignore trailing null characters', async () => {
      const webmPath = path.join(matroskaSamplePath, 'fixture-null.webm');
      const {format} = await mm.parseFile(webmPath, {duration: false});
      assert.strictEqual(format.container, 'EBML/webm', 'format.container');
    });

  });

  // https://github.com/Borewit/music-metadata/issues/384
  describe('Multiple audio tracks', () => {

    async function parse(options?: mm.IOptions) {
      const mkvPath = path.join(matroskaSamplePath, 'matroska-test-w1-test5-short.mkv');

      const {format, common} = await mm.parseFile(mkvPath, options);

      assert.deepEqual(format.container, 'EBML/matroska', 'format.container');
      assert.deepEqual(format.tagTypes, [ 'matroska' ], 'format.tagTypes');

      assert.deepEqual(format.codec, 'AAC', 'format.codec');
      assert.approximately(format.duration, 3.417, 1 / 100000, 'format.duration');
      assert.strictEqual(format.sampleRate, 48000, 'format.sampleRate');
      assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');

      assert.deepEqual(common.title, 'Elephant Dreams', 'common.title');
      assert.deepEqual(common.album, 'Matroska Test Files - Wave 1', 'common.album');
    }

    it('parse: "matroska-test-w1-test5-short.mkv"', () => {
      return parse();
    });

    it('parse: "matroska-test-w1-test5-short.mkv `mkvUseIndex` flag', () => {
      return parse({mkvUseIndex: true});
    });

  });

  // https://www.matroska.org/technical/streaming.html
  // https://github.com/Borewit/music-metadata/issues/765
  describe('Parse Matroska Stream', () => {

    const mkvPath = path.join(matroskaSamplePath, 'stream.weba');

    it('Parse stream', async () => {
      const {format} = await mm.parseFile(mkvPath);
      assert.strictEqual(format.container, 'EBML/webm', 'format.container');
      assert.strictEqual(format.codec, 'OPUS', 'format.codec');
      assert.strictEqual(format.numberOfChannels, 1, 'format.numberOfChannels');
    });

    it('Parse stream with `mkvUseIndex` flag', async () => {
      const {format} = await mm.parseFile(mkvPath, {mkvUseIndex: true});
      assert.strictEqual(format.container, 'EBML/webm', 'format.container');
      assert.strictEqual(format.codec, 'OPUS', 'format.codec');
      assert.strictEqual(format.numberOfChannels, 1, 'format.numberOfChannels');
    });

  });

  describe('Handle corrupt Matroska file', () => {

    const mkvPath = path.join(matroskaSamplePath, 'corrupt.mkv');

    // Ensure similar issue (CVE-2022-36313) as found in file-type, does not occur here
    // https://nvd.nist.gov/vuln/detail/CVE-2022-36313
    it('Be able to hande CVE-2022-36313 sample', async () => {
      await expect(mm.parseFile(mkvPath)).to.be.rejectedWith(Error);
    });

  });

  // https://github.com/Borewit/music-metadata/issues/1463
  it('Handle Matroska file without duration', async () => {

    const filePath = path.join(matroskaSamplePath, 'no-duration.webm');
    const {format} = await mm.parseFile(filePath);
    assert.strictEqual(format.container, 'EBML/webm', 'format.container');
    assert.isUndefined(format.duration, 'format.duration');
  });

});
