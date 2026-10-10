import path from 'node:path';
import { assert, expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as mm from '../lib/index.js';
import { samplePath } from './util.js';

use(chaiAsPromised);

describe('Matroska formats', () => {
  const matroskaSamplePath = path.join(samplePath, 'matroska');

  function verifyTrackSolidGround(common: mm.ICommonTagsResult) {
    // Common mapped EBML tags
    assert.strictEqual(common.title, 'Solid Ground', 'common.title');
    assert.strictEqual(common.artist, 'Poxfil', 'common.artist');
    assert.strictEqual(common.artistsort, 'Poxfil', 'common.artistsort');
    assert.deepEqual(common.label, ['blocSonic'], 'common.label');
    assert.strictEqual(
      common.musicbrainz_albumid,
      'abf39f57-0b01-4b51-9c1e-b21e8ada5091',
      'common.musicbrainz_albumid'
    );
    assert.deepEqual(
      common.musicbrainz_artistid,
      ['ee315b01-df5e-451e-8cd6-90a9f1faaf51'],
      'common.musicbrainz_artistid'
    );
    assert.strictEqual(
      common.musicbrainz_recordingid,
      '209dbf50-509d-4ac3-aec5-e96da99dfdd9',
      'common.musicbrainz_recordingid'
    );
    assert.deepEqual(common.track, { no: 2, of: 10 }, 'common.track');
  }

  describe('Matroska audio (.mka)', () => {
    it('parse: "alac-in-matroska-short.mka"', async () => {
      const mkaPath = path.join(matroskaSamplePath, 'alac-in-matroska-short.mka');

      const { format } = await mm.parseFile(mkaPath, { duration: false });

      // format chunk information
      assert.strictEqual(format.container, 'EBML/matroska', 'format.container');
      assert.strictEqual(format.codec, 'ALAC', 'format.codec');
      assert.approximately(format.duration!, 196608 / 41000, 1 / 100000, 'format.duration');
      assert.strictEqual(format.sampleRate, 41000, 'format.sampleRate');
      assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasVideo');
    });

    async function parsePoxfile(options?: mm.IOptions) {
      const mkaPath = path.join(matroskaSamplePath, '02 - Poxfil - Solid Ground (5 sec).mka');

      const { format, common } = await mm.parseFile(mkaPath, options);

      // format chunk information
      assert.strictEqual(format.container, 'EBML/matroska', 'format.container');
      assert.strictEqual(format.codec, 'AAC', 'format.codec');
      assert.approximately(format.duration!, 221184 / 44100, 1 / 100000, 'format.duration');
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
      return parsePoxfile({ mkvUseIndex: true });
    });
  });

  describe('WebM', () => {
    it('parse: "big-buck-bunny_trailer-short.vp8.webm"', async () => {
      const webmPath = path.join(matroskaSamplePath, 'big-buck-bunny_trailer-short.vp8.webm');

      const { format, common } = await mm.parseFile(webmPath, { duration: false });

      // format chunk information
      assert.strictEqual(format.container, 'EBML/webm', 'format.container');
      assert.strictEqual(format.codec, 'VORBIS', 'format.codec');
      assert.approximately(format.duration!, 7.143, 1 / 100000, 'format.duration');
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

      const { format, common } = await mm.parseFile(webmPath, { duration: false });

      // format chunk information
      assert.strictEqual(format.container, 'EBML/webm', 'format.container');
      assert.strictEqual(format.codec, 'OPUS', 'format.codec');
      assert.approximately(format.duration!, 5.006509896, 1 / 100000, 'format.duration');
      assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasVideo');

      assert.strictEqual(common.title, 'Solid Ground', 'common.title');
      assert.strictEqual(common.artist, 'Poxfil', 'common.artist');
      assert.deepStrictEqual(common.track, { no: 2, of: 10 }, 'common.track');
      assert.strictEqual(common.encodedby, 'Max 0.8b', 'common.encodersettings');
      assert.strictEqual(common.encodersettings, '--bitrate 96 --vbr', 'common.encodersettings');
    });

    it('should parse "My Baby Boy.webm"', async () => {
      const filePath = path.join(matroskaSamplePath, 'My Baby Boy.webm');

      const { format, common } = await mm.parseFile(filePath);
      assert.strictEqual(format.container, 'EBML/webm', 'format.container');
      assert.strictEqual(format.codec, 'OPUS', 'format.codec');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasVideo');

      assert.strictEqual(common.title, 'My Baby Boy', 'common.title');
      assert.strictEqual(common.artist, 'theAngelcy', 'common.artist');
      assert.strictEqual(common.albumartist, 'theAngelcy', 'common.albumartist');
      assert.deepStrictEqual(common.track, { no: 2, of: 13 }, 'common.track');
      assert.deepStrictEqual(common.disk, { no: 1, of: 1 }, 'common.disk');
      assert.deepStrictEqual(common.genre, ['Folk'], 'common.genre');
      assert.strictEqual(common.encodedby, 'opusenc from opus-tools 0.2', 'common.encodersettings');
      assert.strictEqual(common.encodersettings, '--bitrate 96 --vbr', 'common.encodersettings');
    });

    it('shoud ignore trailing null characters', async () => {
      const webmPath = path.join(matroskaSamplePath, 'fixture-null.webm');
      const { format } = await mm.parseFile(webmPath, { duration: false });
      assert.strictEqual(format.container, 'EBML/webm', 'format.container');
    });
  });

  // https://github.com/Borewit/music-metadata/issues/384
  describe('Multiple audio tracks', () => {
    async function parse(options?: mm.IOptions) {
      const mkvPath = path.join(matroskaSamplePath, 'matroska-test-w1-test5-short.mkv');

      const { format, common } = await mm.parseFile(mkvPath, options);

      assert.deepEqual(format.container, 'EBML/matroska', 'format.container');
      assert.deepEqual(format.tagTypes, ['matroska'], 'format.tagTypes');

      assert.deepEqual(format.codec, 'AAC', 'format.codec');
      assert.approximately(format.duration!, 3.417, 1 / 100000, 'format.duration');
      assert.strictEqual(format.sampleRate, 48000, 'format.sampleRate');
      assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');

      assert.deepEqual(common.title, 'Elephant Dreams', 'common.title');
      assert.deepEqual(common.album, 'Matroska Test Files - Wave 1', 'common.album');
    }

    it('parse: "matroska-test-w1-test5-short.mkv"', () => {
      return parse();
    });

    it('parse: "matroska-test-w1-test5-short.mkv `mkvUseIndex` flag', () => {
      return parse({ mkvUseIndex: true });
    });
  });

  // https://www.matroska.org/technical/streaming.html
  // https://github.com/Borewit/music-metadata/issues/765
  describe('Parse Matroska Stream', () => {
    const mkvPath = path.join(matroskaSamplePath, 'stream.weba');

    it('Parse stream', async () => {
      const { format } = await mm.parseFile(mkvPath);
      assert.strictEqual(format.container, 'EBML/webm', 'format.container');
      assert.strictEqual(format.codec, 'OPUS', 'format.codec');
      assert.strictEqual(format.numberOfChannels, 1, 'format.numberOfChannels');
    });

    it('Parse stream with `mkvUseIndex` flag', async () => {
      const { format } = await mm.parseFile(mkvPath, { mkvUseIndex: true });
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
    const { format } = await mm.parseFile(filePath);
    assert.strictEqual(format.container, 'EBML/webm', 'format.container');
    assert.isUndefined(format.duration, 'format.duration');
  });
});

describe('Matroska track defaults and selection', () => {
  function element(id: string, ...data: Uint8Array[]): Uint8Array {
    const payload = Buffer.concat(data);
    const size = new Uint8Array(2);
    new DataView(size.buffer).setUint16(0, 0x4000 | payload.length);
    return Buffer.concat([Buffer.from(id, 'hex'), size, payload]);
  }

  function uint(id: string, value: number): Uint8Array {
    return element(id, Uint8Array.from([value]));
  }

  function float(id: string, value: number): Uint8Array {
    const data = new Uint8Array(8);
    new DataView(data.buffer).setFloat64(0, value);
    return element(id, data);
  }

  function text(id: string, value: string): Uint8Array {
    return element(id, new TextEncoder().encode(value));
  }

  function track(id: number, type: mm.TrackType, ...properties: Uint8Array[]): Uint8Array {
    return element(
      'ae',
      uint('d7', id),
      uint('83', type),
      text('86', type === mm.TrackType.audio ? 'A_AAC' : type === mm.TrackType.video ? 'V_VP9' : 'S_TEXT/UTF8'),
      ...properties
    );
  }

  async function parse(...tracks: Uint8Array[]): Promise<mm.IFormat> {
    const header = element('1a45dfa3', text('4282', 'matroska'));
    const segment = element('18538067', element('1654ae6b', ...tracks));
    return (await mm.parseBuffer(Buffer.concat([header, segment]), { mimeType: 'video/x-matroska' })).format;
  }

  function statistics(uid: Uint8Array, tags: Record<string, string>): Uint8Array {
    return element(
      '7373',
      element('63c0', element('63c5', uid)),
      ...Object.entries(tags).map(([name, value]) => element('67c8', text('45a3', name), text('4487', value)))
    );
  }

  async function parseElements(...children: Uint8Array[]): Promise<mm.IFormat> {
    const data = Buffer.concat([element('1a45dfa3', text('4282', 'matroska')), element('18538067', ...children)]);
    return (await mm.parseBuffer(data, { mimeType: 'video/x-matroska' })).format;
  }

  for (const tagsFirst of [true, false]) {
    it(`matches per-track statistics by full UID (tags first=${tagsFirst})`, async () => {
      const uid = Buffer.from('fedcba9876543210', 'hex');
      const tracks = element(
        '1654ae6b',
        track(1, mm.TrackType.video, element('73c5', uid), element('e0', uint('b0', 160), uint('ba', 90))),
        track(2, mm.TrackType.audio, element('73c5', Uint8Array.from([2])), element('e1'))
      );
      const tags = element(
        '1254c367',
        statistics(uid, { DURATION: '00:00:02.000', BPS: '800000', NUMBER_OF_FRAMES: '50' }),
        statistics(Uint8Array.from([0, 2]), {
          DURATION: '00:00:01.500',
          NUMBER_OF_BYTES: '12000',
          NUMBER_OF_FRAMES: '20'
        })
      );
      const info = element('1549a966', float('4489', 3000));
      const format = await parseElements(info, ...(tagsFirst ? [tags, tracks] : [tracks, tags]));
      assert.include(format.trackInfo[0], { duration: 2, bitrate: 800000 });
      assert.strictEqual(format.trackInfo[0].video.frameRate, 25);
      assert.include(format.trackInfo[1], { duration: 1.5, bitrate: 64000 });
      assert.isUndefined(format.trackInfo[1].audio.numberOfSamples);
      assert.strictEqual(format.containerDuration, 3);
      assert.isNumber(format.overallBitrate);
    });
  }

  it('ignores invalid statistics and leaves absent track timing unknown', async () => {
    const format = await parseElements(
      element(
        '1654ae6b',
        track(1, mm.TrackType.video, uint('73c5', 1), element('e0')),
        track(2, mm.TrackType.audio, uint('73c5', 2), element('e1'))
      ),
      element(
        '1254c367',
        statistics(Uint8Array.from([1]), {
          DURATION: '00:99:01',
          BPS: '-1',
          NUMBER_OF_BYTES: '9007199254740992',
          NUMBER_OF_FRAMES: 'NaN'
        })
      )
    );
    for (const track of format.trackInfo) {
      assert.isUndefined(track.duration);
      assert.isUndefined(track.bitrate);
    }
    assert.isUndefined(format.overallBitrate);
  });

  it('ignores statistics targeting all tracks or an unknown track UID', async () => {
    const format = await parseElements(
      element('1654ae6b', track(1, mm.TrackType.video, uint('73c5', 1), element('e0'))),
      element(
        '1254c367',
        statistics(Uint8Array.from([0, 0]), { DURATION: '00:00:02.000', BPS: '800000' }),
        statistics(Uint8Array.from([2]), { DURATION: '00:00:03.000', BPS: '900000' })
      )
    );
    assert.lengthOf(format.trackInfo, 1);
    assert.isUndefined(format.trackInfo[0].duration);
    assert.isUndefined(format.trackInfo[0].bitrate);
    assert.isUndefined(format.containerDuration);
    assert.isUndefined(format.overallBitrate);
  });

  it('merges separate statistics tags for the same UID without overriding default frame rate', async () => {
    const uid = Uint8Array.from([1]);
    const duration = new Uint8Array(4);
    new DataView(duration.buffer).setUint32(0, 40000000);
    const format = await parseElements(
      element(
        '1654ae6b',
        track(1, mm.TrackType.video, element('73c5', uid), element('23e383', duration), element('e0'))
      ),
      element(
        '1254c367',
        statistics(uid, { duration: '00:00:02.000' }),
        statistics(uid, { number_of_bytes: '200000', number_of_frames: '60' })
      )
    );
    assert.include(format.trackInfo[0], { duration: 2, bitrate: 800000 });
    assert.strictEqual(format.trackInfo[0].video.frameRate, 25);
    assert.strictEqual(format.containerDuration, 2);
  });

  it('applies audio defaults when optional elements are absent', async () => {
    const format = await parse(track(1, mm.TrackType.audio, element('e1')));
    assert.lengthOf(format.trackInfo, 1);
    assert.include(format.trackInfo[0], {
      id: 1,
      type: mm.TrackType.audio,
      language: 'eng',
      flagEnabled: true,
      flagDefault: true,
      flagLacing: true,
      flagForced: false
    });
    assert.deepEqual(format.trackInfo[0].audio, { samplingFrequency: 8000, channels: 1 });
    assert.strictEqual(format.sampleRate, 8000);
    assert.strictEqual(format.numberOfChannels, 1);
  });

  it('prefers IETF language tags and retains forced subtitle flags', async () => {
    const format = await parse(
      track(3, mm.TrackType.subtitle, text('22b59c', 'eng'), text('22b59d', 'en-GB'), uint('55aa', 1), uint('88', 0))
    );
    assert.include(format.trackInfo[0], {
      type: mm.TrackType.subtitle,
      language: 'en-GB',
      flagForced: true,
      flagDefault: false
    });
    assert.isUndefined(format.trackInfo[0].audio);
    assert.isFalse(format.hasAudio);
  });

  it('prefers enabled default audio over a lower-numbered non-default track', async () => {
    const format = await parse(
      track(
        5,
        mm.TrackType.audio,
        element('e1', float('b5', 22050), float('78b5', 48000), uint('9f', 3), uint('6264', 24))
      ),
      track(1, mm.TrackType.audio, uint('88', 0), element('e1', uint('9f', 2))),
      track(2, mm.TrackType.audio, uint('b9', 0), element('e1', uint('9f', 6)))
    );
    assert.lengthOf(format.trackInfo, 3);
    assert.strictEqual(format.sampleRate, 48000);
    assert.strictEqual(format.numberOfChannels, 3);
    assert.strictEqual(format.bitsPerSample, 24);
    assert.deepEqual(format.trackInfo[0].audio, {
      samplingFrequency: 22050,
      outputSamplingFrequency: 48000,
      channels: 3,
      bitDepth: 24
    });
    assert.isFalse(format.trackInfo[1].flagDefault);
    assert.isFalse(format.trackInfo[2].flagEnabled);
  });
});
