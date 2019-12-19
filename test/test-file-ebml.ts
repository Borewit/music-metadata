import * as path from 'path';
import * as mm from '../lib';
import { assert } from 'chai';

describe('EBML based formats', () => {

  function verifyTrackSolidGround(common: mm.ICommonTagsResult) {
    // Common mapped EBML tags
    assert.strictEqual(common.title, 'Solid Ground', 'common.title');
    assert.strictEqual(common.artist, 'Poxfil', 'common.artist');
    assert.strictEqual(common.artistsort, 'Poxfil', 'common.artistsort');
    assert.deepEqual(common.label, ['blocSonic'], 'common.label');
    assert.strictEqual(common.musicbrainz_albumid, 'abf39f57-0b01-4b51-9c1e-b21e8ada5091', 'common.musicbrainz_albumid');
    assert.deepEqual(common.musicbrainz_artistid, ['ee315b01-df5e-451e-8cd6-90a9f1faaf51'], 'common.musicbrainz_artistid');
    assert.strictEqual(common.musicbrainz_recordingid, '209dbf50-509d-4ac3-aec5-e96da99dfdd9', 'common.musicbrainz_recordingid');
  }

  describe('Matroska', () => {

    const ebmlSamplePath = path.join(__dirname, 'samples', 'ebml');

    it('parse: "alac-in-matroska-short.mka"', async () => {

      const dsfFilePath = path.join(ebmlSamplePath, 'alac-in-matroska-short.mka');

      const {format} = await mm.parseFile(dsfFilePath, {duration: false});

      // format chunk information
      assert.strictEqual(format.container, 'EBML/matroska', 'format.container');
      assert.strictEqual(format.codec, 'ALAC', 'format.codec');
      assert.approximately(format.duration, 196608 / 41000, 1 / 100000, 'format.duration');
      assert.strictEqual(format.sampleRate, 41000, 'format.sampleRate');
      assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
    });

    it('parse: "02 - Poxfil - Solid Ground (5 sec).mka"', async () => {

      const dsfFilePath = path.join(ebmlSamplePath, '02 - Poxfil - Solid Ground (5 sec).mka');

      const {format, common} = await mm.parseFile(dsfFilePath, {duration: false});

      // format chunk information
      assert.strictEqual(format.container, 'EBML/matroska', 'format.container');
      assert.strictEqual(format.codec, 'AAC', 'format.codec');
      assert.approximately(format.duration, 221184 / 44100, 1 / 100000, 'format.duration');
      assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
      assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');

      verifyTrackSolidGround(common);
    });
  });

  describe('WebM', () => {

    const matroskaSamplePath = path.join(__dirname, 'samples', 'ebml');

    it('parse: "big-buck-bunny_trailer-short.vp8.webm"', async () => {

      const dsfFilePath = path.join(matroskaSamplePath, 'big-buck-bunny_trailer-short.vp8.webm');

      const {format} = await mm.parseFile(dsfFilePath, {duration: false});

      // format chunk information
      assert.strictEqual(format.container, 'EBML/webm', 'format.container');
      assert.strictEqual(format.codec, 'VORBIS', 'format.codec');
      assert.approximately(format.duration, 7.143, 1 / 100000, 'format.duration');
      assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
    });

    it('parse: "02 - Poxfil - Solid Ground (5 sec).opus.webm"', async () => {

      const dsfFilePath = path.join(matroskaSamplePath, '02 - Poxfil - Solid Ground (5 sec).opus.webm');

      const {format} = await mm.parseFile(dsfFilePath, {duration: false});

      // format chunk information
      assert.strictEqual(format.container, 'EBML/webm', 'format.container');
      assert.strictEqual(format.codec, 'OPUS', 'format.codec');
      assert.approximately(format.duration, 5.006509896, 1 / 100000, 'format.duration');
      assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
    });
  });

  describe('WebM', () => {

    const matroskaSamplePath = path.join(__dirname, 'samples', 'ebml');

    it('parse: "big-buck-bunny_trailer-short.vp8.webm"', async () => {

      const dsfFilePath = path.join(matroskaSamplePath, 'big-buck-bunny_trailer-short.vp8.webm');

      const {format} = await mm.parseFile(dsfFilePath, {duration: false});

      // format chunk information
      assert.strictEqual(format.container, 'EBML/webm', 'format.container');
      assert.strictEqual(format.codec, 'VORBIS', 'format.codec');
      assert.approximately(format.duration, 7.143, 1 / 100000, 'format.duration');
      assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
    });

    it('parse: "big-buck-bunny_trailer-short.vp8.webm"', async () => {

      const dsfFilePath = path.join(matroskaSamplePath, 'big-buck-bunny_trailer-short.vp8.webm');

      const {format} = await mm.parseFile(dsfFilePath, {duration: false});

      // format chunk information
      assert.strictEqual(format.container, 'EBML/webm', 'format.container');
      assert.strictEqual(format.codec, 'VORBIS', 'format.codec');
      assert.approximately(format.duration, 7.143, 1 / 100000, 'format.duration');
      assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
    });
  });

});
