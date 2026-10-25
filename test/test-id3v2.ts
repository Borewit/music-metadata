import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { assert, expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { EndOfStreamError, fromBlob, fromBuffer, fromStream, fromWebStream } from 'strtok3';
import { UINT8 } from 'token-types';
import { MetadataCollector } from '../lib/common/MetadataCollector.js';
import { LyricsContentType } from '../lib/core.js';
import { parseEmbeddedID3v2 } from '../lib/id3v2/EmbeddedID3v2.js';
import {
  type Chapter,
  FrameParser,
  Id3v2ContentError,
  parseGenre,
  type TableOfContents
} from '../lib/id3v2/FrameParser.js';
import { ID3v2Parser } from '../lib/id3v2/ID3v2Parser.js';
import type { ID3v2MajorVersion } from '../lib/id3v2/ID3v2Token.js';
import * as mm from '../lib/index.js';
import { parseFromTokenizer } from '../lib/index.js';
import { LyricsContentError, parseLrc } from '../lib/lrc/LyricsParser.js';
import { Parsers } from './metadata-parsers.js';
import { samplePath } from './util.js';

use(chaiAsPromised);

describe('ID3v2', () => {
  describe('Credit role names', () => {
    for (const [major, frame] of [
      [2, 'IPL'],
      [3, 'IPLS'],
      [4, 'TIPL']
    ] as const) {
      for (const stream of [false, true]) {
        it(`maps ID3v2.${major} credits from an MP3 ${stream ? 'stream' : 'file'} while preserving native roles`, async () => {
          const filename = path.join(samplePath, 'mp3', `id3v2.${major}-credit-roles.mp3`);
          const metadata = stream
            ? await mm.parseStream(Readable.from([await readFile(filename)], { objectMode: false }), 'audio/mpeg')
            : await mm.parseFile(filename);
          assert.include(metadata.format.tagTypes, `ID3v2.${major}`);
          assert.equal(metadata.format.codec, 'MPEG 1 Layer 3');
          assert.deepEqual(metadata.common.producer, ['First', 'Second', 'Third', 'Fourth']);
          assert.deepEqual(metadata.common.engineer, ['Engineer']);
          assert.deepEqual(metadata.common.arranger, ['Arranger']);
          assert.deepEqual(metadata.common.djmixer, ['DJ']);
          assert.deepEqual(metadata.common.mixer, ['Mixer']);
          assert.isUndefined(metadata.common.artist);
          assert.isEmpty(metadata.quality.warnings);
          const native = metadata.native[`ID3v2.${major}`];
          assert.deepEqual(native.find(tag => tag.id === frame)?.value, {
            producer: ['First', 'Second', 'Third', ''],
            Producer: ['Fourth'],
            engineer: ['Engineer'],
            arranger: ['Arranger'],
            'DJ-mix': ['DJ'],
            mix: ['Mixer'],
            ['__proto__']: ['Unmapped'],
            guitar: ['Guitarist']
          });
          assert.lengthOf(native, major === 4 ? 2 : 1);
          if (major === 4) {
            assert.deepEqual(native.find(tag => tag.id === 'TMCL')?.value, { producer: ['Instrumentalist'] });
          }
        });
      }
    }

    function fixture(major: 3 | 4, id: string, entries: string[]): Buffer {
      const payload = Buffer.from(`\0${entries.join('\0')}`, 'latin1');
      const header = Buffer.alloc(10);
      header.write(id, 'ascii');
      const syncSafe = (size: number) =>
        Buffer.from([(size >>> 21) & 0x7f, (size >>> 14) & 0x7f, (size >>> 7) & 0x7f, size & 0x7f]);
      if (major === 3) {
        header.writeUInt32BE(payload.length, 4);
      } else {
        header.set(syncSafe(payload.length), 4);
      }
      const frame = Buffer.concat([header, payload]);
      return Buffer.concat([Buffer.from([0x49, 0x44, 0x33, major, 0, 0]), syncSafe(frame.length), frame]);
    }

    for (const [major, id] of [
      [3, 'IPLS'],
      [4, 'TIPL'],
      [4, 'TMCL']
    ] as const) {
      for (const role of ['constructor', 'toString', '__proto__']) {
        it(`preserves the ${id} role ${role} and accumulates repeated credits`, async () => {
          const data = fixture(major, id, [role, 'First,Second', role, 'Third', 'producer', 'Producer']);
          const metadata = await mm.parseBuffer(data, 'audio/mpeg');
          const credits = metadata.native[`ID3v2.${major}`].find(tag => tag.id === id)?.value;
          if (credits === null || typeof credits !== 'object') {
            assert.fail(`Expected ${id} native credit object`);
          }
          assert.deepEqual(credits, { [role]: ['First', 'Second', 'Third'], producer: ['Producer'] });
          assert.isTrue(Object.getOwnPropertyDescriptor(credits, role)?.enumerable);
          assert.strictEqual(Object.getPrototypeOf(credits), Object.prototype);
        });
      }

      it(`preserves empty ${id} people without shifting subsequent roles`, async () => {
        const metadata = await mm.parseBuffer(fixture(major, id, ['producer', '', 'engineer', 'Bob']), 'audio/mpeg');
        const credits = metadata.native[`ID3v2.${major}`].find(tag => tag.id === id)?.value;
        assert.deepEqual(credits, { producer: [''], engineer: ['Bob'] });
      });

      it(`ignores an incomplete ${id} pair while preserving normal repeated roles`, async () => {
        const data = fixture(major, id, ['producer', 'First,Second', 'producer', 'Third', 'unpaired']);
        const metadata = await mm.parseBuffer(data, 'audio/mpeg');
        const credits = metadata.native[`ID3v2.${major}`].find(tag => tag.id === id)?.value;
        assert.deepEqual(credits, { producer: ['First', 'Second', 'Third'] });
      });
    }

    it('rejects text frames that exceed the decoded-value allocation limit', async () => {
      await expect(
        mm.parseBuffer(fixture(4, 'TPE1', ['First', 'Second']), 'audio/mpeg', { maxMetadataEntries: 1 })
      ).to.be.rejectedWith(Id3v2ContentError, 'TPE1 value count 2 exceeds entry limit 1');
    });

    it('accepts separate text lists at the configured entry limit', async () => {
      const tag = fixture(4, 'TPE1', ['First', 'Second']);
      const header = Buffer.from(tag.subarray(0, 10));
      const frames = Buffer.concat([tag.subarray(10), tag.subarray(10)]);
      header[9] = frames.length;
      const metadata = await mm.parseBuffer(Buffer.concat([header, frames]), 'audio/mpeg', { maxMetadataEntries: 2 });
      assert.lengthOf(metadata.native['ID3v2.4'], 4);
    });

    it('bounds genres expanded from parenthesized ID3 codes', async () => {
      await expect(
        mm.parseBuffer(fixture(4, 'TCON', ['(0)(1)']), 'audio/mpeg', { maxMetadataEntries: 1 })
      ).to.be.rejectedWith(Id3v2ContentError, 'TCON value count 2 exceeds entry limit 1');
    });

    it('bounds frame counts even when frames do not produce split text values', async () => {
      const tag = fixture(4, 'TIT2', ['Title']);
      const header = Buffer.from(tag.subarray(0, 10));
      const frames = Buffer.concat([tag.subarray(10), tag.subarray(10)]);
      header[9] = frames.length;
      await expect(
        mm.parseBuffer(Buffer.concat([header, frames]), 'audio/mpeg', { maxMetadataEntries: 1 })
      ).to.be.rejectedWith(Id3v2ContentError, 'Frame count exceeds entry limit');
    });
  });

  describe('Structured user text', () => {
    const xml = '<Markers><Marker><Name>Intro</Name><Time>00:00.000</Time></Marker></Markers>';
    for (const major of [3, 4] as const) {
      for (const parser of Parsers) {
        it(`preserves ID3v2.${major} XML and literal slashes with ${parser.description}`, async function () {
          const { native, common, format, quality } = await parser.parse(
            () => this.skip(),
            path.join(samplePath, 'mp3', `id3v2.${major}-structured-txxx.mp3`),
            'audio/mpeg'
          );
          const tags = mm.orderTags(native[`ID3v2.${major}`]);
          assert.deepEqual(tags['TXXX:OverDrive MediaMarkers'], [xml]);
          assert.deepEqual(tags['TXXX:Website'], ['https://example.org/books/one']);
          assert.deepEqual(tags['TXXX:LICENSE'], ['https://creativecommons.org/licenses/by/4.0/']);
          assert.deepEqual(tags['TXXX:CATALOGNUMBER'], ['ABC/123']);
          assert.deepEqual(tags['TXXX:Custom JSON'], ['{"path":"books/one","url":"https://example.org/a/b"}']);
          assert.deepEqual(common.catalognumber, ['ABC/123']);
          assert.deepEqual(common.artists, major === 3 ? ['First', 'Second'] : ['First/Second']);
          assert.deepEqual(common.releasetype, major === 3 ? ['album', 'live'] : ['album/live']);
          assert.deepEqual(
            common.musicbrainz_artistid,
            major === 3
              ? ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222']
              : ['11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222']
          );
          assert.deepEqual(common.isrc, major === 3 ? ['USABC2400001', 'USABC2400002'] : ['USABC2400001/USABC2400002']);
          assert.equal(format.codec, 'MPEG 1 Layer 3');
          assert.isAbove(format.duration ?? 0, 1);
          assert.isEmpty(quality.warnings);
        });
      }
      for (const description of [
        'Artists',
        'musicbrainz artist id',
        'MusicBrainz Album Artist Id',
        'MusicBrainz Album Type',
        'ISRC'
      ]) {
        it(`retains ID3v2.${major} ${description} separator compatibility and its value limit`, () => {
          const parser = new FrameParser(major, { addWarning: () => assert.fail('Unexpected warning') }, 2);
          assert.deepEqual(parser.readData(Buffer.from(`\0${description}\0First / Second`), 'TXXX', false), {
            description,
            text: major === 3 ? ['First', 'Second'] : ['First / Second']
          });
          const bounded = new FrameParser(major, { addWarning: () => assert.fail('Unexpected warning') }, 1);
          if (major === 3) {
            expect(() => bounded.readData(Buffer.from(`\0${description}\0First/Second`), 'TXXX', false)).to.throw(
              Id3v2ContentError,
              'TXXX value count 2 exceeds entry limit 1'
            );
          } else {
            assert.deepEqual(bounded.readData(Buffer.from(`\0${description}\0First/Second`), 'TXXX', false), {
              description,
              text: ['First/Second']
            });
          }
        });
      }
      it(`preserves NUL-separated ID3v2.${major} text without additionally splitting slashes`, () => {
        const warnings: string[] = [];
        const parser = new FrameParser(major, { addWarning: warning => warnings.push(warning) }, 3);
        assert.deepEqual(parser.readData(Buffer.from('\0Artists\0AC/DC\0\0Other/Artist'), 'TXXX', false), {
          description: 'Artists',
          text: ['AC/DC', '', 'Other/Artist']
        });
        assert.lengthOf(warnings, major === 3 ? 1 : 0);
        const bounded = new FrameParser(major, { addWarning: () => undefined }, 1);
        expect(() => bounded.readData(Buffer.from('\0Custom\0First\0Second'), 'TXXX', false)).to.throw(
          Id3v2ContentError,
          'TXXX value count 2 exceeds entry limit 1'
        );
        assert.deepEqual(bounded.readData(Buffer.from('\0Custom\0https://example.org/a/b'), 'TXXX', false), {
          description: 'Custom',
          text: ['https://example.org/a/b']
        });
      });
    }
  });

  it('preserves empty values in ID3v2.4 user text lists', () => {
    const parser = new FrameParser(4, { addWarning: () => assert.fail('Unexpected warning') });
    assert.deepEqual(parser.readData(Buffer.from('\0description\0First\0\0Second'), 'TXXX', false), {
      description: 'description',
      text: ['First', '', 'Second']
    });
  });

  it('enforces a finite value budget when a frame parser is constructed directly', () => {
    const parser = new FrameParser(4, { addWarning: () => assert.fail('Unexpected warning') });
    const data = Buffer.from(`\0${'a\0'.repeat(100_001)}`, 'latin1');
    expect(() => parser.readData(data, 'TPE1', false)).to.throw(
      Id3v2ContentError,
      'TPE1 value count 100001 exceeds entry limit 100000'
    );
  });

  it('preserves literal genre text before an unterminated code', () => {
    assert.deepEqual(parseGenre('Electronic(unfinished'), ['Electronic']);
  });

  it('rejects synchronized lyrics that exceed the decoded-line allocation limit', () => {
    expect(() => parseLrc('[00:00.00]First\n[00:01.00]Second', 1)).to.throw(
      LyricsContentError,
      'Line count 2 exceeds entry limit 1'
    );
  });

  describe('ID3 private level fixtures', () => {
    function fixture(major: 3 | 4, owner: string, data: Uint8Array): Buffer {
      const payload = Buffer.concat([Buffer.from(owner, 'latin1'), Buffer.from([0]), data]);
      const frame = Buffer.alloc(10);
      frame.write('PRIV');
      if (major === 3) {
        frame.writeUInt32BE(payload.length, 4);
      } else {
        for (let i = 0; i < 4; i++) {
          frame[7 - i] = (payload.length >>> (7 * i)) & 0x7f;
        }
      }
      const header = Buffer.from([0x49, 0x44, 0x33, major, 0, 0, 0, 0, 0, 0]);
      for (let i = 0; i < 4; i++) {
        header[9 - i] = ((frame.length + payload.length) >>> (7 * i)) & 0x7f;
      }
      return Buffer.concat([header, frame, payload]);
    }

    for (const major of [3, 4] as const) {
      for (const owner of ['PeakValue', 'PeakLevel', 'AverageLevel']) {
        const tagType = `ID3v2.${major}` as const;
        const commonId = owner === 'AverageLevel' ? 'averageLevel' : 'peakLevel';
        const expectedLevel = owner === 'AverageLevel' ? 2 : 8;

        it(`parses ID3v2.${major} ${owner} from an MP3 sample`, async () => {
          const filename = path.join(samplePath, 'mp3', `id3v2.${major}-${owner}.mp3`);
          const metadata = await mm.parseFile(filename);
          assert.equal(metadata.common[commonId], expectedLevel);
          assert.equal(metadata.format.codec, 'MPEG 1 Layer 3');
          assert.equal(metadata.format.sampleRate, 44100);
          assert.isAbove(metadata.format.duration, 0);
          assert.isEmpty(metadata.quality.warnings);
          assert.deepEqual(metadata.native[tagType], [
            {
              id: 'PRIV',
              value: { owner_identifier: owner, data: Uint8Array.of(expectedLevel, 0, 0, 0) }
            }
          ]);
        });

        for (const length of [0, 3, 5]) {
          it(`rejects ID3v2.${major} ${owner} with a ${length}-byte payload`, async () => {
            const data = new Uint8Array(length);
            const metadata = await mm.parseBuffer(fixture(major, owner, data), 'audio/mpeg');
            assert.isUndefined(metadata.common[commonId]);
            assert.deepEqual(metadata.quality.warnings, [{ message: `Failed to parse PRIV:${owner}` }]);
            assert.deepEqual(metadata.native[tagType], [{ id: 'PRIV', value: { owner_identifier: owner, data } }]);
          });
        }
      }
    }

    it('reports a bounded owner identifier when parsing a large unknown PRIV fixture', async () => {
      const owner = 'Owner'.repeat(100);
      const data = new Uint8Array(1024 * 1024).fill(42);
      const metadata = await mm.parseBuffer(fixture(4, owner, data), 'audio/mpeg');
      assert.deepEqual(metadata.quality.warnings, [
        {
          message: `Unknown PRIV owner-identifier: ${owner.slice(0, 128)}`
        }
      ]);
      assert.deepEqual(metadata.native['ID3v2.4'], [{ id: 'PRIV', value: { owner_identifier: owner, data } }]);
      assert.isUndefined(metadata.common.peakLevel);
    });
  });

  describe('Headers and unknown frames', () => {
    it('should be able to read id3v2 files with extended headers', () => {
      const filename = 'id3v2-xheader.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath, { duration: true }).then(metadata => {
        assert.strictEqual(metadata.format.numberOfSamples, 10944, 'format.numberOfSamples');
        assert.strictEqual(metadata.format.sampleRate, 22050, 'format.sampleRate');
        assert.strictEqual(metadata.format.duration, 10944 / metadata.format.sampleRate, 'format.duration');

        assert.strictEqual(metadata.common.title, 'title', 'common.title');
        assert.deepEqual(metadata.common.track, { no: null, of: null }, 'common.track');
        assert.deepEqual(metadata.common.disk, { no: null, of: null }, 'common.disk');
      });
    });

    describe('extended header size', () => {
      const syncSafe = (size: number) =>
        Buffer.from([(size >>> 21) & 0x7f, (size >>> 14) & 0x7f, (size >>> 7) & 0x7f, size & 0x7f]);

      // ID3v2.3: the size excludes its own 4 bytes (6, or 10 with a CRC).
      // ID3v2.4: the synchsafe size includes them (at least 6).
      const cases: [3 | 4, string, number[]][] = [
        [3, 'without CRC', [0, 0, 0, 6, 0, 0, 0, 0, 0, 0]],
        [3, 'with CRC', [0, 0, 0, 10, 0x80, 0, 0, 0, 0, 0, 0x12, 0x34, 0x56, 0x78]],
        [4, 'without flags', [0, 0, 0, 6, 1, 0]],
        [4, 'with CRC', [0, 0, 0, 12, 1, 0x20, 5, 0, 0, 0, 0, 0]]
      ];
      for (const [major, description, extendedHeader] of cases) {
        it(`skips an ID3v2.${major} extended header ${description}`, async () => {
          const title = Buffer.from('\x00Title', 'latin1');
          const frameHeader = Buffer.alloc(10);
          frameHeader.write('TIT2', 'ascii');
          if (major === 3) {
            frameHeader.writeUInt32BE(title.length, 4);
          } else {
            frameHeader.set(syncSafe(title.length), 4);
          }
          const body = Buffer.concat([Buffer.from(extendedHeader), frameHeader, title]);
          const tag = Buffer.concat([Buffer.from([0x49, 0x44, 0x33, major, 0, 0x40]), syncSafe(body.length), body]);
          const metadata = await mm.parseBuffer(tag, 'audio/mpeg');
          assert.deepEqual(metadata.native[`ID3v2.${major}`], [{ id: 'TIT2', value: 'Title' }]);
        });
      }
    });

    it('invalid "Date" frame should not cause crash', () => {
      const filename = 'bug-id3v2-unknownframe.mp3';
      const filePath = path.join(samplePath, filename);

      function checkCommon(common) {
        assert.strictEqual(common.title, 'One', 'common.title');
        assert.strictEqual(common.artist, 'Coheed And Cambria', 'common.artist');
        assert.strictEqual(common.album, 'Year Of The Black Rainbow', 'common.album');
        assert.strictEqual(common.year, 2010, 'common.year');
        assert.deepEqual(common.track, { no: 1, of: null }, 'common.track');
        assert.deepEqual(common.genre, ['Progressive Rock'], 'common.genre');
      }

      return mm.parseFile(filePath, { duration: true }).then(metadata => {
        checkCommon(metadata.common);
      });
    });
  });

  describe('Padding', () => {
    function synchSafe(size: number): Buffer {
      return Buffer.from([(size >>> 21) & 0x7f, (size >>> 14) & 0x7f, (size >>> 7) & 0x7f, size & 0x7f]);
    }

    // Synthetic tag: one title frame followed by caller-supplied trailing bytes.
    function paddingFixture(major: ID3v2MajorVersion, trailing: Uint8Array): Buffer {
      const title = Buffer.from('\x00Synthetic title\x00', 'latin1');
      const frameHeader = Buffer.alloc(major === 2 ? 6 : 10);
      frameHeader.write(major === 2 ? 'TT2' : 'TIT2', 'ascii');
      if (major === 2) {
        frameHeader.writeUIntBE(title.length, 3, 3);
      } else if (major === 3) {
        frameHeader.writeUInt32BE(title.length, 4);
      } else {
        frameHeader.set(synchSafe(title.length), 4);
      }
      const payload = Buffer.concat([frameHeader, title, trailing]);
      return Buffer.concat([Buffer.from([0x49, 0x44, 0x33, major, 0, 0]), synchSafe(payload.length), payload]);
    }

    async function parseFixture(major: ID3v2MajorVersion, trailing: Uint8Array): Promise<MetadataCollector> {
      const metadata = new MetadataCollector({});
      const tokenizer = fromBuffer(paddingFixture(major, trailing));
      try {
        await new ID3v2Parser().parse(metadata, tokenizer, {});
        assert.strictEqual(tokenizer.position, tokenizer.fileInfo.size, 'the entire tag is consumed');
        assert.strictEqual(metadata.common.title, 'Synthetic title');
        assert.deepEqual(metadata.native[`ID3v2.${major}`], [
          { id: major === 2 ? 'TT2' : 'TIT2', value: 'Synthetic title' }
        ]);
        return metadata;
      } finally {
        await tokenizer.close();
      }
    }

    for (const major of [2, 3, 4] as const) {
      describe(`ID3v2.${major}`, () => {
        // 2,166 bytes reproduces the padding in the reported MP3: previously
        // ID3v2.4 emitted 216 invalid-ID warnings, 216 empty-frame warnings,
        // and one illegal-length warning for the final six bytes.
        for (const length of [0, 1, 5, 6, 9, 10, 12, 2166]) {
          it(`accepts ${length} bytes of zero padding without warnings`, async () => {
            const metadata = await parseFixture(major, Buffer.alloc(length));
            assert.isEmpty(metadata.quality.warnings);
          });
        }

        it('still warns about a truncated non-padding frame header', async () => {
          const metadata = await parseFixture(major, Buffer.from('T'));
          assert.deepEqual(metadata.quality.warnings, [{ message: 'Illegal ID3v2 tag length' }]);
        });

        it('warns about non-zero bytes after padding begins', async () => {
          const trailing = Buffer.alloc(2166);
          trailing[trailing.length - 1] = 1;
          const metadata = await parseFixture(major, trailing);
          assert.deepEqual(metadata.quality.warnings, [{ message: 'Non-zero bytes found in ID3v2 padding' }]);
        });
      });
    }
  });

  describe('Embedded chapter frame boundaries', () => {
    const syncSafe = (size: number) =>
      Buffer.from([(size >>> 21) & 0x7f, (size >>> 14) & 0x7f, (size >>> 7) & 0x7f, size & 0x7f]);

    for (const major of [3, 4] as const) {
      function frame(id: string, payload: Uint8Array, declaredLength = payload.length): Buffer {
        const header = Buffer.alloc(10);
        header.write(id, 'ascii');
        if (major === 3) {
          header.writeUInt32BE(declaredLength, 4);
        } else {
          header.set(syncSafe(declaredLength), 4);
        }
        return Buffer.concat([header, payload]);
      }

      for (const parent of ['CHAP', 'CTOC']) {
        function fixture(embedded: Uint8Array): Buffer {
          const fields = parent === 'CHAP' ? Buffer.alloc(16) : Buffer.from([3, 1, 0x63, 0]);
          const chapter = frame(parent, Buffer.concat([Buffer.from('id\0'), fields, embedded]));
          const title = frame('TIT2', Buffer.from('\0Outer title'));
          const payload = Buffer.concat([chapter, title]);
          return Buffer.concat([Buffer.from([0x49, 0x44, 0x33, major, 0, 0]), syncSafe(payload.length), payload]);
        }

        describe(`ID3v2.${major} ${parent}`, () => {
          it('bounds nested embedded chapter frames', async () => {
            let nested = frame('TIT2', Buffer.from('\0Title'));
            const fields = parent === 'CHAP' ? Buffer.alloc(16) : Buffer.from([0, 0]);
            for (let depth = 0; depth < 34; ++depth) {
              nested = frame(parent, Buffer.concat([Buffer.from('id\0'), fields, nested]));
            }
            await expect(mm.parseBuffer(fixture(nested), 'audio/mpeg')).to.be.rejectedWith(
              Id3v2ContentError,
              'Embedded ID3v2 frame nesting exceeds limit 32'
            );
          });
          for (let length = 1; length < 10; length++) {
            it(`rejects an embedded frame header truncated to ${length} bytes`, async () => {
              const data = fixture(frame('TIT2', new Uint8Array()).subarray(0, length));
              await expect(mm.parseBuffer(data, 'audio/mpeg')).to.be.rejectedWith(
                Id3v2ContentError,
                'Truncated embedded ID3v2 frame header'
              );
            });
          }

          for (const length of [0, 2]) {
            it(`rejects an embedded frame with ${length} of its declared 130 payload bytes`, async () => {
              const data = fixture(frame('TIT2', Buffer.alloc(length), 130));
              await expect(mm.parseBuffer(data, 'audio/mpeg')).to.be.rejectedWith(
                Id3v2ContentError,
                'Embedded ID3v2 frame TIT2 size 130 exceeds remaining chapter data'
              );
            });
          }

          for (const source of ['buffer', 'stream'] as const) {
            async function parse(data: Buffer): Promise<mm.IAudioMetadata> {
              return source === 'buffer'
                ? mm.parseBuffer(data, 'audio/mpeg')
                : mm.parseStream(Readable.from([data], { objectMode: false }), 'audio/mpeg');
            }

            it(`accepts no optional embedded frames (${source})`, async () => {
              const metadata = await parse(fixture(new Uint8Array()));
              const chapter = metadata.native[`ID3v2.${major}`].find(tag => tag.id === parent)?.value as
                | Chapter
                | TableOfContents
                | undefined;
              if (!chapter) {
                assert.fail(`Expected ${parent} native tag`);
              }
              assert.strictEqual(chapter.frames.size, 0);
              assert.strictEqual(metadata.common.title, 'Outer title');
            });

            it(`accepts exact-boundary frames and preserves duplicate IDs (${source})`, async () => {
              const longTitle = 'A'.repeat(129);
              const embedded = Buffer.concat([
                frame('TIT2', Buffer.from('\0First title')),
                frame('TIT2', Buffer.from(`\0${longTitle}`))
              ]);
              const metadata = await parse(fixture(embedded));
              const chapter = metadata.native[`ID3v2.${major}`].find(tag => tag.id === parent)?.value as
                | Chapter
                | TableOfContents
                | undefined;
              if (!chapter) {
                assert.fail(`Expected ${parent} native tag`);
              }
              assert.deepEqual([...chapter.frames], [['TIT2', longTitle]]);
              assert.strictEqual(metadata.common.title, 'Outer title');
            });
          }
        });
      }
    }
  });

  describe('Text encodings', () => {
    it('decode id3v2-utf16', async () => {
      const filename = 'id3v2-utf16.mp3';
      const filePath = path.join(samplePath, filename);

      const metadata = await mm.parseFile(filePath, { duration: true });
      const { common } = metadata;

      assert.strictEqual(common.title, 'Redial (Feat. LeafRunner and Nowacking)', 'title');
      assert.strictEqual(common.artist, 'YourEnigma', 'artist 0');
      assert.strictEqual(common.year, 2014, 'year');
      assert.strictEqual(common.picture[0].format, 'image/jpeg', 'picture 0 format');
      assert.strictEqual(common.picture[0].data.length, 214219, 'picture 0 length');
      assert.deepEqual(
        common.picture[0].data.slice(0, 2),
        Uint8Array.from([0xff, 0xd8]),
        'picture 0 JFIF magic header'
      );

      const native = metadata.native['ID3v2.3'];
      assert.ok(native, 'Native id3v2.3 tags should be present');

      assert.deepEqual(native[0], { id: 'TIT2', value: 'Redial (Feat. LeafRunner and Nowacking)' }, "['ID3v2.4'].TIT2");
      assert.deepEqual(native[1], { id: 'TPE1', value: 'YourEnigma' }, "['ID3v2.4'].TIT2");
      assert.deepEqual(native[2], { id: 'TYER', value: '2014' }, "['ID3v2.4'].TYER");
    });

    // Issue: https://github.com/Borewit/music-metadata/issues/2736
    // This fixture contains a single ID3v2.4 tag followed by 44.1 kHz stereo MP3
    // silence. The comments cover $01 with/without BOM and $02, including both
    // empty and non-empty descriptions and terminated/unterminated comment text.
    it('decodes id3v2 UTF-16 text and COMM frames from a single MP3 fixture', async () => {
      const filePath = path.join(samplePath, 'issue-2736-utf16.mp3');
      const { native, common, format } = await mm.parseFile(filePath, { duration: true });

      const comments = [
        // $01: bare empty-description terminator, then LE BOM and text.
        { language: 'eng', descriptor: '', text: 'Hello' },
        // $01: LE BOM before both description and text.
        { language: 'eng', descriptor: 'Dësc with BOM', text: 'Tëst' },
        // $01: neither description nor text has a BOM.
        { language: 'eng', descriptor: 'Dësc without BOM', text: 'Tëst' },
        // $02: big-endian description and text without BOMs.
        { language: 'eng', descriptor: 'Dësc big-endian', text: 'Tëst' },
        // $01: BE BOM before the empty description and unterminated text.
        { language: 'deu', descriptor: '', text: 'Tëst' }
      ];
      assert.deepEqual(
        native['ID3v2.4'],
        [
          { id: 'TIT2', value: 'Tëst' }, // $02 text frame
          { id: 'TPE1', value: 'Example Artist' },
          ...comments.map(value => ({ id: 'COMM', value }))
        ],
        'native ID3v2.4 tags'
      );
      assert.strictEqual(common.title, 'Tëst');
      assert.strictEqual(common.artist, 'Example Artist');
      assert.deepEqual(common.comment, comments);
      assert.strictEqual(format.codec, 'MPEG 1 Layer 3');
      assert.strictEqual(format.sampleRate, 44100);
      assert.strictEqual(format.numberOfChannels, 2);
      assert.isAbove(format.duration, 0);
    });

    it('should read utf16bom (big endian) encoded metadata correctly', () => {
      const filename = 'bug-utf16bom-encoding.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(result => {
        assert.equal(result.common.title, "It's All Over You Know", 'title');
        assert.equal(result.common.artist, 'The Apers', 'artist');
        assert.deepEqual(result.common.artists, ['The Apers'], 'artist');
        assert.equal(result.common.albumartist, 'The Apers', 'albumartist');
        assert.equal(result.common.album, 'Reanimate My Heart', 'album');
        assert.equal(result.common.year, 2007, 'year');
        assert.deepEqual(result.common.track, { no: 1, of: null }, 'track');
        assert.deepEqual(result.common.genre, ['Punk Rock'], 'genre');
      });
    });

    it('should be able to read metadata with unknown encoding', () => {
      const filename = 'bug-unkown encoding.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(result => {
        assert.strictEqual(result.common.title, '808', 'title');
        assert.strictEqual(result.common.artist, 'Benga', 'artist');
        assert.strictEqual(result.common.albumartist, 'Benga', 'albumartist');
        assert.strictEqual(result.common.album, 'Phaze One', 'album');
        assert.strictEqual(result.common.year, 2010, 'year');
        assert.strictEqual(result.common.track.no, 4, 'track no');
        assert.strictEqual(result.common.track.of, 8, 'track of');
        assert.strictEqual(result.common.genre[0], 'Dubstep', 'genre');
        assert.strictEqual(result.common.picture[0].format, 'image/jpeg', 'picture format');
        assert.strictEqual(result.common.picture[0].data.length, 6761, 'picture length');
      });
    });

    it('should decode non-ascii-characters', () => {
      const filename = 'bug-non ascii chars.mp3';
      const filePath = path.join(samplePath, filename);

      return mm.parseFile(filePath).then(result => {
        assert.deepEqual(result.common.artist, 'Janelle Monáe', 'common.artist');
        assert.deepEqual(result.common.artists, ['Janelle Monáe', 'Roman Gianarthur', 'Nate Wonder'], 'common.artists');
      });
    });
  });

  describe('Lyrics', () => {
    describe('ID3v2.2 ULT lyrics mapping', () => {
      it('exposes the fixture lyrics while preserving its native fields', async () => {
        const { common, native } = await mm.parseFile(path.join(samplePath, 'id3v2.2.mp3'));
        const lyrics = native['ID3v2.2'].filter(tag => tag.id === 'ULT').map(tag => tag.value);
        assert.lengthOf(lyrics, 1);
        assert.deepEqual(common.lyrics, lyrics);
      });

      for (const [name, text] of [
        ['empty', ''],
        ['populated', 'First line\nSecond line']
      ]) {
        it(`uses the USLT common normalization for ${text ? 'populated' : 'empty'} lyrics`, async () => {
          const value = { language: 'eng', descriptor: 'Translation', text };
          const legacy = await mm.parseFile(path.join(samplePath, 'mp3', `id3v2.2-lyrics-${name}.mp3`));
          const current = await mm.parseFile(path.join(samplePath, 'mp3', `id3v2.4-lyrics-${name}.mp3`));
          assert.deepEqual(legacy.common.lyrics, current.common.lyrics);
          assert.deepEqual(legacy.native['ID3v2.2'], [{ id: 'ULT', value }]);
        });
      }

      it('preserves multiple lyrics including language, descriptor and empty text', async () => {
        const entries = [
          { language: 'eng', descriptor: 'Original', text: 'A line\nAnother line' },
          { language: 'fra', descriptor: 'Translation', text: '' }
        ];
        const { common, native } = await mm.parseFile(path.join(samplePath, 'mp3', 'id3v2.2-lyrics-multiple.mp3'));
        assert.deepEqual(
          common.lyrics.map(({ language, descriptor, text }) => ({ language, descriptor, text })),
          entries
        );
        assert.deepEqual(
          native['ID3v2.2'],
          entries.map(value => ({ id: 'ULT', value }))
        );
      });
    });

    it('should be able to read id3v2 files with lyrics', () => {
      const filename = 'id3v2-lyrics.mp3';
      const filePath = path.join(samplePath, filename);

      const expectedSyncText = [
        {
          text: "The way we're living makes no sense",
          timestamp: 10
        },
        {
          text: 'Take me back to the age of innocence',
          timestamp: 3780
        },
        {
          text: 'I wanna go back then',
          timestamp: 7540
        },
        {
          text: 'Take me back to the age of innocence',
          timestamp: 11310
        },
        {
          text: 'Back to the age of innocence',
          timestamp: 15070
        },
        {
          text: 'When clockwork fixed by lights and books',
          timestamp: 30440
        },
        {
          text: 'When singers wrote songs instead of hooks',
          timestamp: 34410
        },
        {
          text: "When the value wasn't in the price",
          timestamp: 37170
        },
        {
          text: 'When the fight for life was in the civil rights',
          timestamp: 40540
        },
        {
          text: 'When we could live life through a screen',
          timestamp: 43100
        },
        {
          text: 'When everything you knew was as good as it seems',
          timestamp: 46070
        },
        {
          text: 'When the only worry was the concept of sin',
          timestamp: 49440
        },
        {
          text: 'When did it begin?',
          timestamp: 53000
        },
        {
          text: 'I wonder if I could,',
          timestamp: 55770
        },
        {
          text: 'Go back to old Hollywood',
          timestamp: 58530
        },
        {
          text: 'When presidents dropped blonde bombshells',
          timestamp: 62700
        },
        {
          text: 'Instead of creating the perfect hell',
          timestamp: 66470
        },
        {
          text: "The way we're living makes no sense",
          timestamp: 69030
        },
        {
          text: 'Take me back to the age of innocence',
          timestamp: 72800
        },
        {
          text: 'I wanna go back then',
          timestamp: 75560
        },
        {
          text: 'Take me back to the age of innocence',
          timestamp: 78730
        },
        {
          text: 'Back to the age of innocence',
          timestamp: 92700
        },
        {
          text: 'When pharmaceuticals were there to make life beautiful',
          timestamp: 97260
        },
        {
          text: 'When the way that we were born was more than suitable',
          timestamp: 100830
        },
        {
          text: 'When everybody thought they could make a difference',
          timestamp: 104190
        },
        {
          text: "And you couldn't get your pics within an instance",
          timestamp: 106560
        },
        {
          text: 'I wonder if I could,',
          timestamp: 110130
        },
        {
          text: 'Go back to old Hollywood',
          timestamp: 113290
        },
        {
          text: 'When presidents dropped blonde bombshells',
          timestamp: 117260
        },
        {
          text: 'Instead of creating the perfect hell',
          timestamp: 120820
        },
        {
          text: "The way we're living makes no sense",
          timestamp: 123590
        },
        {
          text: 'Take me back to the age of innocence',
          timestamp: 127360
        },
        {
          text: 'I wanna go back then',
          timestamp: 130720
        },
        {
          text: 'Take me back to the age of innocence',
          timestamp: 133090
        },
        {
          text: 'Back to the age of innocence',
          timestamp: 136850
        },
        {
          text: "I wanna get older, don't fight my age",
          timestamp: 146420
        },
        {
          text: 'Take me back to those simpler days',
          timestamp: 151790
        },
        {
          text: 'I wonder how it all happened',
          timestamp: 158350
        },
        {
          text: "I wanna get older, don't fight my age",
          timestamp: 163520
        },
        {
          text: "Don't wanna be the shade of a scalpel's blade",
          timestamp: 167680
        },
        {
          text: 'So please tell me, please tell me',
          timestamp: 170050
        },
        {
          text: 'What ever happened? Happened?',
          timestamp: 178420
        },
        {
          text: 'I wonder if I could,',
          timestamp: 180580
        },
        {
          text: 'Go back to old Hollywood',
          timestamp: 182550
        },
        {
          text: 'When presidents dropped blonde bombshells',
          timestamp: 185310
        },
        {
          text: 'Instead of creating their lives to hell',
          timestamp: 188480
        },
        {
          text: "The way we're living makes no sense",
          timestamp: 191650
        },
        {
          text: 'Take me back, take me back',
          timestamp: 194410
        },
        {
          text: 'To the age of innocence',
          timestamp: 196180
        },
        {
          text: 'I wanna go back then',
          timestamp: 198340
        },
        {
          text: 'Take me back, take me back',
          timestamp: 200310
        },
        {
          text: 'To the age of innocence',
          timestamp: 202080
        },
        {
          text: 'Back to the age of innocence',
          timestamp: 204640
        },
        {
          text: "I wanna get older, don't fight my age",
          timestamp: 207010
        },
        {
          text: 'Take me back to those simpler days',
          timestamp: 208970
        },
        {
          text: 'I wonder how it all happened',
          timestamp: 210740
        },
        {
          text: "I wanna get older, don't fight my age",
          timestamp: 213910
        },
        {
          text: "Don't wanna be the page on the scalpel's blade",
          timestamp: 215870
        },
        {
          text: 'So please tell me, please tell me',
          timestamp: 217640
        },
        {
          text: 'What ever happened?',
          timestamp: 220600
        },
        {
          text: 'Happened?',
          timestamp: 224370
        }
      ];

      return mm.parseFile(filePath).then(metadata => {
        assert.isDefined(metadata.common.lyrics, 'metadata.common.lyrics');
        assert.strictEqual(metadata.common.lyrics.length, 1, 'metadata.common.lyrics.length');
        const lyrics = metadata.common.lyrics[0];

        assert.strictEqual(lyrics.descriptor, '', 'metadata.common.lyrics[0].descriptor');
        assert.strictEqual(lyrics.contentType, LyricsContentType.lyrics, 'metadata.common.lyrics[0].contentType');
        assert.strictEqual(lyrics.language, 'eng', 'metadata.common.lyrics[0].language');
        assert.deepEqual(lyrics.syncText, expectedSyncText, 'metadata.common.lyrics[0].synchronized');
      });
    });
  });

  describe('Embedded tags', () => {
    function textTag(frameId: string, value: string): Buffer {
      const text = Buffer.concat([Buffer.from([0]), Buffer.from(value)]);
      const frame = Buffer.alloc(10);
      frame.write(frameId);
      frame.writeUInt32BE(text.length, 4);
      const header = Buffer.from([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, frame.length + text.length]);
      return Buffer.concat([header, frame, text]);
    }

    const containers = [
      {
        name: 'WAV lowercase',
        root: 'RIFF',
        type: 'WAVE',
        id: 'id3 ',
        mime: 'audio/wav',
        littleEndian: true,
        wide: false
      },
      {
        name: 'WAV uppercase',
        root: 'RIFF',
        type: 'WAVE',
        id: 'ID3 ',
        mime: 'audio/wav',
        littleEndian: true,
        wide: false
      },
      { name: 'AIFF', root: 'FORM', type: 'AIFF', id: 'ID3 ', mime: 'audio/aiff', littleEndian: false, wide: false },
      { name: 'DSDIFF', root: 'FRM8', type: 'DSD ', id: 'ID3 ', mime: 'audio/dsd', littleEndian: false, wide: true }
    ];

    describe('Chunk boundaries', () => {
      for (const container of containers) {
        describe(container.name, () => {
          function chunk(id: string, payload: Buffer): Buffer {
            const header = Buffer.alloc(container.wide ? 12 : 8);
            header.write(id);
            if (container.wide) {
              header.writeBigUInt64BE(BigInt(payload.length), 4);
            } else if (container.littleEndian) {
              header.writeUInt32LE(payload.length, 4);
            } else {
              header.writeUInt32BE(payload.length, 4);
            }
            return Buffer.concat([header, payload, Buffer.alloc(payload.length & 1, 0xa5)]);
          }

          function sample(...tags: Buffer[]): Buffer {
            return chunk(
              container.root,
              Buffer.concat([Buffer.from(container.type), ...tags.map(tag => chunk(container.id, tag))])
            );
          }

          for (const source of ['buffer', 'stream', 'advertised stream', 'blob', 'web stream']) {
            async function tokenize(data: Buffer) {
              const options = { fileInfo: { mimeType: container.mime } };
              switch (source) {
                case 'buffer':
                  return fromBuffer(data, options);
                case 'blob':
                  return fromBlob(new Blob([Uint8Array.from(data)], { type: container.mime }));
                case 'web stream':
                  return fromWebStream(new Blob([Uint8Array.from(data)]).stream(), options);
                default:
                  return fromStream(Readable.from([data.subarray(0, 17), data.subarray(17)], { objectMode: false }), {
                    fileInfo: { ...options.fileInfo, size: source === 'advertised stream' ? data.length : undefined }
                  });
              }
            }

            for (const trailingBytes of [2, 3]) {
              it(`reads the following chunk after ${trailingBytes & 1 ? 'odd' : 'even'} payload and unconsumed ID3 bytes (${source})`, async () => {
                const firstTag = Buffer.concat([textTag('TIT2', 'Title'), Buffer.alloc(trailingBytes, 0xa5)]);
                const data = sample(firstTag, textTag('TPE1', 'Artist'));
                const tokenizer = await tokenize(data);
                try {
                  const { common, native } = await parseFromTokenizer(tokenizer);
                  assert.strictEqual(common.title, 'Title');
                  assert.strictEqual(common.artist, 'Artist');
                  assert.deepEqual(
                    native['ID3v2.3'].map(tag => tag.id),
                    ['TIT2', 'TPE1']
                  );
                  assert.strictEqual(tokenizer.position, data.length, 'container consumes its own padding');
                } finally {
                  await tokenizer.close();
                }
              });
            }

            it(`preserves the container's handling of a truncated embedded header (${source})`, async () => {
              const tokenizer = await tokenize(sample(Buffer.from('ID3')));
              try {
                const parsing = parseFromTokenizer(tokenizer);
                if (container.wide) {
                  await expect(parsing).to.be.rejectedWith(EndOfStreamError);
                } else {
                  const { native } = await parsing;
                  assert.isEmpty(native, 'WAV and AIFF retain their end-of-stream handling');
                }
              } finally {
                await tokenizer.close();
              }
            });

            it(`rejects an invalid embedded ID3 header (${source})`, async () => {
              const invalidTag = textTag('TIT2', 'Title');
              invalidTag.write('BAD');
              const tokenizer = await tokenize(sample(invalidTag));
              try {
                await expect(parseFromTokenizer(tokenizer)).to.be.rejectedWith(
                  Id3v2ContentError,
                  "expected ID3-header file-identifier 'ID3' was not found"
                );
              } finally {
                await tokenizer.close();
              }
            });

            it(`rejects an ID3 size that extends into the next chunk (${source})`, async () => {
              const oversizedTag = Buffer.from([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 30]);
              const tokenizer = await tokenize(sample(oversizedTag, textTag('TPE1', 'Artist')));
              try {
                await expect(parseFromTokenizer(tokenizer)).to.be.rejectedWith(
                  Id3v2ContentError,
                  'ID3v2 tag size 30 exceeds remaining file size 0'
                );
              } finally {
                await tokenizer.close();
              }
            });
          }
        });
      }
    });

    describe('Borrowed tokenizer lifecycle', () => {
      for (const source of ['buffer', 'stream']) {
        async function tokenize(data: Buffer) {
          return source === 'buffer' ? fromBuffer(data) : fromStream(Readable.from([data], { objectMode: false }));
        }

        it(`reads only the tag and skips its unused payload without closing the source (${source})`, async () => {
          const tag = textTag('TIT2', 'Title');
          const size = tag.length + 32 * 1024;
          const tokenizer = await tokenize(Buffer.concat([tag, Buffer.alloc(size - tag.length), Buffer.from([42])]));
          const readToken = tokenizer.readToken.bind(tokenizer);
          tokenizer.readToken = (token, position) => {
            assert.isBelow(token.len, size, 'must not buffer the entire enclosing chunk');
            return readToken(token, position);
          };
          const close = tokenizer.close.bind(tokenizer);
          tokenizer.close = async () => assert.fail('embedded parser must not close the borrowed source');
          try {
            const metadata = new MetadataCollector();
            await parseEmbeddedID3v2(metadata, tokenizer, {}, size);
            assert.strictEqual(metadata.common.title, 'Title');
            assert.strictEqual(tokenizer.position, size);
            assert.strictEqual(await tokenizer.readNumber(UINT8), 42);
          } finally {
            await close();
          }
        });

        it(`keeps a malformed extended header inside the chunk and leaves the source open (${source})`, async () => {
          const tag = Buffer.from([0x49, 0x44, 0x33, 3, 0, 0x40, 0, 0, 0, 0]);
          const tokenizer = await tokenize(Buffer.concat([tag, Buffer.alloc(10, 42)]));
          const close = tokenizer.close.bind(tokenizer);
          tokenizer.close = async () => assert.fail('failed embedded parser must not close the borrowed source');
          try {
            await expect(parseEmbeddedID3v2(new MetadataCollector(), tokenizer, {}, tag.length)).to.be.rejectedWith(
              Id3v2ContentError,
              'exceeds chunk boundary'
            );
            assert.strictEqual(tokenizer.position, tag.length);
            assert.strictEqual(await tokenizer.readNumber(UINT8), 42);
          } finally {
            await close();
          }
        });

        it(`rejects a physically truncated unused chunk remainder (${source})`, async () => {
          const tag = textTag('TIT2', 'Title');
          const tokenizer = await tokenize(Buffer.concat([tag, Buffer.from([0])]));
          try {
            await expect(
              parseEmbeddedID3v2(new MetadataCollector(), tokenizer, {}, tag.length + 10)
            ).to.be.rejectedWith(EndOfStreamError);
          } finally {
            await tokenizer.close();
          }
        });
      }
    });
  });
});
