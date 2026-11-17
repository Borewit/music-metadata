import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { EndOfStreamError, fromBuffer, fromStream } from 'strtok3';
import { assert, expect } from 'vitest';
import { EbmlIterator, getElementPath, ParseAction } from '../lib/ebml/EbmlIterator.js';
import type { IElementType } from '../lib/ebml/types.js';
import * as mm from '../lib/index.js';
import { parseBuffer, parseFromTokenizer } from '../lib/index.js';
import { matroskaDtd } from '../lib/matroska/MatroskaDtd.js';
import type { IDecodedAttachedFile, IDecodedTrackEntry } from '../lib/matroska/types.js';
import { Parsers } from './helpers/metadata-parsers.js';
import { samplePath } from './helpers/util.js';

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

  describe('Track defaults and selection', () => {
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
      await expect(mm.parseFile(mkvPath)).rejects.toThrowError(Error);
    });
  });

  // https://github.com/Borewit/music-metadata/issues/1463
  describe('physical EOF while skipping a final cluster', () => {
    const filePath = path.join(matroskaSamplePath, 'no-duration.webm');
    for (const mkvUseIndex of [false, true]) {
      for (const parser of Parsers) {
        it(`recovers duration consistently across inputs (${parser.description}, index=${mkvUseIndex})`, async context => {
          const expected = await mm.parseFile(filePath, { mkvUseIndex, duration: true });
          const actual = await parser.parse(() => context.skip(), filePath, 'audio/webm', {
            mkvUseIndex,
            duration: true
          });
          assert.strictEqual(actual.format.container, expected.format.container);
          assert.deepEqual(actual.format.trackInfo, expected.format.trackInfo);
          assert.deepEqual(actual.common, expected.common);
          assert.isNumber(actual.format.duration);
          assert.approximately(actual.format.duration, 25.5, 0.1);
        });
      }
    }
    it('propagates non-EOF errors while skipping', async () => {
      const data = await readFile(filePath);
      const tokenizer = await fromStream(Readable.from([data], { objectMode: false }));
      const failure = new Error('skip failed');
      tokenizer.ignore = async () => {
        throw failure;
      };
      try {
        await expect(mm.parseFromTokenizer(tokenizer)).rejects.toThrowError('skip failed');
      } finally {
        await tokenizer.close();
      }
    });
    it('accepts a short skip from a caller-owned tokenizer', async () => {
      const data = await readFile(filePath);
      const tokenizer = await fromStream(Readable.from([data], { objectMode: false }));
      const ignore = tokenizer.ignore.bind(tokenizer);
      tokenizer.ignore = async length => {
        const position = tokenizer.position;
        try {
          return await ignore(length);
        } catch (error) {
          if (error instanceof EndOfStreamError) {
            return tokenizer.position - position;
          }
          throw error;
        }
      };
      const close = tokenizer.close.bind(tokenizer);
      tokenizer.close = async () => assert.fail('parser must not close caller-owned input');
      try {
        const result = await mm.parseFromTokenizer(tokenizer);
        assert.strictEqual(result.format.container, 'EBML/webm');
        assert.isUndefined(result.format.duration);
      } finally {
        await close();
      }
    });
  });

  it('Handle Matroska file without duration', async () => {
    const filePath = path.join(matroskaSamplePath, 'no-duration.webm');
    const { format } = await mm.parseFile(filePath);
    assert.strictEqual(format.container, 'EBML/webm', 'format.container');
    assert.isUndefined(format.duration, 'format.duration');
  });

  describe('Indexed streams', () => {
    function element(id: string, ...parts: Uint8Array[]): Buffer {
      const payload = Buffer.concat(parts);
      const size = Buffer.alloc(2);
      size.writeUInt16BE(0x4000 | payload.length);
      return Buffer.concat([Buffer.from(id, 'hex'), size, payload]);
    }

    function tags(name: string, value: string): Buffer {
      return element(
        '1254c367',
        element('7373', element('67c8', element('45a3', Buffer.from(name)), element('4487', Buffer.from(value))))
      );
    }

    function indexedSample(withIndex = true, withPrefix = false) {
      const header = element('1a45dfa3', element('4282', Buffer.from('matroska')));
      const clusterPayload = new Uint8Array([1, 2, 3]);
      const cluster = element('1f43b675', clusterPayload);
      const unindexedTags = tags('TITLE', 'Unindexed title');
      const indexedTags = tags('ARTIST', 'Indexed artist');
      const seekHead = (position: number): Buffer => {
        const offset = Buffer.alloc(2);
        offset.writeUInt16BE(position);
        return element(
          '114d9b74',
          element('4dbb', element('53ab', Buffer.from('1254c367', 'hex')), element('53ac', offset))
        );
      };
      // SeekPosition is relative to the segment payload; a fixed-width value keeps the head size stable.
      const prefix = withPrefix ? element('ec', new Uint8Array(17)) : new Uint8Array();
      const seek = withIndex
        ? seekHead(prefix.length + seekHead(0).length + cluster.length + unindexedTags.length)
        : new Uint8Array();
      const data = Buffer.concat([header, element('18538067', prefix, seek, cluster, unindexedTags, indexedTags)]);
      const skipEnd = data.length - indexedTags.length;
      return { data, skipStart: skipEnd - unindexedTags.length - clusterPayload.length, skipEnd };
    }

    async function streamSample(withIndex = true, withPrefix = false) {
      const sample = indexedSample(withIndex, withPrefix);
      const tokenizer = await fromStream(Readable.from([sample.data], { objectMode: false }), {
        fileInfo: { mimeType: 'video/x-matroska' }
      });
      return { ...sample, tokenizer };
    }

    it('resolves index positions relative to the Segment when SeekHead is not its first child', async () => {
      const { tokenizer } = await streamSample(true, true);
      try {
        const { common } = await parseFromTokenizer(tokenizer, { mkvUseIndex: true });
        assert.strictEqual(common.artist, 'Indexed artist');
        assert.isUndefined(common.title);
      } finally {
        await tokenizer.close();
      }
    });

    it('waits for a delayed indexed skip before reading the next header', async () => {
      const { tokenizer, skipStart, skipEnd } = await streamSample();
      const ignore = tokenizer.ignore.bind(tokenizer);
      const peekNumber = tokenizer.peekNumber.bind(tokenizer);
      let skipStarted = false;
      let skipFinished = false;
      tokenizer.ignore = async length => {
        if (tokenizer.position === skipStart && length === skipEnd - skipStart) {
          skipStarted = true;
          await nextTurn();
          const ignored = await ignore(length);
          skipFinished = true;
          return ignored;
        }
        return ignore(length);
      };
      tokenizer.peekNumber = token => {
        assert.isFalse(skipStarted && !skipFinished, 'must finish the indexed skip before reading another header');
        return peekNumber(token);
      };
      try {
        const { common } = await parseFromTokenizer(tokenizer, { mkvUseIndex: true });
        assert.isTrue(skipFinished, 'must exercise the indexed skip');
        assert.strictEqual(common.artist, 'Indexed artist');
        assert.isUndefined(common.title, 'unindexed metadata remains skipped');
      } finally {
        await tokenizer.close();
      }
    });

    for (const error of [new Error('Indexed skip failed'), new EndOfStreamError()]) {
      it(`propagates indexed skip rejection (${error.name})`, async () => {
        const { tokenizer, skipStart, skipEnd } = await streamSample();
        const ignore = tokenizer.ignore.bind(tokenizer);
        let skipAttempted = false;
        tokenizer.ignore = async length => {
          if (tokenizer.position === skipStart && length === skipEnd - skipStart) {
            skipAttempted = true;
            await nextTurn();
            throw error;
          }
          return ignore(length);
        };
        try {
          await expect(parseFromTokenizer(tokenizer, { mkvUseIndex: true })).rejects.toThrowError(error);
          assert.isTrue(skipAttempted, 'must exercise the indexed skip');
        } finally {
          await tokenizer.close();
        }
      });
    }

    for (const [withIndex, mkvUseIndex] of [
      [true, false],
      [false, true]
    ]) {
      it(`preserves unindexed metadata with SeekHead=${withIndex}, mkvUseIndex=${mkvUseIndex}`, async () => {
        const { tokenizer } = await streamSample(withIndex);
        try {
          const { common } = await parseFromTokenizer(tokenizer, { mkvUseIndex });
          assert.strictEqual(common.artist, 'Indexed artist');
          assert.strictEqual(common.title, 'Unindexed title');
        } finally {
          await tokenizer.close();
        }
      });
    }
  });

  describe('Schema and selective collection', () => {
    function element(id: string, ...parts: Uint8Array[]): Buffer {
      const payload = Buffer.concat(parts);
      const size = Buffer.alloc(3);
      size.writeUIntBE(0x200000 | payload.length, 0, 3);
      return Buffer.concat([Buffer.from(id, 'hex'), size, payload]);
    }

    function text(id: string, value: string): Buffer {
      return element(id, Buffer.from(value));
    }

    function uint(id: string, value: number): Buffer {
      return element(id, Uint8Array.of(value));
    }

    function document(...parts: Uint8Array[]): Buffer {
      return Buffer.concat([element('1a45dfa3', text('4282', 'matroska')), element('18538067', ...parts)]);
    }

    function freezeSchema(schema: IElementType): void {
      for (const child of Object.values(schema.container ?? {})) {
        freezeSchema(child);
      }
      if (schema.container) {
        Object.freeze(schema.container);
      }
      Object.freeze(schema);
    }

    // These checks fail compilation if the literal schema widens or decoded fields become required.
    const absentTrack: IDecodedTrackEntry = {};
    const absentFile: IDecodedAttachedFile = {};
    const typedTrack: IDecodedTrackEntry = { codecDecodeAll: true, trackOverlay: [1, 2] };
    const typedFile: IDecodedAttachedFile = { uid: Uint8Array.of(1) };
    // @ts-expect-error CodecDecodeAll is a flag, not a string.
    const wrongTrack: IDecodedTrackEntry = { codecDecodeAll: 'true' };
    // @ts-expect-error FileUID is preserved as bytes, not a lossy number or string.
    const wrongFile: IDecodedAttachedFile = { uid: '1' };
    void [absentTrack, absentFile, typedTrack, typedFile, wrongTrack, wrongFile];

    describe('Literal schema', () => {
      it('decodes flags, repeated scalar values, byte UIDs and distinct encoding children', async () => {
        const data = document(
          element(
            '1654ae6b',
            element(
              'ae',
              uint('aa', 1),
              uint('6df8', 5),
              uint('6fab', 3),
              uint('6fab', 4),
              text('3b4040', 'first'),
              text('3b4040', 'second'),
              element(
                '6d80',
                element('6240', uint('5032', 3), element('5034', uint('4254', 2)), element('5035', uint('47e5', 1)))
              )
            )
          ),
          element('1941a469', element('61a7', element('46ae', Buffer.from('fedcba9876543210', 'hex'))))
        );
        const tree = await new EbmlIterator(fromBuffer(data)).iterate(matroskaDtd, data.length, {
          startNext: () => ParseAction.ReadNext,
          onElement: async event => {
            if (event.id === 0xaa) {
              const value: boolean = event.value;
              assert.isTrue(value);
            }
          }
        });
        const entry = tree.segment.tracks.entries[0];
        assert.isTrue(entry.codecDecodeAll);
        assert.strictEqual(entry.maxCache, 5);
        assert.deepEqual(entry.trackOverlay, [3, 4]);
        assert.deepEqual(entry.codecInfoUrl, ['first', 'second']);
        assert.deepEqual(entry.contentEncodings.contentEncoding, [
          { scope: 3, contentCompression: { contentCompAlgo: 2 }, contentEncryption: { contentSigAlgo: 1 } }
        ]);
        assert.deepEqual(tree.segment.attachments.attachedFiles[0].uid, Buffer.from('fedcba9876543210', 'hex'));
      });

      it('decodes chapter display siblings, cue cardinality and signed DateUTC', async () => {
        const data = document(
          element('1549a966', element('4461', Uint8Array.of(0xff))),
          element(
            '1043a770',
            element(
              '45b9',
              element(
                'b6',
                uint('92', 2),
                uint('4598', 1),
                element('8f', uint('89', 3), uint('89', 4)),
                element('80', text('85', 'First'), text('437c', 'eng'), text('437c', 'nld')),
                element('80', text('85', 'Second'))
              )
            )
          ),
          element(
            '1c53bb6b',
            element('bb', uint('b3', 5), element('b7', uint('f7', 1)), element('b7', uint('f7', 2))),
            element('bb', uint('b3', 6))
          )
        );
        const tree = await new EbmlIterator(fromBuffer(data)).iterate(matroskaDtd, data.length, {
          startNext: () => ParseAction.ReadNext
        });
        assert.strictEqual(tree.segment.info.dateUTC, -1);
        const chapter = tree.segment.chapters.editionEntry[0].chapterAtom[0];
        assert.strictEqual(chapter.timeEnd, 2);
        assert.isTrue(chapter.enabled);
        assert.deepEqual(chapter.display, [{ string: 'First', language: ['eng', 'nld'] }, { string: 'Second' }]);
        assert.lengthOf(chapter.track.trackUID, 2);
        assert.deepEqual(tree.segment.cues.cuePoint, [
          { cueTime: 5, positions: [{ track: 1 }, { track: 2 }] },
          { cueTime: 6 }
        ]);
      });

      it('allows concurrent and repeated parses of a deeply frozen shared schema', async () => {
        freezeSchema(matroskaDtd);
        const before = JSON.stringify(matroskaDtd);
        const data = document(element('1549a966', text('7ba9', 'Title without duration')));
        const parse = async () => {
          const paths: string[] = [];
          const tree = await new EbmlIterator(fromBuffer(data)).iterate(matroskaDtd, data.length, {
            startNext: context => {
              paths.push(getElementPath(context));
              return ParseAction.ReadNext;
            }
          });
          assert.strictEqual(tree.segment.info.title, 'Title without duration');
          assert.include(paths, 'segment/info/title');
        };
        await Promise.all([parse(), parse()]);
        await parse();
        assert.strictEqual(JSON.stringify(matroskaDtd), before);
        const metadata = await parseBuffer(data, { mimeType: 'video/x-matroska' });
        assert.strictEqual(metadata.common.title, 'Title without duration');
      });

      it('ignores incomplete domain objects and accepts empty containers', async () => {
        const data = document(
          element('1654ae6b', element('ae'), element('ae', uint('d7', 1), text('86', 'A_AAC'))),
          element('1254c367'),
          element('1941a469', element('61a7'))
        );
        const { format, common, quality } = await parseBuffer(data, { mimeType: 'video/x-matroska' });
        assert.isEmpty(format.trackInfo);
        assert.isUndefined(common.picture);
        assert.lengthOf(quality.warnings, 2);
      });
    });

    function attachment(mimeFirst: boolean, mimeType = 'image/png', payload = Uint8Array.of(1, 2, 3)): Buffer {
      const mime = text('4660', mimeType);
      const data = element('465c', payload);
      return element(
        '61a7',
        text('466e', 'cover.png'),
        uint('46ae', 1),
        ...(mimeFirst ? [mime, data] : [data, mime]),
        text('467e', 'Cover')
      );
    }

    function titleTag(title: string): Buffer {
      return element('1254c367', element('7373', element('67c8', text('45a3', 'TITLE'), text('4487', title))));
    }

    describe('Selective collection', () => {
      it('emits one attachment at a time without retaining attachments or the document tree', async () => {
        const data = document(element('1941a469', attachment(true), attachment(false)));
        let files = 0;
        const tree = await new EbmlIterator(fromBuffer(data)).iterate(matroskaDtd, data.length, {
          startNext: () => ParseAction.ReadNext,
          collect: element => element.id === 0x61a7,
          onElement: async event => {
            if (event.id === 0x61a7) {
              files++;
              assert.strictEqual(event.value.name, 'cover.png');
              assert.deepEqual(event.value.data, Uint8Array.of(1, 2, 3));
            } else if (event.id === 0x1941a469 || event.id === 0x18538067) {
              assert.deepEqual(event.value, {}, 'ancestors must not retain completed subtrees');
            }
          }
        });
        assert.strictEqual(files, 2);
        assert.deepEqual(tree, {});
      });

      for (const stream of [false, true]) {
        for (const mimeFirst of [false, true]) {
          it(`preserves pictures, tags and tracks (stream=${stream}, MIME first=${mimeFirst})`, async () => {
            const payload = Uint8Array.of(1, 2, 3);
            const data = document(
              element('1941a469', attachment(mimeFirst, 'image/png', payload)),
              titleTag('After attachments'),
              element('1654ae6b', element('ae', uint('d7', 1), uint('83', 2), text('86', 'A_AAC')))
            );
            const tokenizer = stream
              ? await fromStream(Readable.from([data], { objectMode: false }))
              : fromBuffer(data);
            tokenizer.fileInfo.mimeType = 'video/x-matroska';
            try {
              const { common, format } = await parseFromTokenizer(tokenizer);
              assert.strictEqual(common.title, 'After attachments');
              assert.strictEqual(format.codec, 'AAC');
              assert.lengthOf(common.picture, 1);
              assert.deepInclude(common.picture[0], { name: 'cover.png', format: 'image/png', description: 'Cover' });
              assert.deepEqual(common.picture[0].data, payload);
            } finally {
              await tokenizer.close();
            }
          });

          it(`skips large attachment payloads before allocation with skipCovers (stream=${stream}, MIME first=${mimeFirst})`, async () => {
            const payload = new Uint8Array(4096).fill(0xab);
            const data = document(
              element('1941a469', attachment(mimeFirst, 'image/png', payload)),
              titleTag('Still readable'),
              element('ec', new Uint8Array(256))
            );
            const start = data.indexOf(payload);
            const tokenizer = stream
              ? await fromStream(Readable.from([data], { objectMode: false }))
              : fromBuffer(data);
            tokenizer.fileInfo.mimeType = 'video/x-matroska';
            const read = tokenizer.readBuffer.bind(tokenizer);
            const ignore = tokenizer.ignore.bind(tokenizer);
            let draining = false;
            let skippedPayload = false;
            tokenizer.ignore = async length => {
              skippedPayload ||= tokenizer.position <= start && tokenizer.position + length >= start + payload.length;
              draining = true;
              try {
                return await ignore(length);
              } finally {
                draining = false;
              }
            };
            tokenizer.readBuffer = (buffer, options) => {
              const position = options?.position ?? tokenizer.position;
              assert.isFalse(
                !draining && position < start + payload.length && position + (options?.length ?? buffer.length) > start,
                'must not decode FileData (stream draining is allowed)'
              );
              return read(buffer, options);
            };
            try {
              const { common, native } = await parseFromTokenizer(tokenizer, {
                skipCovers: true,
                maxMemoryAllocation: 64
              });
              assert.isTrue(skippedPayload);
              assert.strictEqual(common.title, 'Still readable');
              assert.isUndefined(common.picture);
              assert.isFalse(native.matroska.some(tag => tag.id === 'picture'));
            } finally {
              await tokenizer.close();
            }
          });
        }

        it(`skips a known non-image payload before allocation (stream=${stream})`, async () => {
          const data = document(
            element('1941a469', attachment(true, 'application/octet-stream', new Uint8Array(4096))),
            titleTag('After non-image')
          );
          const tokenizer = stream ? await fromStream(Readable.from([data], { objectMode: false })) : fromBuffer(data);
          tokenizer.fileInfo.mimeType = 'video/x-matroska';
          try {
            const { common } = await parseFromTokenizer(tokenizer, { maxMemoryAllocation: 64 });
            assert.strictEqual(common.title, 'After non-image');
            assert.isUndefined(common.picture);
          } finally {
            await tokenizer.close();
          }
        });

        it(`bounds buffering when MIME follows data (stream=${stream})`, async () => {
          const data = document(
            element('1941a469', attachment(false, 'application/octet-stream', new Uint8Array(4096)))
          );
          const tokenizer = stream ? await fromStream(Readable.from([data], { objectMode: false })) : fromBuffer(data);
          tokenizer.fileInfo.mimeType = 'video/x-matroska';
          try {
            await expect(parseFromTokenizer(tokenizer, { maxMemoryAllocation: 64 })).rejects.toThrowError(
              'allocation limit'
            );
          } finally {
            await tokenizer.close();
          }
        });
      }

      it('keeps MIME classification local to each attachment and validates required fields', async () => {
        const data = document(
          element(
            '1941a469',
            attachment(true, 'application/octet-stream'),
            attachment(false),
            element('61a7', text('4660', 'image/png'), element('465c', Uint8Array.of(1)))
          )
        );
        const { common, quality } = await parseBuffer(data, { mimeType: 'video/x-matroska' });
        assert.lengthOf(common.picture, 1);
        assert.deepEqual(common.picture[0].data, Uint8Array.of(1, 2, 3));
        assert.include(
          quality.warnings.map(warning => warning.message),
          'Ignoring incomplete Matroska image attachment'
        );
      });

      for (const [encoded, expected] of [
        [0, undefined],
        [1, true],
        [2, false]
      ] as const) {
        it(`normalizes the Matroska interlacing enum (${encoded}) to optional domain flags`, async () => {
          const data = document(
            element(
              '1654ae6b',
              element(
                'ae',
                uint('d7', 1),
                uint('83', 1),
                text('86', 'V_VP9'),
                element(
                  'e0',
                  uint('9a', encoded),
                  uint('b0', 100),
                  uint('ba', 50),
                  element('2eb524', Uint8Array.of(1, 2, 3, 4))
                )
              )
            )
          );
          const { format } = await parseBuffer(data, { mimeType: 'video/x-matroska' });
          const video = format.trackInfo[0].video;
          assert.strictEqual(video.flagInterlaced, expected);
          if (expected === undefined) {
            assert.notProperty(video, 'flagInterlaced');
          }
          assert.deepEqual(video.colourSpace, Uint8Array.of(1, 2, 3, 4));
        });
      }

      it('applies statistics to every repeated target UID and preserves separate Tags elements', async () => {
        const data = document(
          element(
            '1654ae6b',
            ...[1, 2].map(id => element('ae', uint('d7', id), uint('73c5', id), uint('83', 2), text('86', 'A_AAC')))
          ),
          element(
            '1254c367',
            element(
              '7373',
              element('63c0', uint('63c5', 1), uint('63c5', 2)),
              element('67c8', text('45a3', 'BPS'), text('4487', '128000'))
            )
          ),
          titleTag('Second Tags')
        );
        const { common, format } = await parseBuffer(data, { mimeType: 'video/x-matroska' });
        assert.strictEqual(common.title, 'Second Tags');
        assert.deepEqual(
          format.trackInfo.map(track => track.bitrate),
          [128000, 128000]
        );
      });
    });
  });

  it('maps the flat tag names written by ffmpeg', async () => {
    const { common } = await mm.parseFile(path.join(matroskaSamplePath, 'ffmpeg-flat-tags.webm'), { duration: false });

    assert.strictEqual(common.album, 'Album', 'common.album');
    assert.strictEqual(common.albumartist, 'Various', 'common.albumartist');
    assert.strictEqual(common.date, '2021-03-04', 'common.date');
    assert.deepEqual(common.composer, ['Writer'], 'common.composer');
    assert.strictEqual(common.disk.no, 2, 'common.disk.no');
  });

  describe('Cluster timing duration recovery', () => {
    function vint(value: number, width = 1): Buffer {
      while (value >= 2 ** (7 * width) - 1) {
        ++width;
      }
      const data = Buffer.alloc(width);
      let rest = value;
      for (let i = width - 1; i >= 0; --i) {
        data[i] = rest % 256;
        rest = Math.floor(rest / 256);
      }
      data[0] |= 0x80 >> (width - 1);
      return data;
    }

    function element(id: string, ...parts: Uint8Array[]): Buffer {
      const payload = Buffer.concat(parts);
      return Buffer.concat([Buffer.from(id, 'hex'), vint(payload.length), payload]);
    }

    function uint(id: string, value: number): Buffer {
      const payload = Buffer.alloc(8);
      payload.writeBigUInt64BE(BigInt(value));
      const first = payload.findIndex(byte => byte !== 0);
      return element(id, payload.subarray(first < 0 ? 7 : first));
    }

    function float(id: string, value: number): Buffer {
      const payload = Buffer.alloc(8);
      payload.writeDoubleBE(value);
      return element(id, payload);
    }

    function text(id: string, value: string): Buffer {
      return element(id, Buffer.from(value));
    }

    function track(id = 1, ...properties: Uint8Array[]): Buffer {
      return element('ae', uint('d7', id), uint('83', 2), text('86', 'A_OPUS'), ...properties);
    }

    function block(id: number, timestamp: number, flags = 0x80, data = Buffer.from([0])): Buffer {
      const time = Buffer.alloc(2);
      time.writeInt16BE(timestamp);
      return Buffer.concat([vint(id), time, Buffer.from([flags]), data]);
    }

    function simple(timestamp: number, id = 1): Buffer {
      return element('a3', block(id, timestamp));
    }

    function group(timestamp: number, duration?: number, ...properties: Uint8Array[]): Buffer {
      return element(
        'a0',
        element('a1', block(1, timestamp)),
        ...(duration === undefined ? [] : [uint('9b', duration)]),
        ...properties
      );
    }

    function cluster(timestamp: number, ...blocks: Uint8Array[]): Buffer {
      return element('1f43b675', uint('e7', timestamp), ...blocks);
    }

    function unknownCluster(timestamp: number, ...blocks: Uint8Array[]): Buffer {
      return Buffer.concat([Buffer.from('1f43b675ff', 'hex'), uint('e7', timestamp), ...blocks]);
    }

    function document(...parts: Uint8Array[]): Buffer {
      return Buffer.concat([element('1a45dfa3', text('4282', 'webm')), element('18538067', ...parts)]);
    }

    function sample(...blocks: Uint8Array[]): Buffer {
      return document(element('1654ae6b', track()), cluster(0, ...blocks));
    }

    function statistics(duration: string): Buffer {
      return element(
        '1254c367',
        element(
          '7373',
          element('63c0', uint('63c5', 1)),
          element('67c8', text('45a3', 'DURATION'), text('4487', duration))
        )
      );
    }

    async function parse(data: Buffer, options: mm.IOptions = { duration: true }): Promise<mm.IFormat> {
      return (await mm.parseBuffer(data, { mimeType: 'audio/webm' }, options)).format;
    }

    it('uses the real BlockDuration ID and handles its position before or after Block', async () => {
      for (const durationFirst of [true, false]) {
        const children = [element('a1', block(1, 0)), uint('9b', 20000)];
        const format = await parse(sample(element('a0', ...(durationFirst ? children.reverse() : children))));
        assert.strictEqual(format.duration, 20);
        assert.strictEqual(format.trackInfo[0].duration, 20);
      }
    });

    it('does not scan by default or when duration is explicitly disabled', async () => {
      for (const options of [{}, { duration: false }]) {
        const format = await parse(sample(group(0, 20000)), options);
        assert.isUndefined(format.duration);
        assert.isUndefined(format.trackInfo[0].duration);
      }
    });

    it('leaves duration unknown without blocks or without a final-frame estimate', async () => {
      for (const data of [sample(), sample(simple(0)), sample(simple(1000))]) {
        assert.isUndefined((await parse(data)).duration);
      }
    });

    it('estimates the final block duration from timestamp deltas, including BlockGroups', async () => {
      const format = await parse(sample(simple(0), group(20), simple(40)));
      assert.strictEqual(format.duration, 0.06);
    });

    it('applies the final minimum delta rather than retaining an early overestimate', async () => {
      const format = await parse(sample(simple(0), simple(1000), simple(1020)));
      assert.strictEqual(format.duration, 1.04);
    });

    it('handles signed relative timestamps and resets timing for each Cluster', async () => {
      const format = await parse(
        document(element('1654ae6b', track()), cluster(1000, group(-20, 20)), cluster(2000, group(-20, 20)))
      );
      assert.strictEqual(format.duration, 2);
      assert.isUndefined(
        (await parse(document(element('1654ae6b', track()), cluster(1000), element('1f43b675', group(0, 20))))).duration
      );
    });

    it('keeps DefaultDuration in nanoseconds with a non-default TimestampScale', async () => {
      const format = await parse(
        document(
          element('1549a966', uint('2ad7b1', 2000000)),
          element('1654ae6b', track(1, uint('23e383', 20000000))),
          cluster(0, simple(10))
        )
      );
      assert.strictEqual(format.duration, 0.04);
    });

    it('prefers explicit whole-block duration to the track frame duration', async () => {
      const format = await parse(
        document(element('1654ae6b', track(1, uint('23e383', 20000000))), cluster(0, group(10, 100)))
      );
      assert.strictEqual(format.duration, 0.11);
    });

    for (const [name, flags, laceData] of [
      ['Xiph', 0x82, Buffer.from([2, 1, 1, 0, 0, 0])],
      ['fixed', 0x84, Buffer.from([2, 0, 0, 0])],
      ['EBML', 0x86, Buffer.from([2, 0x81, 0xbf, 0, 0, 0])]
    ] as const) {
      it(`counts frames for ${name} lacing without multiplying BlockDuration`, async () => {
        const header = element('1654ae6b', track(1, uint('23e383', 20000000)));
        const payload = element('a1', block(1, 0, flags, laceData));
        const estimated = await parse(document(header, cluster(0, element('a3', block(1, 0, flags, laceData)))));
        assert.strictEqual(estimated.duration, 0.06);
        const explicit = await parse(document(header, cluster(0, element('a0', payload, uint('9b', 50)))));
        assert.strictEqual(explicit.duration, 0.05);
      });
    }

    it('supports multibyte and wide TrackNumber VINTs without 32-bit truncation', async () => {
      for (const id of [128, 0x100000001, Number.MAX_SAFE_INTEGER]) {
        const format = await parse(
          document(element('1654ae6b', track(id, uint('23e383', 20000000))), cluster(0, simple(0, id), simple(20, id)))
        );
        assert.strictEqual(format.duration, 0.04);
      }
    });

    it('recovers timing without TrackUID and selects the enabled default audio track', async () => {
      const format = await parse(
        document(
          element('1654ae6b', track(1, uint('88', 0)), track(2), track(3, uint('b9', 0))),
          cluster(0, simple(0, 1), simple(1000, 1), simple(0, 2), simple(20, 2), simple(0, 3), simple(2000, 3))
        )
      );
      assert.strictEqual(format.duration, 0.04);
      assert.strictEqual(format.trackInfo[0].duration, 2);
      assert.strictEqual(format.containerDuration, 4);
    });

    it('does not replace Segment Info or selected-track statistics duration', async () => {
      const tracks = element('1654ae6b', track(1, uint('73c5', 1)));
      const blocks = cluster(0, group(0, 20));
      const known = await parse(document(element('1549a966', float('4489', 5000)), tracks, blocks));
      assert.strictEqual(known.duration, 5);
      assert.isUndefined(known.trackInfo[0].duration);
      for (const tagsFirst of [true, false]) {
        const tags = statistics('00:00:03.000');
        const format = await parse(document(tracks, ...(tagsFirst ? [tags, blocks] : [blocks, tags])));
        assert.strictEqual(format.duration, 3);
        assert.strictEqual(format.trackInfo[0].duration, 3);
      }
    });

    it('uses the default TimestampScale for Info Duration and skips invalid Cluster payloads', async () => {
      // The TagLib reference parser requires an explicit scale here, although
      // Matroska defaults TimestampScale to 1,000,000 ns.
      const format = await parse(
        document(
          element('1549a966', float('4489', 1120)),
          element('1654ae6b', track()),
          element('1f43b675', Buffer.from([0]))
        )
      );
      assert.strictEqual(format.duration, 1.12);
      assert.isUndefined(format.trackInfo[0].duration);
    });

    it('bounds deferred timing and distinct nanosecond endpoint adjustments', async () => {
      const blocks = Array.from({ length: 5 }, (_, i) => group(i * 20, 20));
      const variedPadding = blocks.map((_, i) => {
        const padding = Buffer.alloc(4);
        padding.writeInt32BE(i);
        return group(i * 20, 20, element('75a2', padding));
      });
      for (const data of [
        document(cluster(0, ...blocks), element('1654ae6b', track())),
        document(element('1654ae6b', track()), element('1f43b675', ...blocks, uint('e7', 0))),
        sample(...variedPadding)
      ]) {
        await expect(parse(data, { duration: true, maxMetadataEntries: 4 })).rejects.toThrow(
          'Matroska timing entry count exceeds entry limit'
        );
      }
    });

    it('does not reuse a missing Cluster timestamp or publish a partial duration', async () => {
      const format = await parse(
        document(element('1654ae6b', track()), cluster(1000, group(0, 20)), element('1f43b675', group(0, 20)))
      );
      assert.isUndefined(format.duration);
      assert.isUndefined(format.trackInfo[0].duration);
    });

    for (const input of ['buffer', 'known-size stream', 'unknown-size stream']) {
      it(`does not publish a partial scan when a known-size Cluster ends before its declared boundary (${input})`, async () => {
        const lastBlock = simple(1000);
        const data = sample(group(0, 20), lastBlock);
        const truncated = data.subarray(0, data.length - lastBlock.length);
        const tokenizer =
          input === 'buffer'
            ? fromBuffer(truncated)
            : await fromStream(Readable.from([truncated], { objectMode: false }), {
                fileInfo: { size: input === 'known-size stream' ? truncated.length : undefined }
              });
        tokenizer.fileInfo.mimeType = 'audio/webm';
        try {
          const { format } = await mm.parseFromTokenizer(tokenizer, { duration: true });
          assert.isUndefined(format.duration);
          assert.isUndefined(format.trackInfo[0].duration);
        } finally {
          await tokenizer.close();
        }
      });
    }

    for (const stream of [false, true]) {
      for (const trailing of ['', 'a3', 'a340', '40']) {
        it(`recovers duration only at clean EOF in unknown-size containers (stream=${stream}, trailing=${trailing})`, async () => {
          const data = Buffer.concat([
            element('1a45dfa3', text('4282', 'webm')),
            Buffer.from('18538067ff', 'hex'),
            element('1654ae6b', track()),
            unknownCluster(0, group(0, 20), Buffer.from(trailing, 'hex'))
          ]);
          const tokenizer = stream ? await fromStream(Readable.from([data], { objectMode: false })) : fromBuffer(data);
          tokenizer.fileInfo.mimeType = 'audio/webm';
          try {
            const { format } = await mm.parseFromTokenizer(tokenizer, { duration: true });
            assert.strictEqual(format.duration, trailing === '' ? 0.02 : undefined);
            assert.strictEqual(format.trackInfo[0].duration, trailing === '' ? 0.02 : undefined);
          } finally {
            await tokenizer.close();
          }
        });
      }
    }

    for (const id of ['a1', 'a3']) {
      for (const stream of [false, true]) {
        it(`skips a block extending beyond the known file size without publishing partial timing (id=${id}, stream=${stream})`, async () => {
          const lastBlock = element(id, block(1, 1000, 0x80, Buffer.alloc(64)));
          const data = sample(group(0, 20), id === 'a1' ? element('a0', lastBlock) : lastBlock);
          const truncated = data.subarray(0, data.length - 56);
          const tokenizer = stream
            ? await fromStream(Readable.from([truncated], { objectMode: false }), {
                fileInfo: { size: truncated.length }
              })
            : fromBuffer(truncated);
          tokenizer.fileInfo.mimeType = 'audio/webm';
          try {
            const { format } = await mm.parseFromTokenizer(tokenizer, { duration: true });
            assert.isUndefined(format.duration);
            assert.isUndefined(format.trackInfo[0].duration);
          } finally {
            await tokenizer.close();
          }
        });
      }
    }

    for (const id of ['a1', 'a3']) {
      for (const available of [0, 4, 11]) {
        for (const advertisedSize of [false, true]) {
          it(`returns available metadata when a block prefix is incomplete (id=${id}, available=${available}, advertised size=${advertisedSize})`, async () => {
            const payload = block(1, 1000, 0x80, Buffer.alloc(64));
            const lastBlock = element(id, payload);
            const data = document(
              element('1549a966', text('7ba9', 'Before truncated block')),
              element('1654ae6b', track()),
              cluster(0, group(0, 20), id === 'a1' ? element('a0', lastBlock) : lastBlock)
            );
            const truncated = data.subarray(0, data.length - payload.length + available);
            const tokenizer = await fromStream(Readable.from([truncated], { objectMode: false }), {
              fileInfo: { mimeType: 'audio/webm', size: advertisedSize ? data.length : undefined }
            });
            try {
              const { format, common } = await mm.parseFromTokenizer(tokenizer, { duration: true });
              assert.strictEqual(common.title, 'Before truncated block');
              assert.strictEqual(format.codec, 'OPUS');
              assert.lengthOf(format.trackInfo, 1);
              assert.isUndefined(format.duration);
              assert.isUndefined(format.trackInfo[0].duration);
            } finally {
              await tokenizer.close();
            }
          });
        }
      }
    }

    it('does not publish a partial scan when a stream ends after a block prefix', async () => {
      const data = sample(group(0, 20), element('a3', block(1, 1000, 0x80, Buffer.alloc(64))));
      // Leave all 12 prefix bytes intact but truncate the skipped frame data.
      for (const size of [undefined, data.length]) {
        const tokenizer = await fromStream(Readable.from([data.subarray(0, data.length - 56)], { objectMode: false }), {
          fileInfo: { mimeType: 'audio/webm', size }
        });
        try {
          const { format } = await mm.parseFromTokenizer(tokenizer, { duration: true });
          assert.isUndefined(format.duration);
          assert.isUndefined(format.trackInfo[0].duration);
        } finally {
          await tokenizer.close();
        }
      }
    });

    it('ignores invalid duration statistics instead of suppressing the fallback', async () => {
      const format = await parse(
        document(element('1654ae6b', track(1, uint('73c5', 1))), statistics('00:99:01'), cluster(0, group(0, 20)))
      );
      assert.strictEqual(format.duration, 0.02);
    });

    it('applies TrackTimestampScale, CodecDelay and positive DiscardPadding', async () => {
      const padding = Buffer.alloc(4);
      padding.writeInt32BE(5000000);
      const format = await parse(
        document(
          element('1654ae6b', track(1, float('23314f', 2), uint('56aa', 10000000))),
          cluster(100, group(0, 20, element('75a2', padding)))
        )
      );
      assert.strictEqual(format.duration, 0.125);
    });

    it('ignores negative DiscardPadding at the start instead of extending the end', async () => {
      const padding = Buffer.alloc(4);
      padding.writeInt32BE(-5000000);
      assert.strictEqual((await parse(sample(group(0, 20, element('75a2', padding))))).duration, 0.02);
    });

    it('ignores malformed, truncated and unknown-track block headers', async () => {
      const invalid = [
        Buffer.alloc(0),
        Buffer.from([0, 0, 0, 0]),
        Buffer.from([0x80, 0, 0, 0]),
        Buffer.from([0x40, 1, 0, 0]),
        Buffer.from([0x81, 0, 0, 4]),
        block(2, 1000),
        Buffer.from([1, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0, 0, 0])
      ];
      const format = await parse(sample(...invalid.map(payload => element('a3', payload)), group(0, 20)));
      assert.strictEqual(format.duration, 0.02);
    });

    for (const stream of [false, true]) {
      async function parseInput(data: Buffer, options: mm.IOptions = { duration: true }) {
        const tokenizer = stream ? await fromStream(Readable.from([data], { objectMode: false })) : fromBuffer(data);
        tokenizer.fileInfo.mimeType = 'audio/webm';
        try {
          return await mm.parseFromTokenizer(tokenizer, options);
        } finally {
          await tokenizer.close();
        }
      }

      it(`uses final track and Segment timing metadata regardless of element order (stream=${stream})`, async () => {
        const info = element('1549a966', uint('2ad7b1', 2000000));
        const tracks = element('1654ae6b', track(1, float('23314f', 2), uint('56aa', 5000000)));
        for (const tracksFirst of [false, true]) {
          for (const infoFirst of [false, true]) {
            for (const timestampFirst of [false, true]) {
              const blocks = element(
                '1f43b675',
                ...(timestampFirst ? [uint('e7', 100), group(10, 20)] : [group(10, 20), uint('e7', 100)])
              );
              const { format } = await parseInput(
                document(
                  ...(tracksFirst ? [tracks] : []),
                  ...(infoFirst ? [info] : []),
                  blocks,
                  ...(tracksFirst ? [] : [tracks]),
                  ...(infoFirst ? [] : [info])
                )
              );
              assert.strictEqual(format.duration, 0.315);
              assert.strictEqual(format.trackInfo[0].duration, 0.315);
            }
          }
        }
      });

      it(`uses late DefaultDuration for laced blocks and the final TimestampScale for estimates (stream=${stream})`, async () => {
        const laced = element('a3', block(1, 10, 0x84, Buffer.from([2, 0, 0, 0])));
        const { format } = await parseInput(
          document(
            cluster(100, laced),
            element('1654ae6b', track(1, uint('23e383', 20000000))),
            element('1549a966', uint('2ad7b1', 2000000))
          )
        );
        assert.strictEqual(format.duration, 0.28);
        const estimated = await parseInput(
          document(
            element('1654ae6b', track()),
            cluster(100, simple(-10), simple(0), simple(10)),
            element('1549a966', uint('2ad7b1', 2000000))
          )
        );
        assert.strictEqual(estimated.format.duration, 0.24);
      });

      it(`re-evaluates endpoints with nanosecond padding when TimestampScale arrives late (stream=${stream})`, async () => {
        const padding = Buffer.alloc(4);
        padding.writeInt32BE(15000000);
        const { format } = await parseInput(
          document(
            element('1654ae6b', track()),
            cluster(0, group(0, 20), group(0, 30, element('75a2', padding))),
            element('1549a966', uint('2ad7b1', 2000000))
          )
        );
        assert.strictEqual(format.duration, 0.045);
      });

      it(`does not publish partial scans after late authoritative duration metadata (stream=${stream})`, async () => {
        const tracks = element('1654ae6b', track(1, uint('73c5', 1)), track(2));
        for (const metadata of [element('1549a966', float('4489', 5000)), statistics('00:00:05.000')]) {
          const { format } = await parseInput(
            document(
              tracks,
              cluster(0, group(0, 20), simple(0, 2), simple(20, 2)),
              metadata,
              cluster(1000, group(0, 20))
            )
          );
          assert.strictEqual(format.duration, 5);
          assert.isUndefined(format.trackInfo[1].duration);
        }
      });

      it(`handles eight-byte unknown Segment and Cluster sizes and trailing metadata (stream=${stream})`, async () => {
        const unknownSize = Buffer.from('01ffffffffffffff', 'hex');
        const data = Buffer.concat([
          element('1a45dfa3', text('4282', 'webm')),
          Buffer.from('18538067', 'hex'),
          unknownSize,
          element('1654ae6b', track()),
          Buffer.from('1f43b675', 'hex'),
          unknownSize,
          uint('e7', 0),
          simple(0),
          simple(20),
          unknownCluster(40, simple(0)),
          element('1254c367', element('7373', element('67c8', text('45a3', 'TITLE'), text('4487', 'After clusters'))))
        ]);
        for (const duration of [false, true]) {
          const result = await parseInput(data, { duration });
          assert.strictEqual(result.format.duration, duration ? 0.06 : undefined);
          assert.strictEqual(result.common.title, 'After clusters');
        }
      });

      it(`handles successive unknown-size Clusters and trailing tags (stream=${stream})`, async () => {
        const data = document(
          element('1654ae6b', track()),
          unknownCluster(0, simple(0), simple(20)),
          unknownCluster(40, simple(0)),
          element('1254c367', element('7373', element('67c8', text('45a3', 'TITLE'), text('4487', 'After clusters'))))
        );
        const tokenizer = stream ? await fromStream(Readable.from([data], { objectMode: false })) : fromBuffer(data);
        tokenizer.fileInfo.mimeType = 'audio/webm';
        try {
          const result = await mm.parseFromTokenizer(tokenizer, { duration: true, mkvUseIndex: true });
          assert.strictEqual(result.format.duration, 0.06);
          assert.strictEqual(result.common.title, 'After clusters');
        } finally {
          await tokenizer.close();
        }
      });

      it(`skips encoded payloads and does not retain a whole Cluster (stream=${stream})`, async () => {
        const data = sample(
          ...Array.from({ length: 20 }, (_, i) => element('a3', block(1, i * 20, 0x80, Buffer.alloc(4096, 0xee))))
        );
        const tokenizer = stream
          ? await fromStream(Readable.from([data], { objectMode: false }), { maxBufferSize: 64 })
          : fromBuffer(data);
        tokenizer.fileInfo.mimeType = 'audio/webm';
        const read = tokenizer.readBuffer.bind(tokenizer);
        const ignore = tokenizer.ignore.bind(tokenizer);
        let draining = false;
        let skipped = 0;
        tokenizer.readBuffer = (buffer, options) => {
          if (!draining) {
            assert.isAtMost(options?.length ?? buffer.length, 64, 'no encoded block allocation');
          }
          return read(buffer, options);
        };
        tokenizer.ignore = async length => {
          if (length > 4000) {
            ++skipped;
          }
          draining = true;
          try {
            return await ignore(length);
          } finally {
            draining = false;
          }
        };
        try {
          const result = await mm.parseFromTokenizer(tokenizer, {
            duration: true,
            maxMemoryAllocation: 64,
            maxMetadataEntries: 4
          });
          assert.strictEqual(result.format.duration, 0.4);
          assert.strictEqual(skipped, 20);
        } finally {
          await tokenizer.close();
        }
      });
    }
  });
});
