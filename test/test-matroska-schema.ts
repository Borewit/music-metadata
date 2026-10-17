import { Readable } from 'node:stream';
import { assert, expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { fromBuffer, fromStream } from 'strtok3';
import { EbmlIterator, getElementPath, ParseAction } from '../lib/ebml/EbmlIterator.js';
import type { IElementType } from '../lib/ebml/types.js';
import { parseBuffer, parseFromTokenizer } from '../lib/index.js';
import { matroskaDtd } from '../lib/matroska/MatroskaDtd.js';
import type { IDecodedAttachedFile, IDecodedTrackEntry } from '../lib/matroska/types.js';

use(chaiAsPromised);

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

describe('Matroska literal schema', () => {
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

describe('Matroska selective collection', () => {
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
        const tokenizer = stream ? await fromStream(Readable.from([data], { objectMode: false })) : fromBuffer(data);
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
        const tokenizer = stream ? await fromStream(Readable.from([data], { objectMode: false })) : fromBuffer(data);
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
          const { common, native } = await parseFromTokenizer(tokenizer, { skipCovers: true, maxMemoryAllocation: 64 });
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
      const data = document(element('1941a469', attachment(false, 'application/octet-stream', new Uint8Array(4096))));
      const tokenizer = stream ? await fromStream(Readable.from([data], { objectMode: false })) : fromBuffer(data);
      tokenizer.fileInfo.mimeType = 'video/x-matroska';
      try {
        await expect(parseFromTokenizer(tokenizer, { maxMemoryAllocation: 64 })).to.be.rejectedWith('allocation limit');
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
