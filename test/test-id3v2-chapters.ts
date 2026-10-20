import { assert, expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { fromBuffer } from 'strtok3';
import { MetadataCollector } from '../lib/common/MetadataCollector.js';
import { Id3v2ContentError } from '../lib/id3v2/FrameParser.js';
import { ID3v2Parser } from '../lib/id3v2/ID3v2Parser.js';
import type { IOptions } from '../lib/type.js';

use(chaiAsPromised);

describe('ID3v2 chapter boundaries', () => {
  function syncSafe(length: number): Buffer {
    return Buffer.from([(length >>> 21) & 0x7f, (length >>> 14) & 0x7f, (length >>> 7) & 0x7f, length & 0x7f]);
  }

  for (const major of [3, 4] as const) {
    function frame(id: string, payload: Uint8Array): Buffer {
      const header = Buffer.alloc(10);
      header.write(id, 'ascii');
      if (major === 3) {
        header.writeUInt32BE(payload.length, 4);
      } else {
        header.set(syncSafe(payload.length), 4);
      }
      return Buffer.concat([header, payload]);
    }

    async function parse(...frames: Uint8Array[]): Promise<MetadataCollector> {
      return parseWithOptions({}, ...frames);
    }

    async function parseWithOptions(options: IOptions, ...frames: Uint8Array[]): Promise<MetadataCollector> {
      const payload = Buffer.concat(frames);
      const tag = Buffer.concat([Buffer.from([0x49, 0x44, 0x33, major, 0, 0]), syncSafe(payload.length), payload]);
      const tokenizer = fromBuffer(tag);
      const metadata = new MetadataCollector(options);
      try {
        await new ID3v2Parser().parse(metadata, tokenizer, options);
        return metadata;
      } finally {
        await tokenizer.close();
      }
    }

    function chapterFrame(id: string, start: number): Buffer {
      const info = Buffer.alloc(16, 0xff);
      info.writeUInt32BE(start, 0);
      info.writeUInt32BE(start + 1000, 4);
      return frame('CHAP', Buffer.concat([Buffer.from(`${id}\0`), info, frame('TIT2', Buffer.from(`\0${id}`))]));
    }

    describe(`ID3v2.${major}`, () => {
      for (const id of ['CHAP', 'CTOC']) {
        it(`rejects an empty ${id} payload`, async () => {
          await expect(parse(frame(id, new Uint8Array()))).to.be.rejectedWith(
            Id3v2ContentError,
            `Truncated ${id} header`
          );
        });

        it(`rejects an unterminated ${id} element ID`, async () => {
          await expect(parse(frame(id, Buffer.from('chapter')))).to.be.rejectedWith(
            Id3v2ContentError,
            `Missing ${id} element ID terminator`
          );
        });

        const fixedLength = id === 'CHAP' ? 16 : 2;
        for (let length = 0; length < fixedLength; length++) {
          it(`rejects ${id} with only ${length} fixed-field bytes`, async () => {
            const payload = Buffer.concat([Buffer.from('chapter\0'), Buffer.alloc(length)]);
            await expect(parse(frame(id, payload))).to.be.rejectedWith(Id3v2ContentError, `Truncated ${id} header`);
          });
        }
      }

      it('still warns and continues after an empty text frame', async () => {
        const metadata = await parse(frame('TIT2', new Uint8Array()), frame('TIT2', Buffer.from('\0Title')));
        assert.strictEqual(metadata.common.title, 'Title');
        assert.deepEqual(metadata.quality.warnings, [{ message: `id3v2.${major} header has empty tag type=TIT2` }]);
      });

      for (const children of ['', 'first\0', 'first\0second']) {
        it(`rejects an incomplete CTOC child list ${JSON.stringify(children)}`, async () => {
          const payload = Buffer.concat([Buffer.from('toc\0'), Buffer.from([3, 2]), Buffer.from(children)]);
          await expect(parse(frame('CTOC', payload))).to.be.rejectedWith(
            Id3v2ContentError,
            'Truncated CTOC child element ID'
          );
        });
      }

      it('limits chapters after applying the CTOC order and retains other metadata', async () => {
        const toc = frame(
          'CTOC',
          Buffer.concat([Buffer.from('toc\0'), Buffer.from([3, 2]), Buffer.from('second\0first\0')])
        );
        const metadata = await parseWithOptions(
          { maxChapterCount: 1 },
          chapterFrame('first', 0),
          chapterFrame('second', 1000),
          toc,
          frame('TIT2', Buffer.from('\0Album title'))
        );
        assert.deepEqual(
          metadata.format.chapters?.map(chapter => chapter.id),
          ['second']
        );
        assert.strictEqual(metadata.common.title, 'Album title');
        assert.lengthOf(
          metadata.native[`ID3v2.${major}`].filter(tag => tag.id === 'CHAP'),
          2
        );
        assert.deepEqual(metadata.quality.warnings, [{ message: 'Chapter count exceeds the 1 chapter limit' }]);
      });

      for (const limit of [2, 3]) {
        it(`applies maxChapterCount=${limit} after sorting chapters without a CTOC`, async () => {
          const metadata = await parseWithOptions(
            { maxChapterCount: limit },
            chapterFrame('third', 2000),
            chapterFrame('first', 0),
            chapterFrame('second', 1000)
          );
          assert.deepEqual(
            metadata.format.chapters?.map(chapter => chapter.id),
            ['first', 'second', 'third'].slice(0, limit)
          );
          assert.lengthOf(metadata.quality.warnings, limit < 3 ? 1 : 0);
        });
      }

      for (const maxChapterCount of [undefined, 1100]) {
        it(`handles an ID3 chapter list above the default limit with maxChapterCount=${maxChapterCount}`, async () => {
          const frames = Array.from({ length: 1002 }, (_, index) => chapterFrame(`chapter-${index}`, index * 1000));
          const metadata = await parseWithOptions({ maxChapterCount }, ...frames);
          assert.lengthOf(metadata.format.chapters, maxChapterCount === undefined ? 1000 : 1002);
          assert.lengthOf(metadata.quality.warnings, maxChapterCount === undefined ? 1 : 0);
        });
      }

      it('preserves chapter titles, times and table-of-contents ordering', async () => {
        function chapter(id: string, start: number): Buffer {
          const info = Buffer.alloc(16, 0xff);
          info.writeUInt32BE(start, 0);
          info.writeUInt32BE(start + 1000, 4);
          return frame('CHAP', Buffer.concat([Buffer.from(`${id}\0`), info, frame('TIT2', Buffer.from(`\0${id}`))]));
        }
        const toc = frame(
          'CTOC',
          Buffer.concat([Buffer.from('toc\0'), Buffer.from([3, 2]), Buffer.from('second\0first\0')])
        );
        const metadata = await parse(
          chapter('first', 0),
          chapter('second', 1000),
          toc,
          frame('TIT2', Buffer.from('\0Album title'))
        );
        assert.strictEqual(metadata.common.title, 'Album title');
        assert.deepEqual(
          metadata.format.chapters?.map(({ id, title, start, end }) => ({ id, title, start, end })),
          [
            { id: 'second', title: 'second', start: 1, end: 2 },
            { id: 'first', title: 'first', start: 0, end: 1 }
          ]
        );
      });
    });
  }
});
