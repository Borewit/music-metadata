import {assert} from 'chai';
import path from 'node:path';

import * as mm from '../lib/index.js';
import { samplePath } from './util.js';

describe("Decode MP3/ID3v2.4", () => {

  it("should decode id3v2.4", () => {

    const filename = 'id3v2.4.mp3';
    const filePath = path.join(samplePath, filename);

    return mm.parseFile(filePath, {duration: true}).then(metadata => {
      assert.deepEqual(metadata.format.tagTypes, ["ID3v2.4", "ID3v1"], 'format.tagTypes');
      assert.strictEqual(metadata.format.duration, 0.7836734693877551, 'format.format.duration');
      assert.strictEqual(metadata.format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
      assert.strictEqual(metadata.format.bitrate, 128000, 'format.bitrate = 128 kbit/sec');
      assert.strictEqual(metadata.format.codecProfile, 'CBR', 'format.codecProfile = CBR');
      assert.strictEqual(metadata.format.container, 'MPEG', 'format.container');
      assert.strictEqual(metadata.format.codec, 'MPEG 1 Layer 3', 'format.codec');
      assert.strictEqual(metadata.format.tool, 'LAME 3.98r', 'format.tool');
      assert.strictEqual(metadata.format.numberOfChannels, 2, 'format.numberOfChannels = 2');

      assert.strictEqual(metadata.common.title, 'Home', 'title');
      assert.strictEqual(metadata.common.artist, 'Explo', 'common.artist');
      assert.deepEqual(metadata.common.artists, ['Explo', 'ions', 'nodejsftws'], 'common.artists');
      assert.strictEqual(metadata.common.albumartist, 'Soundtrack', 'albumartist');
      assert.strictEqual(metadata.common.album, 'Friday Night Lights [Original Movie Soundtrack]', 'album');
      assert.strictEqual(metadata.common.year, 2004, 'year');
      assert.deepEqual(metadata.common.track, {no: 5, of: null}, 'common.track');
      assert.deepEqual(metadata.common.disk, {no: 1, of: 1}, 'common.disk');
      assert.deepEqual(metadata.common.genre, ['Soundtrack', 'OST'], 'common.genres');
      assert.strictEqual(metadata.common.picture[0].format, 'image/jpeg', 'common.picture 0 format');
      assert.strictEqual(metadata.common.picture[0].data.length, 80938, 'common.picture 0 length');
      assert.strictEqual(metadata.common.picture[1].format, 'image/jpeg', 'common.picture 1 format');
      assert.strictEqual(metadata.common.picture[1].data.length, 80938, 'common.picture 1 length');
    });

  });

  // Issue: https://github.com/Borewit/music-metadata/issues/502
  it('COMM mapping', async () => {

    const filePath = path.join(samplePath, 'mp3', 'issue-502.mp3');
    const {common} = await mm.parseFile(filePath);
    assert.deepEqual(common.comment, ['CLEAN'], 'common.comment');
  });

  it("should respect skipCovers-flag", () => {

    const filename = 'id3v2.4.mp3';
    const filePath = path.join(samplePath, filename);

    return mm.parseFile(filePath, {duration: true, skipCovers: true}).then(result => {
      assert.isUndefined(result.common.picture, 'common.picture should be undefined');
    });

  });

  it("Map TXXX:ISRC", async () => {

    const filename = 'issue-802.mp3';
    const filePath = path.join(samplePath, 'mp3', filename);

    const {common, native} = await mm.parseFile(filePath);
    const id3v24 = native['ID3v2.4'];
    assert.isDefined(id3v24, 'ID3v2.4 presence');
    assert.strictEqual(id3v24.filter(tag => { return tag.id === 'TSRC'; }).length, 0, 'ID3v2.4 tag TSRC not defined');
    assert.strictEqual(id3v24.filter(tag => { return tag.id === 'TXXX:ISRC'; }).length, 1, 'ID3v2.4 tag TXXX:ISRC to be defined');
    assert.includeDeepMembers(common.isrc, ['DEAE61300058'], 'ISRC');
  });

  // https://id3.org/id3v2.4.0-frame
  it('4.8. Unsynchronised lyrics/text transcription', async () => {
    const {common, native} = await mm.parseFile(path.join(samplePath, 'MusicBrainz - Beth Hart - Sinner\'s Prayer [id3v2.4].V2.mp3'));
    const lyrics =  "Lord, have mercy, Lord, have mercy on me\nLord, have mercy, Lord, have mercy on me\n" +
        "Well, if I've done somebody wrong\nLord, have mercy if you please\n\n" +
        "I used to have plenty of money\nThe finest clothes in town\n" +
        "Bad luck and trouble overtook me\nAnd God, look at me now\n\n" +
        "Please have mercy, Lord, have mercy on me\nAnd if I've done somebody wrong\nLord, have mercy if you please\n\n" +
        "Keep on working, my child\nOh, in the morning, oh\nLord, have mercy\n\nIf I've been a bad girl, baby\nYeah, I'll change my ways\n" +
        "Don't want bad luck and trouble\nOn me all my days\n\n" +
        "Please have mercy, Lord, have mercy on me\nAnd if I've done somebody wrong\nLord, have mercy if you please\n" +
        "Have mercy on me";

    // Check native IDv2.4 tag
    const id3v23 = mm.orderTags(native['ID3v2.4']);
    assert.isDefined(id3v23.USLT, 'Should contain ID3v2.4 USLT tag');
    assert.deepEqual(id3v23.USLT[0], {
      description: "Sinner's Prayer",
      language: "eng",
      text: lyrics
    });

    // Check mapping to common IDv2.3 tag
    assert.isDefined(common.lyrics, 'Should map tag id3v23.USLT to common.lyrics');
    assert.strictEqual(common.lyrics[0], lyrics);
  });

});
