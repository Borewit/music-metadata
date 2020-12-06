import { assert } from 'chai';
import * as mm from '../lib';
import * as path from 'path';
import { Parsers } from './metadata-parsers';

describe('Parse MP3 files', () => {

  const samplePath = path.join(__dirname, 'samples');
  const mp3SamplePath = path.join(samplePath, 'mp3');

  describe('Test patterns for ISO/MPEG ', () => {

    it('ISO/MPEG 1 Layer 1', async () => {

      // http://mpgedit.org/mpgedit/mpgedit/testdata/mpegdata.html#ISO_m1l1
      const samples = [
        {filename: 'fl1.mp1', bitRate: 384, sampleRate: 32000, channels: 2},
        {filename: 'fl2.mp1', bitRate: 384, sampleRate: 44100, channels: 2},
        {filename: 'fl3.mp1', bitRate: 384, sampleRate: 48000, channels: 2},
        {filename: 'fl4.mp1', bitRate: 32, sampleRate: 32000, channels: 1},
        {filename: 'fl5.mp1', bitRate: 448, sampleRate: 48000, channels: 2},
        {filename: 'fl6.mp1', bitRate: 384, sampleRate: 44100, channels: 2},
        {filename: 'fl7.mp1', bitRate: 384, sampleRate: 44100, channels: 2},
        {filename: 'fl8.mp1', bitRate: 384, sampleRate: 44100, channels: 2}
      ];

      for (const sample of samples) {
        const {format} = await mm.parseFile(path.join(mp3SamplePath, 'layer1', sample.filename), {duration: true});
        assert.strictEqual(format.container, 'MPEG', 'format.container');
        assert.strictEqual(format.codec, 'MPEG 1 Layer 1', `'${sample.filename}' format.codec`);
        assert.strictEqual(format.bitrate, sample.bitRate * 1000, `'${sample.filename}' format.bitrate`);
        assert.strictEqual(format.sampleRate, sample.sampleRate, `'${sample.filename}' format.sampleRate`);
        assert.strictEqual(format.numberOfChannels, sample.channels, `'${sample.filename}' format.channels`);
      }

    });

    it('ISO/MPEG 1 Layer 2', async () => {

      // http://mpgedit.org/mpgedit/mpgedit/testdata/mpegdata.html#ISO_m1l2
      const samples = [
        {filename: 'fl10.mp2', bitRate: 192, sampleRate: 32000, channels: 2},
        {filename: 'fl11.mp2', bitRate: 192, sampleRate: 44100, channels: 2},
        {filename: 'fl12.mp2', bitRate: 192, sampleRate: 48000, channels: 2},
        {filename: 'fl13.mp2', bitRate: 32, sampleRate: 32000, channels: 1},
        {filename: 'fl14.mp2', bitRate: 384, sampleRate: 48000, channels: 2},
        {filename: 'fl15.mp2', bitRate: 384, sampleRate: 48000, channels: 2},
        {filename: 'fl16.mp2', bitRate: 256, sampleRate: 48000, channels: 2}
      ];

      for (const sample of samples) {
        const {format} = await mm.parseFile(path.join(mp3SamplePath, 'layer2', sample.filename), {duration: true});
        assert.strictEqual(format.container, 'MPEG', 'format.container');
        assert.strictEqual(format.codec, 'MPEG 1 Layer 2', `'${sample.filename}' format.codec`);
        assert.strictEqual(format.bitrate, sample.bitRate * 1000, `'${sample.filename}' format.bitrate`);
        assert.strictEqual(format.sampleRate, sample.sampleRate, `'${sample.filename}' format.sampleRate`);
        assert.strictEqual(format.numberOfChannels, sample.channels, `'${sample.filename}' format.channels`);
      }

    });

    // http://mpgedit.org/mpgedit/mpgedit/testdata/mpegdata.html#ISO_m1l2
    it('ISO/MPEG 1 Layer 3', async () => {

      const samples = [
        {filename: 'compl.mp3', bitRate: 64, sampleRate: 48000, channels: 1},
        {filename: 'he_32khz.mp3', sampleRate: 32000, channels: 1},
        {filename: 'he_44khz.mp3', sampleRate: 44100, channels: 1},
        {filename: 'he_48khz.mp3', sampleRate: 48000, channels: 1},
        {filename: 'he_mode.mp3', sampleRate: 44100, channels: 1},
        {filename: 'hecommon.mp3', bitRate: 128, sampleRate: 44100, channels: 2},
        {filename: 'si.mp3', bitRate: 64, sampleRate: 44100, channels: 1},
        {filename: 'si.mp3', bitRate: 64, sampleRate: 44100, channels: 1},
        {filename: 'si_huff.mp3', bitRate: 64, sampleRate: 44100, channels: 1},
        {filename: 'sin1k0db.mp3', bitRate: 128, sampleRate: 44100, channels: 2}
      ];

      for (const sample of samples) {
        const {format} = await mm.parseFile(path.join(mp3SamplePath, 'layer3', sample.filename), {duration: true});
        assert.strictEqual(format.container, 'MPEG', 'format.container');
        assert.strictEqual(format.codec, 'MPEG 1 Layer 3', `'${sample.filename}' format.codec`);
        if (sample.bitRate) {
          assert.strictEqual(format.bitrate, sample.bitRate * 1000, `'${sample.filename}' format.bitrate`);
        }
        assert.strictEqual(format.sampleRate, sample.sampleRate, `'${sample.filename}' format.sampleRate`);
        assert.strictEqual(format.numberOfChannels, sample.channels, `'${sample.filename}' format.channels`);
      }

    });

  });

  it('should handle audio-frame-header-bug', function() {

    this.timeout(15000); // It takes a long time to parse

    const filePath = path.join(samplePath, 'audio-frame-header-bug.mp3');

    return mm.parseFile(filePath, {duration: true}).then(result => {
      // FooBar: 3:20.556 (8.844.527 samples); 44100 Hz => 200.5561678004535 seconds
      // t.strictEqual(result.format.duration, 200.59591666666665); // previous
      // t.strictEqual(result.format.duration, 200.5561678004535); // FooBar

      // If MPEG Layer II is accepted, it will give back third frame with a different frame length;
      // therefore it start counting actual parsable frames ending up on ~66.86
      assert.approximately(result.format.duration, 200.5, 1 / 10);
    });
  });

  it('should be able to parse: Sleep Away.mp3', function() {

    this.timeout(15000); // Parsing this file can take a bit longer

    const filePath = path.join(mp3SamplePath, 'Sleep Away.mp3');

    return mm.parseFile(filePath, {duration: true}).then(metadata => {
      const {format, common} = metadata;

      assert.deepEqual(format.container, 'MPEG', 'format.container');
      assert.deepEqual(format.codec, 'MPEG 1 Layer 3', 'format.codec');
      assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
      assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');

      assert.strictEqual(common.title, 'Sleep Away');
      assert.strictEqual(common.artist, 'Bob Acri');
      assert.deepEqual(common.composer, ['Robert R. Acri']);
      assert.deepEqual(common.genre, ['Jazz']);

      assert.strictEqual(common.picture.length, 1, 'should contain the cover');
      const picture = common.picture[0];
      assert.strictEqual(picture.description, 'thumbnail');
      assert.strictEqual(picture.format, 'image/jpeg');
      assert.strictEqual(picture.data.length, 27852);
    });
  });

  // https://github.com/Borewit/music-metadata/issues/381
  it('should be able to handle empty ID3v2 tag', async () => {

    const filePath = path.join(mp3SamplePath, 'issue-381.mp3');

    const {format} = await mm.parseFile(filePath);

    assert.deepEqual(format.container, 'MPEG', 'format.container');
    assert.deepEqual(format.tagTypes, ['ID3v2.3', 'ID3v1'], 'format.tagTypes');
  });

  // https://github.com/Borewit/music-metadata/issues/398
  it('Handle empty picture tag', async () => {

    const filePath = path.join(samplePath, 'mp3', 'empty-picture-tag.mp3');

    const {format, common, quality} = await mm.parseFile(filePath);
    assert.strictEqual(format.container, 'MPEG', 'format.container');
    assert.strictEqual(format.codec, 'MPEG 1 Layer 3', 'format.codec');
    assert.strictEqual(common.title, 'Frankie And Johnny', 'common.title');
    assert.strictEqual(common.artist, 'Sam Cooke', 'common.artist');
    assert.strictEqual(common.album, 'Greatest Hits', 'common.album,');
    assert.deepEqual(common.track, {no: 21, of: null}, 'common.track,');
    assert.deepEqual(common.year, 1998, 'common.year,');
    assert.isUndefined(common.picture, 'common.picturh');
    assert.includeDeepMembers(quality.warnings, [{message: 'Empty picture tag found'}], 'quality.warnings includes Empty picture tag found');
  });

  // https://github.com/Borewit/music-metadata/issues/430
  it('Handle preceeding ADTS frame with (invalid) frame length of 0 bytes', async () => {

    const filePath = path.join(samplePath, 'mp3', 'adts-0-frame.mp3');

    const {format, common} = await mm.parseFile(filePath, {duration: true});

    await mm.parseFile(filePath);

    assert.strictEqual(format.container, 'MPEG', 'format.container');
    assert.strictEqual(format.codec, 'MPEG 1 Layer 3', 'format.codec');
    assert.strictEqual(format.codecProfile, 'V2', 'format.codecProfile');
    assert.strictEqual(format.tool, 'LAME3.97b', 'format.tool');
    assert.deepEqual(format.tagTypes, ['ID3v2.3', 'ID3v1'], 'format.tagTypes');

    assert.strictEqual(common.title, 'Jan Pillemann Otze', 'common.title');
    assert.strictEqual(common.artist, 'Mickie Krause', 'common.artist');
    assert.approximately(format.duration, 217.86, 0.005, 'format.duration');
  });

  it('Able to handle corrupt LAME header', async () => {

    const filePath = path.join(samplePath, 'mp3', 'issue-554.mp3');

    const {format, quality} = await mm.parseFile(filePath, {duration: true});

    assert.strictEqual(format.container, 'MPEG', 'format.container');
    assert.strictEqual(format.codec, 'MPEG 2 Layer 3', 'format.codec');
    assert.approximately(format.duration, 817.92, 1 / 200, 'format.duration');
    assert.strictEqual(format.sampleRate, 22050, 'format.sampleRate');

    assert.includeDeepMembers(quality.warnings, [{message: 'Corrupt LAME header'}], 'quality.warnings includes: \'Corrupt LAME header\'');
  });

  describe('should handle incomplete MP3 file', () => {

    const filePath = path.join(samplePath, 'incomplete.mp3');

    function checkFormat(format: mm.IFormat) {
      assert.deepEqual(format.tagTypes, ['ID3v2.3', 'ID3v1'], 'format.tagTypes');
      assert.approximately(format.duration, 61.73, 1 / 100, 'format.duration');
      assert.strictEqual(format.container, 'MPEG', 'format.container');
      assert.strictEqual(format.codec, 'MPEG 2 Layer 3', 'format.codec');
      assert.strictEqual(format.lossless, false, 'format.lossless');
      assert.strictEqual(format.sampleRate, 22050, 'format.sampleRate = 44.1 kHz');
      assert.strictEqual(format.bitrate, 64000, 'format.bitrate = 128 kbit/sec');
      assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
    }

    it('should decode from a file', async () => {
      const metadata = await mm.parseFile(filePath);
      checkFormat(metadata.format);
    });
  });

  describe('Duration flag behaviour', () => {

    describe('MP3/CBR without Xing header', () => {

      const filePath = path.join(samplePath, 'mp3', 'Sleep Away.mp3');

      describe('duration=false', () => {

        Parsers
          .forEach(parser => {
            it(parser.description, async () => {
              const metadata = await parser.initParser(filePath, 'audio/mpeg', {duration: false});
              assert.isUndefined(metadata.format.duration, 'Don\'t expect a duration');
            });
          });
      });

      describe('duration=true', function() {

        this.timeout(15000); // Parsing this file can take a bit longer

        Parsers
          .forEach(parser => {
            it(parser.description, async () => {
              const metadata = await parser.initParser(filePath, 'audio/mpeg', {duration: true});
              assert.approximately(metadata.format.duration, 200.5, 1 / 10, 'Expect a duration');
            });
          });
      });

    });

  });

  describe('MP3 with APEv2 footer header', () => {

    it('should be able to parse APEv2 header', async () => {

      const filePath = path.join(samplePath, 'issue_56.mp3');

      const metadata = await mm.parseFile(filePath);
      assert.strictEqual(metadata.format.container, 'MPEG');
      assert.deepEqual(metadata.format.tagTypes, ['ID3v2.3', 'APEv2', 'ID3v1']);
    });

    it('should be able to parse APEv1 header"', async () => {

      const filePath = path.join(samplePath, 'mp3', 'issue-362.apev1.mp3');

      const {format, common} = await mm.parseFile(filePath, {duration: true});

      assert.deepEqual(format.container, 'MPEG', 'format.container');

      assert.deepEqual(format.tagTypes, ['ID3v2.3', 'APEv2', 'ID3v1'], 'format.tagTypes');

      assert.strictEqual(common.title, 'Do They Know It\'s Christmas?', 'common.artist');
      assert.strictEqual(common.artist, 'Band Aid', 'common.artist');
      assert.deepEqual(common.artists, ['Band Aid'], 'common.artists');
      assert.strictEqual(common.album, 'Now That\'s What I Call Xmas', 'common.album');
      assert.strictEqual(common.year, 2006, 'common.year');
      assert.deepEqual(common.comment, ['TunNORM', ' 0000080E 00000AA9 00002328 000034F4 0002BF65 0002BF4E 000060AC 0000668F 0002BF4E 00033467'], 'common.comment');
      assert.deepEqual(common.genre, ['General Holiday'], 'common.genre');
      assert.deepEqual(common.track.no, 2, 'common.track.no');
    });

    it('should be able to parse APEv2 header followed by a Lyrics3v2 header', async () => {

      const filePath = path.join(samplePath, 'mp3', 'APEv2+Lyrics3v2.mp3');

      const metadata = await mm.parseFile(filePath);
      assert.strictEqual(metadata.format.container, 'MPEG');
      assert.deepEqual(metadata.format.tagTypes, ['ID3v2.3', 'APEv2', 'ID3v1']);

      const ape = mm.orderTags(metadata.native.APEv2);
      assert.deepEqual(ape.MP3GAIN_MINMAX, ['131,189']);
      assert.deepEqual(ape.REPLAYGAIN_TRACK_GAIN, ['+0.540000 dB']);
      assert.deepEqual(ape.REPLAYGAIN_TRACK_PEAK, ['0.497886']);
      assert.deepEqual(ape.MP3GAIN_UNDO, ['+004,+004,N']);
    });

  });

  describe('Handle Xing header', () => {

    it('Handle Xing header, without LAME extension', async () => {

      const filePath = path.join(mp3SamplePath, 'Solace.mp3');
      const {format, common} = await mm.parseFile(filePath, {duration: true});
      assert.strictEqual(format.container, 'MPEG', 'format.container');
      assert.strictEqual(format.codec, 'MPEG 1 Layer 3', 'format.codec');
      assert.deepEqual(format.tagTypes, ['ID3v2.3', 'ID3v1'], 'format.tagTypes');
    });

  });

});
