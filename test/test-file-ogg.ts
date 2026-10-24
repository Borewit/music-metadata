import { rejects } from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { assert, expect } from 'chai';
import { fromBuffer } from 'strtok3';
import { MetadataCollector } from '../lib/common/MetadataCollector.js';
import type { IFormat } from '../lib/index.js';
import * as mm from '../lib/index.js';
import { FlacStream } from '../lib/ogg/flac/FlacStream.js';
import { PageHeader, SegmentTable } from '../lib/ogg/OggToken.js';
import { IdHeader } from '../lib/ogg/opus/Opus.js';
import type { IVorbisPicture } from '../lib/ogg/vorbis/Vorbis.js';
import { VorbisStream } from '../lib/ogg/vorbis/VorbisStream.js';
import { UnexpectedFileContentError } from '../lib/ParseError.js';
import { ParserFactory } from '../lib/ParserFactory.js';
import type { IOptions } from '../lib/type.js';
import { Parsers } from './metadata-parsers.js';
import { samplePath } from './util.js';

const oggSamplePath = path.join(samplePath, 'ogg');

describe('Parse Ogg', () => {
  describe('Page header granule position', () => {
    it('decodes the unknown granule position as -1', () => {
      // Ogg framing: -1 means no packet finishes on this page.
      // https://www.xiph.org/ogg/doc/framing.html
      const header = Buffer.alloc(PageHeader.len);
      header.writeBigUInt64LE(0xffffffffffffffffn, 6);

      assert.strictEqual(PageHeader.get(header, 0).absoluteGranulePosition, -1);
    });

    it('preserves known granule positions at a nonzero buffer offset', () => {
      const offset = 4;
      const header = Buffer.alloc(offset + PageHeader.len);
      for (const position of [0n, 128180n, 0x8000000000000000n]) {
        header.writeBigUInt64LE(position, offset + 6);
        assert.strictEqual(PageHeader.get(header, offset).absoluteGranulePosition, Number(position));
      }
    });
  });

  function check_Nirvana_In_Bloom_commonTags(common: mm.ICommonTagsResult) {
    assert.strictEqual(common.title, 'In Bloom', 'common.title');
    assert.strictEqual(common.artist, 'Nirvana', 'common.artist');
    assert.strictEqual(common.albumartist, 'Nirvana', 'common.albumartist');
    assert.strictEqual(common.album, 'Nevermind', 'common.album');
    assert.strictEqual(common.year, 1991, 'common.year');
    assert.deepEqual(common.track, { no: 2, of: 12 }, 'common.track');
    assert.deepEqual(common.disk, { no: 1, of: 1 }, 'common.disk');
    assert.deepEqual(common.genre, ['Grunge', 'Alternative'], 'genre');
    assert.strictEqual(common.picture![0].format, 'image/jpeg', 'picture format');
    assert.strictEqual(common.picture![0].data.length, 30966, 'picture length');
    assert.strictEqual(common.barcode, '0720642442524', 'common.barcode (including leading zero)');
    assert.strictEqual(common.asin, 'B000003TA4', 'common.asin');
    assert.deepEqual(common.catalognumber, ['GED24425'], 'common.asin');
    assert.deepEqual(common.isrc, ['USGF19942502'], 'common.isrc');
  }

  function check_Nirvana_In_Bloom_VorbisTags(vorbis: mm.INativeTagDict) {
    assert.deepEqual(vorbis.TRACKNUMBER, ['2'], 'vorbis.TRACKNUMBER');
    assert.deepEqual(vorbis.TRACKTOTAL, ['12'], 'vorbis.TRACKTOTAL');
    assert.deepEqual(vorbis.ALBUM, ['Nevermind'], 'vorbis.ALBUM');
    assert.deepEqual(vorbis.COMMENT, ["Nirvana's Greatest Album"], 'vorbis.COMMENT');
    assert.deepEqual(vorbis.GENRE, ['Grunge', 'Alternative'], 'vorbis.GENRE');
    assert.deepEqual(vorbis.TITLE, ['In Bloom'], 'vorbis.TITLE');

    const cover = vorbis.METADATA_BLOCK_PICTURE[0] as IVorbisPicture;

    assert.strictEqual(cover!.format, 'image/jpeg', 'vorbis.METADATA_BLOCK_PICTURE format');
    assert.strictEqual(cover.type, 'Cover (front)', 'vorbis.METADATA_BLOCK_PICTURE tagTypes');
    // test exact contents too
    assert.strictEqual(cover.data.length, 30966, 'vorbis.METADATA_BLOCK_PICTURE length');
    assert.strictEqual(cover.data[0], 255, 'vorbis.METADATA_BLOCK_PICTURE data 0');
    assert.strictEqual(cover.data[1], 216, 'vorbis.METADATA_BLOCK_PICTURE data 1');
    assert.strictEqual(cover.data[cover.data.length - 1], 217, 'vorbis.METADATA_BLOCK_PICTURE data -1');
    assert.strictEqual(cover.data[cover.data.length - 2], 255, 'vorbis.METADATA_BLOCK_PICTURE data -2');
  }

  describe('Different Ogg formats', () => {
    it('should handle Ogg/Vorbis', async () => {
      const filePath = path.join(oggSamplePath, 'audio.vorbis.ogg');
      const { format } = await mm.parseFile(filePath);
      assert.deepEqual(format.codec, 'Vorbis I', 'format.codec');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasAudio');
    });

    it('should handle Ogg/Speex', async () => {
      const filePath = path.join(oggSamplePath, 'audio.speex.ogg');
      const { format } = await mm.parseFile(filePath);
      assert.deepEqual(format.codec, 'Speex 1.2.0', 'format.codec');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasAudio');
    });

    it('should handle Ogg/Opus', async () => {
      const filePath = path.join(oggSamplePath, 'audio.opus.ogg');
      const { format } = await mm.parseFile(filePath);
      assert.deepEqual(format.codec, 'Opus', 'format.codec');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasAudio');
    });

    it('should handle Ogg/FLAC', async () => {
      const filePath = path.join(oggSamplePath, 'audio.flac.ogg');
      const { format } = await mm.parseFile(filePath);
      assert.deepEqual(format.codec, 'FLAC', 'format.codec');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasAudio');
    });

    it('should handle Ogg/Theora', async () => {
      const filePath = path.join(oggSamplePath, 'short.ogv');
      const { format } = await mm.parseFile(filePath);
      assert.deepEqual(format.codec, 'Vorbis I', 'format.codec');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isTrue(format.hasVideo, 'format.hasVideo');
    });
  });

  describe('Ogg Skeleton', () => {
    for (const { filename, codec, hasAudio, hasVideo } of [
      { filename: 'ogg-vorbis-skeleton-v3.ogg', codec: 'Vorbis I', hasAudio: true, hasVideo: false },
      { filename: 'ogg-vorbis-skeleton-v4.ogg', codec: 'Vorbis I', hasAudio: true, hasVideo: false },
      { filename: 'ogg-opus-skeleton-v3.ogg', codec: 'Opus', hasAudio: true, hasVideo: false },
      { filename: 'ogg-speex-skeleton-v3.ogg', codec: 'Speex 1.2.0', hasAudio: true, hasVideo: false },
      { filename: 'ogg-flac-skeleton-v3.ogg', codec: 'FLAC', hasAudio: true, hasVideo: false },
      { filename: 'ogg-theora-skeleton-v3.ogg', codec: 'Theora', hasAudio: false, hasVideo: true }
    ]) {
      describe(filename, () => {
        for (const parser of Parsers) {
          it(parser.description, async function () {
            // A .ogg path selects the parser for files. Streams use an explicit MIME hint,
            // so this regression remains independent of application/ogg parser selection.
            const { format, quality } = await parser.parse(
              () => this.skip(),
              path.join(oggSamplePath, filename),
              'audio/ogg'
            );
            assert.strictEqual(format.container, 'Ogg');
            assert.strictEqual(format.codec, codec);
            assert.strictEqual(format.hasAudio, hasAudio, 'format.hasAudio');
            assert.strictEqual(format.hasVideo, hasVideo, 'format.hasVideo');
            if (hasAudio) {
              assert.strictEqual(format.sampleRate, 8000);
              assert.strictEqual(format.numberOfChannels, 1);
            }
            assert.isEmpty(quality.warnings);
          });
        }
      });
    }
  });

  describe('Parsing Ogg/Vorbis', () => {
    describe('decode: nirvana-2sec.vorbis.ogg', () => {
      const filePath = path.join(oggSamplePath, 'nirvana-2sec.vorbis.ogg');

      function checkFormat(format: mm.IFormat) {
        assert.deepEqual(format.tagTypes, ['vorbis'], 'format.tagTypes');
        assert.strictEqual(format.duration, 2.0, 'format.duration [seconds]');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate [hz]');
        assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels = 2 (stereo)');
        assert.strictEqual(format.bitrate, 64000, 'format.bitrate [bit/sec]');
        assert.isTrue(format.hasAudio, 'format.hasAudio');
        assert.isFalse(format.hasVideo, 'format.hasAudio');
      }

      Parsers.forEach(parser => {
        it(parser.description, async function () {
          const { format, native, common } = await parser.parse(() => this.skip(), filePath, 'audio/ogg');
          checkFormat(format);
          check_Nirvana_In_Bloom_VorbisTags(mm.orderTags(native.vorbis));
          check_Nirvana_In_Bloom_commonTags(common);
        });
      });
    });

    it('should handle page not finalized with the lastPage flag', async () => {
      const filePath = path.join(oggSamplePath, 'issue_62.ogg');

      const { format, common, quality } = await mm.parseFile(filePath);

      assert.deepEqual(format.tagTypes, ['vorbis'], 'format.tagTypes');
      // assert.strictEqual(format.duration, 2.0, 'format.duration = 2.0 sec');
      assert.strictEqual(format.sampleRate, 22050, 'format.sampleRate = 44.1 kHz');
      assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels = 2 (stereo)');
      assert.strictEqual(format.bitrate, 56000, 'bitrate = 64 kbit/sec');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasAudio');

      // Following is part a page which is not correctly finalized with lastPage flag
      assert.isDefined(common.title, 'should provide: metadata.common.title');
      assert.equal(common.title, 'Al-Fatihah', 'metadata.common.title');
      assert.equal(common.artist, 'Mishary Alafasi - www.TvQuran.com', 'metadata.common.artist');

      assert.includeDeepMembers(quality.warnings, [
        { message: 'Corrupt Ogg content at 333' },
        { message: 'End-of-stream reached before reaching last page in Ogg stream serial=0' }
      ]);
    });

    /**
     * Related issue: https://github.com/Borewit/music-metadata/issues/70
     */
    it("should not fail on an Ogg/Vorbis 'Setup header'", async () => {
      const filePath = path.join(oggSamplePath, 'issue_70.ogg');

      const { format, native, common } = await mm.parseFile(filePath);
      assert.strictEqual(format.container, 'Ogg', 'format.container');
      assert.strictEqual(format.codec, 'Vorbis I', 'format.codec');
      assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasAudio');

      const vorbis = mm.orderTags(native.vorbis);
      assert.deepEqual(vorbis.ALBUM, ['Dropsonde']);
      assert.deepEqual(vorbis.ARTIST, ['Biosphere']);
      assert.deepEqual(vorbis['ALBUM ARTIST'], ['Biosphere']);
      assert.deepEqual(vorbis.ORGANIZATION, ['Touch UK']);
      assert.deepEqual(common.label, ['Touch UK'], 'ORGANIZATION maps to common.label');
      assert.deepEqual(vorbis.DATE, ['2006']);
      assert.deepEqual(vorbis.RATING, ['-1']);
      assert.deepEqual(vorbis.REPLAYGAIN_TRACK_PEAK, ['0.999969']);
      assert.deepEqual(vorbis.REPLAYGAIN_TRACK_GAIN, ['0.440000 dB']);
      assert.deepEqual(vorbis.REPLAYGAIN_ALBUM_GAIN, ['0.440000 dB']);
    });

    it('check for ogg-multipage-metadata-bug', async () => {
      const filePath = path.join(oggSamplePath, 'ogg-multipagemetadata-bug.ogg');

      const { format, common } = await mm.parseFile(filePath);

      assert.strictEqual(format.container, 'Ogg', 'format.container');
      assert.strictEqual(format.codec, 'Vorbis I', 'format.codec');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasAudio');

      assert.strictEqual(common.title, 'Modestep - To The Stars (Break the Noize & The Autobots Remix)', 'title');
      assert.strictEqual(common.artist, 'Break The Noize & The Autobots', 'artist');
      assert.strictEqual(common.albumartist, 'Modestep', 'albumartist');
      assert.strictEqual(common.album, 'To The Stars', 'album');
      assert.strictEqual(common.date, '2011-01-01', 'year');
      assert.strictEqual(common.track.no, 2, 'track no');
      assert.strictEqual(common.track.of, 5, 'track of');
      assert.strictEqual(common.disk.no, 1, 'disk no');
      assert.strictEqual(common.disk.of, 1, 'disk of');
      assert.strictEqual(common.genre![0], 'Dubstep', 'genre');
      assert.strictEqual(common.picture![0].format, 'image/jpeg', 'picture format');
      assert.strictEqual(common.picture![0].data.length, 207439, 'picture length');
    });

    // https://github.com/Borewit/music-metadata/issues/2518
    describe('calculate duration', () => {
      it('should not calculate duration, when the duration flag is not set', async () => {
        const filePath = path.join(oggSamplePath, 'issue_70.ogg');
        const { format } = await mm.parseFile(filePath);
        assert.strictEqual(format.codec, 'Vorbis I', 'format.codec');
        assert.isUndefined(format.duration, 'format.duration');
      });

      it('should calculate duration, when the duration flag is set', async () => {
        const filePath = path.join(oggSamplePath, 'issue_70.ogg');
        const { format } = await mm.parseFile(filePath, { duration: true });
        assert.strictEqual(format.codec, 'Vorbis I', 'format.codec');
        assert.approximately(format.duration!, 1.32, 0.005, 'format.duration');
      });
    });
  });

  describe('Parsing Ogg/Opus', () => {
    describe('components', () => {
      it('IdHeader should throw error if data is shorter than header', () => {
        try {
          const _idHeader = new IdHeader(18);
        } catch (err) {
          expect((err as Error).message).to.equal('ID-header-page 0 should be at least 19 bytes long');
        }
      });
    });

    describe('decode: nirvana-2sec.opus.ogg', () => {
      const filePath = path.join(oggSamplePath, 'nirvana-2sec.opus.ogg');

      function checkFormat(format: IFormat) {
        assert.deepEqual(format.tagTypes, ['vorbis'], 'format.tagTypes');
        assert.strictEqual(format.numberOfSamples, 96000, 'format.numberOfSamples = 96000');
        assert.approximately(format.duration!, 2.0, 1 / 200, 'format.duration = 2.0 sec');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels = 2 (stereo)');
        assert.isTrue(format.hasAudio, 'format.hasAudio');
        assert.isFalse(format.hasVideo, 'format.hasAudio');
        // assert.strictEqual(format.bitrate, 64000, 'bitrate = 64 kbit/sec');
      }

      Parsers.forEach(parser => {
        it(parser.description, async function () {
          const { format, native, common } = await parser.parse(() => this.skip(), filePath, 'audio/ogg');
          checkFormat(format);
          check_Nirvana_In_Bloom_VorbisTags(mm.orderTags(native.vorbis));
          check_Nirvana_In_Bloom_commonTags(common);
        });
      });
    });
  });

  describe('Parsing Ogg/Speex', () => {
    describe("decode: 'female_scrub.spx'", () => {
      const filePath = path.join(samplePath, 'female_scrub.spx');

      function checkFormat(format: IFormat) {
        assert.strictEqual(format.container, 'Ogg', 'format.container');
        assert.strictEqual(format.codec, 'Speex 1.0beta1');
        assert.strictEqual(format.sampleRate, 8000, 'format.sampleRate = 8 kHz');
        assert.isTrue(format.hasAudio, 'format.hasAudio');
        assert.isFalse(format.hasVideo, 'format.hasAudio');
      }

      Parsers.forEach(parser => {
        it(parser.description, async function () {
          const { format } = await parser.parse(() => this.skip(), filePath, 'audio/ogg');
          checkFormat(format);
        });
      });
    });

    describe("decode: 'speex-with-comments.spx'", () => {
      const filePath = path.join(oggSamplePath, 'speex-with-comments.spx');

      Parsers.forEach(parser => {
        it(parser.description, async function () {
          const { format, common } = await parser.parse(() => this.skip(), filePath, 'audio/ogg');
          assert.strictEqual(format.container, 'Ogg', 'format.container');
          assert.isTrue(format.codec?.startsWith('Speex'), 'format.codec');
          assert.deepEqual(format.tagTypes, ['vorbis'], 'format.tagTypes');
          assert.strictEqual(common.title, 'Speex Test Title', 'common.title');
          assert.strictEqual(common.artist, 'Speex Test Artist', 'common.artist');
          assert.strictEqual(common.album, 'Speex Test Album', 'common.album');
        });
      });
    });
  });

  describe('Parsing Ogg/Theora', () => {
    it('Parse short.ogv', async () => {
      const filePath = path.join(oggSamplePath, 'short.ogv');

      const { format } = await mm.parseFile(filePath, { duration: true });

      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isTrue(format.hasVideo, 'format.hasAudio');
      assert.approximately(format.duration!, 5.758548752834467, 1 / 1000000, 'format.duration');
    });
  });

  describe('Parsing Ogg/Flac', () => {
    describe('Ogg/FLAC metadata packets', () => {
      function uint32(value: number, little = false): Buffer {
        const data = Buffer.alloc(4);
        if (little) {
          data.writeUInt32LE(value);
        } else {
          data.writeUInt32BE(value);
        }
        return data;
      }

      function block(type: number, body: Buffer, last = false): Buffer {
        const header = Buffer.alloc(4);
        header[0] = type | (last ? 0x80 : 0);
        header.writeUIntBE(body.length, 1, 3);
        return Buffer.concat([header, body]);
      }

      function comment(title: string, last = true): Buffer {
        const text = Buffer.from(`TITLE=${title}`);
        return block(4, Buffer.concat([uint32(0, true), uint32(1, true), uint32(text.length, true), text]), last);
      }

      function page(data: Buffer, lacing: number[], sequence: number, flags = 0, serial = 123): Buffer {
        const header = Buffer.alloc(27);
        header.write('OggS');
        header[5] = flags;
        header.writeUInt32LE(serial, 14);
        header.writeUInt32LE(sequence, 18);
        header[26] = lacing.length;
        return Buffer.concat([header, Buffer.from(lacing), data]);
      }

      function lace(packet: Buffer): number[] {
        return [...new Array(Math.floor(packet.length / 255)).fill(255), packet.length % 255];
      }

      function picture(): Buffer {
        const mime = Buffer.from('image/jpeg');
        const properties = Buffer.alloc(24);
        properties.writeUInt32BE(1, 4);
        properties.writeUInt32BE(1, 8);
        properties.writeUInt32BE(24, 12);
        properties.writeUInt32BE(4, 20);
        return Buffer.concat([uint32(3), uint32(mime.length), mime, properties, Buffer.from([255, 216, 255, 217])]);
      }

      let identification: Buffer;
      before(async () => {
        const fixture = await readFile(path.join(samplePath, 'ogg/audio.flac.ogg'));
        identification = Buffer.from(fixture.subarray(28, 79));
        identification.writeUInt16BE(0, 7); // Unknown header count permits synthetic metadata layouts.
      });

      function fixture(...pages: Buffer[]): Buffer {
        return Buffer.concat([page(identification, [51], 0, 2), ...pages]);
      }

      function parseMetadataPacket(packet: Buffer, options: IOptions = {}) {
        return mm.parseBuffer(fixture(page(packet, lace(packet), 1, 4)), 'audio/ogg', options);
      }

      it('exposes the existing fixture title and native comments for files and streams', async () => {
        const file = path.join(samplePath, 'ogg/audio.flac.ogg');
        const data = await readFile(file);
        for (const metadata of [
          await mm.parseFile(file),
          await mm.parseStream(Readable.from([data], { objectMode: false }), 'audio/ogg')
        ]) {
          assert.equal(metadata.common.title, 'audio.flac');
          assert.includeDeepMembers(metadata.native.vorbis, [{ id: 'TITLE', value: 'audio.flac' }]);
        }
      });

      // This playable sample has a comment spanning 16 pages. Its final metadata
      // page finishes that comment, then holds padding (including a 255-byte
      // packet with a zero lacing terminator), application, seektable, cuesheet
      // and picture packets. Audio follows the metadata.
      const metadataFixture = path.join(oggSamplePath, 'flac-metadata-packets.ogg');

      for (const duration of [false, true]) {
        for (const skipCovers of [false, true]) {
          for (const parser of Parsers) {
            it(`parses metadata packets from ${parser.description}, skipCovers=${skipCovers}, duration=${duration}`, async function () {
              const metadata = await parser.parse(() => this.skip(), metadataFixture, 'audio/ogg', {
                duration,
                skipCovers
              });
              assert.equal(metadata.common.title, 'A'.repeat(4000));
              assert.includeDeepMembers(metadata.native.vorbis, [{ id: 'TITLE', value: 'A'.repeat(4000) }]);
              assert.equal(metadata.format.codec, 'FLAC');
              assert.equal(metadata.format.sampleRate, 44100);
              if (duration) {
                assert.equal(metadata.format.numberOfSamples, 4410);
                assert.equal(metadata.format.duration, 0.1);
              }
              assert.isEmpty(metadata.quality.warnings);
              if (skipCovers) {
                assert.isUndefined(metadata.common.picture);
              } else {
                const picture = metadata.common.picture[0];
                assert.equal(picture.format, 'image/png');
                assert.equal(picture.data.length, 69);
                assert.deepEqual(picture.data.subarray(0, 8), Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]));
              }
            });
          }
        }
      }

      it('consumes the fixture without skipping following source bytes', async () => {
        const data = await readFile(metadataFixture);
        const tokenizer = fromBuffer(Buffer.concat([data, Buffer.from([99])]), {
          fileInfo: { mimeType: 'audio/ogg' }
        });
        try {
          const metadata = await mm.parseFromTokenizer(tokenizer, { duration: true });
          assert.equal(metadata.common.title, 'A'.repeat(4000));
          assert.equal(tokenizer.position, data.length);
          const following = new Uint8Array(1);
          await tokenizer.readBuffer(following);
          assert.equal(following[0], 99);
        } finally {
          await tokenizer.close();
        }
      });

      it('keeps packet assembly independent between logical streams', async () => {
        const metadata = await mm.parseFile(path.join(oggSamplePath, 'flac-interleaved-metadata.ogg'), {
          duration: true
        });
        assert.includeDeepMembers(metadata.native.vorbis, [
          { id: 'TITLE', value: 'First'.repeat(60) },
          { id: 'TITLE', value: 'Second' }
        ]);
        assert.isEmpty(metadata.quality.warnings);
      });

      for (const continued of [false, true]) {
        it(`rejects inconsistent continuation (pending=${!continued})`, async () => {
          const pages = continued ? [] : [page(Buffer.alloc(255), [255], 1)];
          pages.push(page(Buffer.alloc(1), [1], 2, continued ? 5 : 4));
          await rejects(mm.parseBuffer(fixture(...pages), 'audio/ogg'), UnexpectedFileContentError);
        });
      }

      it('rejects truncated metadata at physical EOF', async () => {
        const data = fixture(page(Buffer.alloc(255), [255], 1));
        await rejects(mm.parseBuffer(data, 'audio/ogg'), UnexpectedFileContentError);
      });

      for (const length of [0, 3]) {
        it(`rejects a ${length}-byte metadata header`, async () => {
          await rejects(parseMetadataPacket(Buffer.alloc(length)), UnexpectedFileContentError);
        });
      }

      it('rejects a block that declares bytes outside its packet', async () => {
        const packet = block(4, Buffer.alloc(8), true);
        packet.writeUIntBE(100, 1, 3);
        await rejects(parseMetadataPacket(packet), UnexpectedFileContentError);
      });

      it('enforces the accumulated packet allocation limit', async () => {
        const data = fixture(page(Buffer.alloc(255), [255], 1), page(Buffer.alloc(255), [255], 2, 1));
        await rejects(mm.parseBuffer(data, 'audio/ogg', { maxMemoryAllocation: 300 }), UnexpectedFileContentError);
      });

      it('enforces buffered segment and decoded comment limits', async () => {
        const data = fixture(page(Buffer.alloc(510), [255, 255], 1));
        await rejects(mm.parseBuffer(data, 'audio/ogg', { maxMetadataEntries: 1 }), UnexpectedFileContentError);
        const packet = block(
          4,
          Buffer.concat([uint32(0, true), uint32(2, true), uint32(0, true), uint32(0, true)]),
          true
        );
        await rejects(parseMetadataPacket(packet, { maxMetadataEntries: 1 }), UnexpectedFileContentError);
      });

      for (const field of ['header', 'mime', 'description', 'data']) {
        it(`rejects an invalid picture ${field} without a raw bounds error`, async () => {
          let data = picture();
          if (field === 'header') {
            data = data.subarray(0, 31);
          } else if (field === 'mime') {
            data.writeUInt32BE(0xffffffff, 4);
          } else if (field === 'description') {
            data.writeUInt32BE(0xffffffff, 18);
          } else {
            data.writeUInt32BE(0xffffffff, data.length - 8);
          }
          const packet = block(6, data, true);
          await rejects(parseMetadataPacket(packet), UnexpectedFileContentError);
        });
      }

      for (const fault of ['length', 'marker', 'version', 'stream-type', 'stream-length']) {
        it(`rejects an invalid identification ${fault}`, async () => {
          let packet = Buffer.from(identification);
          switch (fault) {
            case 'length':
              packet = packet.subarray(0, 50);
              break;
            case 'marker':
              packet[0] = 0;
              break;
            case 'version':
              packet[5] = 2;
              break;
            case 'stream-type':
              packet[13] = 1;
              break;
            case 'stream-length':
              packet[16] = 33;
              break;
          }
          await rejects(mm.parseBuffer(page(packet, lace(packet), 0, 2), 'audio/ogg'), UnexpectedFileContentError);
        });
      }

      it('rejects repeated STREAMINFO after identification', async () => {
        const packet = block(0, Buffer.alloc(34), true);
        await rejects(parseMetadataPacket(packet), UnexpectedFileContentError);
      });

      it('rejects a page whose lacing does not account for its payload', async () => {
        // Inconsistent lacing/payload arguments cannot be produced by the public parser.
        const parser = new FlacStream(new MetadataCollector({}), {}, fromBuffer(new Uint8Array()));
        const header = PageHeader.get(Buffer.alloc(27), 0);
        await parser.parsePage(header, identification, Uint8Array.from([51]));
        await rejects(parser.parsePage(header, Buffer.alloc(4), Uint8Array.from([3])), UnexpectedFileContentError);
      });

      it('rejects a stream ending before the metadata-end marker', async () => {
        await rejects(parseMetadataPacket(comment('Not final', false)), UnexpectedFileContentError);
      });

      it('reports unknown metadata blocks while preserving following metadata', async () => {
        const packets = [block(99, Buffer.alloc(3)), comment('After unknown block')];
        const data = fixture(page(Buffer.concat(packets), packets.flatMap(lace), 1, 4));
        const metadata = await mm.parseBuffer(data, 'audio/ogg');
        assert.equal(metadata.common.title, 'After unknown block');
        assert.deepEqual(metadata.quality.warnings, [{ message: 'Unknown block type: 99' }]);
      });

      it('calculates lacing at nonzero token and view offsets', () => {
        const header = PageHeader.get(Buffer.alloc(27), 0);
        header.page_segments = 2;
        const data = Uint8Array.from([99, 88, 0, 255, 4, 77]).subarray(1);
        const table = new SegmentTable(header).get(data, 2);
        assert.equal(table.totalPageSize, 259);
        assert.deepEqual(table.lacingValues, Uint8Array.from([255, 4]));
      });
    });

    describe('truncated stream with an unknown final granule position', () => {
      // Ogg framing: absolute granule position -1 means no packet finishes on this page.
      // The fixture ends before the early-stop threshold, so both options reach EOF.
      const filePath = path.join(oggSamplePath, 'flac-truncated-unknown-granule.ogg');

      for (const duration of [false, true]) {
        for (const parser of Parsers) {
          it(`${parser.description}, duration=${duration}`, async function () {
            const { format, quality } = await parser.parse(() => this.skip(), filePath, 'audio/ogg', { duration });

            assert.strictEqual(format.container, 'Ogg');
            assert.strictEqual(format.codec, 'FLAC');
            assert.strictEqual(format.sampleRate, 44100);
            assert.strictEqual(format.numberOfSamples, 9216, 'last completed FLAC frames');
            assert.strictEqual(format.duration, 9216 / 44100, 'duration of completed frames');
            assert.deepEqual(quality.warnings, [
              { message: 'End-of-stream reached before reaching last page in Ogg stream serial=3102963583' }
            ]);
          });
        }
      }
    });

    it('does not calculate duration if no valid granule position was seen', async () => {
      const metadata = new MetadataCollector({});
      metadata.setFormat('sampleRate', 44100);
      const stream = new FlacStream(metadata, {}, fromBuffer(new Uint8Array()));
      const header = Buffer.alloc(PageHeader.len);
      header[5] = 4; // End-of-stream page with an unknown granule position.
      header.writeBigUInt64LE(0xffffffffffffffffn, 6);

      await stream.parsePage(PageHeader.get(header, 0), new Uint8Array());
      stream.calculateDuration(true);

      assert.isUndefined(metadata.format.numberOfSamples);
      assert.isUndefined(metadata.format.duration);
    });

    it('Parse audio.flac.ogg', async () => {
      const filePath = path.join(oggSamplePath, 'audio.flac.ogg');
      const { format } = await mm.parseFile(filePath);

      assert.strictEqual(format.container, 'Ogg', 'format.container');
      assert.strictEqual(format.codec, 'FLAC', 'format.codec');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasAudio');
      assert.isTrue(format.lossless, 'format.lossless');
      assert.strictEqual(format.sampleRate, 44100, 'format.bitrate');
    });

    // https://github.com/Borewit/music-metadata/issues/2779
    // The fixture has 16 pages, exceeding the parser's early-stop threshold.
    describe('duration scanning', () => {
      for (const duration of [false, true]) {
        for (const parser of Parsers) {
          it(`${parser.description}, duration=${duration}`, async function () {
            const filePath = path.join(oggSamplePath, 'audio.flac.ogg');
            const { format, quality } = await parser.parse(() => this.skip(), filePath, 'audio/ogg', { duration });

            assert.strictEqual(format.codec, 'FLAC');
            assert.isEmpty(quality.warnings, 'intentional early exit must not report truncation');
            if (duration) {
              // Last page absolute granule position: 128180 samples at 44.1 kHz.
              assert.strictEqual(format.numberOfSamples, 128180);
              assert.strictEqual(format.duration, 128180 / 44100);
            } else {
              assert.isUndefined(format.numberOfSamples);
              assert.isUndefined(format.duration);
            }
          });
        }
      }
    });
  });

  describe('DESCRIPTION & PUBLISHER mapping', () => {
    const filePath = path.join(oggSamplePath, 'vorbis-description.ogg');

    Parsers.forEach(parser => {
      it(parser.description, async function () {
        const { common, native } = await parser.parse(() => this.skip(), filePath, 'audio/ogg');
        const vorbis = mm.orderTags(native.vorbis);

        assert.deepEqual(vorbis.DESCRIPTION, ['A remark about this file'], 'vorbis.DESCRIPTION');
        assert.deepEqual(vorbis.PUBLISHER, ['Test Label'], 'vorbis.PUBLISHER');
        assert.strictEqual(common.title, 'Vorbis Comment Test', 'common.title');
        assert.deepEqual(common.comment, [{ text: 'A remark about this file' }], 'common.comment');
        assert.deepEqual(common.label, ['Test Label'], 'common.label');
      });
    });
  });

  it('RATING mapping', async () => {
    const filePath = path.join(samplePath, 'rating', 'testcase.opus');
    const { common } = await mm.parseFile(filePath);

    assert.isDefined(common.rating, 'Expect rating property to be present');
    assert.equal(common.rating[0].rating, 0.8, 'Vorbis tag rating score of 80%');
    assert.equal(mm.ratingToStars(common.rating[0].rating), 4, 'Vorbis tag rating conversion');
  });

  describe('Calculate duration', () => {
    it('with proper last page header', async () => {
      const filePath = path.join(oggSamplePath, 'last-page.oga');

      const { format } = await mm.parseFile(filePath);

      assert.strictEqual(format.container, 'Ogg', 'format.container');
      assert.strictEqual(format.codec, 'Opus', 'format.codec');
      assert.strictEqual(format.sampleRate, 48000, 'format.sampleRate');
      assert.strictEqual(format.numberOfSamples, 253440, 'format.numberOfSamples');
      assert.approximately(format.duration!, 5.28, 1 / 200, 'format.duration');
    });

    it('with no last page', async () => {
      const filePath = path.join(oggSamplePath, 'no-last-page.oga');

      const { format, quality } = await mm.parseFile(filePath, { duration: true });

      assert.strictEqual(format.container, 'Ogg', 'format.container');
      assert.strictEqual(format.codec, 'Opus', 'format.codec');
      assert.strictEqual(format.sampleRate, 16000, 'format.sampleRate');
      assert.strictEqual(format.numberOfSamples, 270720, 'format.numberOfSamples');
      assert.approximately(format.duration!, 5.64, 1 / 200, 'format.duration');

      assert.includeDeepMembers(quality.warnings, [
        { message: 'End-of-stream reached before reaching last page in Ogg stream serial=0' }
      ]);
    });
  });

  // Issue: https://github.com/Borewit/music-metadata/issues/2518
  describe('Ogg/Opus duration', async () => {
    it('duration-flag=false', async () => {
      const filePath = path.join(oggSamplePath, 'issue-2518.ogg');
      const { format } = await mm.parseFile(filePath);

      assert.strictEqual(format.container, 'Ogg', 'format.container');
      assert.strictEqual(format.codec, 'Opus', 'format.codec');
      assert.strictEqual(format.sampleRate, 48000, 'format.sampleRate');
      assert.isUndefined(format.numberOfSamples, 'format.numberOfSamples');
      assert.isUndefined(format.duration, 'format.duration');
    });

    it('duration-flag=true', async () => {
      const filePath = path.join(oggSamplePath, 'issue-2518.ogg');
      const { format } = await mm.parseFile(filePath, { duration: true });

      assert.strictEqual(format.container, 'Ogg', 'format.container');
      assert.strictEqual(format.codec, 'Opus', 'format.codec');
      assert.strictEqual(format.sampleRate, 48000, 'format.sampleRate');
      assert.strictEqual(format.numberOfSamples, 843840, 'format.numberOfSamples');
      assert.strictEqual(format.duration, 17.58, 'format.duration');
    });
  });

  describe('MIME detection', () => {
    const fixture = path.join(samplePath, 'ogg', 'ogg-vorbis-skeleton-v3.ogg');

    for (const mime of ['application/ogg', 'application/ogg; codecs=vorbis']) {
      it(`selects the Ogg parser for ${mime}`, () => {
        assert.strictEqual(new ParserFactory().findLoaderForContentType(mime)?.parserType, 'ogg');
      });
    }

    it('includes application/ogg in supported MIME types', () => {
      assert.include(mm.getSupportedMimeTypes(), 'application/ogg');
    });

    for (const mime of [undefined, 'application/ogg']) {
      for (const streamInput of [false, true]) {
        it(`parses Skeleton in a ${streamInput ? 'stream' : 'buffer'} ${mime ? 'with a MIME hint' : 'by content'}`, async () => {
          const data = await readFile(fixture);
          const { format } = streamInput
            ? await mm.parseStream(Readable.from([data], { objectMode: false }), mime)
            : await mm.parseBuffer(data, mime);
          assert.strictEqual(format.container, 'Ogg');
          assert.strictEqual(format.codec, 'Vorbis I');
          assert.strictEqual(format.sampleRate, 8000);
          assert.strictEqual(format.numberOfChannels, 1);
        });
      }
    }

    it('parses Skeleton from an unhinted tokenizer', async () => {
      const { format } = await mm.parseFromTokenizer(fromBuffer(await readFile(fixture)));
      assert.strictEqual(format.container, 'Ogg');
      assert.strictEqual(format.codec, 'Vorbis I');
      assert.strictEqual(format.sampleRate, 8000);
      assert.strictEqual(format.numberOfChannels, 1);
    });
  });

  // https://github.com/Borewit/music-metadata/issues/2638
  // Derived from UNDO UNDO.ogg on issues/2638, retaining the headers and first two
  // audio pages. The final page has an updated end-of-stream flag and CRC.
  // The picture comment continues beyond page 13, where early exit truncated Base64.

  describe('Ogg comments spanning many pages', () => {
    it('keeps metadata incomplete until all comment continuation pages have been assembled', async () => {
      const data = await readFile(path.join(oggSamplePath, 'issue-2638.ogg'));
      const metadata = new MetadataCollector({});
      const stream = new VorbisStream(metadata, {});
      let offset = 0;

      // Pages 1 through 81 contain one comment packet. Page 82 starts the next packet,
      // causing the accumulated comment pages to be parsed together.
      for (let page = 0; page <= 82; ++page) {
        const header = PageHeader.get(data, offset);
        assert.strictEqual(header.pageSequenceNo, page);
        offset += PageHeader.len;
        const segments = new SegmentTable(header);
        const { totalPageSize } = segments.get(data, offset);
        offset += segments.len;
        await stream.parsePage(header, data.subarray(offset, offset + totalPageSize));
        offset += totalPageSize;

        if (page < 82) {
          assert.isFalse(stream.isMetadataComplete, `metadata incomplete after page ${page}`);
          assert.isUndefined(metadata.native.vorbis, `no partial comments parsed after page ${page}`);
        }
      }

      assert.isTrue(stream.isMetadataComplete);
      const picture = metadata.common.picture![0];
      assert.lengthOf(picture.data, 491399);
      assert.deepEqual(Array.from(picture.data.slice(-2)), [0xff, 0xd9], 'complete JPEG');
      assert.isEmpty(metadata.quality.warnings);
    });

    for (const duration of [false, true]) {
      for (const skipCovers of [false, true]) {
        for (const parser of Parsers) {
          it(`issue-2638.ogg, ${parser.description}, duration=${duration}, skipCovers=${skipCovers}`, async function () {
            const filePath = path.join(oggSamplePath, 'issue-2638.ogg');
            const { common, native, format, quality } = await parser.parse(() => this.skip(), filePath, 'audio/ogg', {
              duration,
              skipCovers
            });
            if (skipCovers) {
              assert.isUndefined(common.picture);
              assert.notProperty(mm.orderTags(native.vorbis), 'METADATA_BLOCK_PICTURE');
            } else {
              const picture = common.picture![0];
              assert.strictEqual(picture.format, 'image/jpeg');
              assert.lengthOf(picture.data, 491399);
              assert.deepEqual(Array.from(picture.data.slice(-2)), [0xff, 0xd9], 'complete JPEG');
            }
            assert.isEmpty(quality.warnings);
            assert.strictEqual(format.codec, 'Vorbis I');
            assert.strictEqual(format.sampleRate, 44100);
            if (duration) {
              assert.strictEqual(format.numberOfSamples, 88896);
              assert.strictEqual(format.duration, 88896 / 44100);
            } else {
              assert.isUndefined(format.duration);
              assert.isUndefined(format.numberOfSamples);
            }
          });
        }
      }
    }
  });
});
