import { assert } from 'chai';
import { fromBuffer } from 'strtok3';
import { EbmlIterator, getElementPath, ParseAction } from '../lib/ebml/EbmlIterator.js';
import type { IElementType } from '../lib/ebml/types.js';
import { parseBuffer } from '../lib/index.js';
import { matroskaDtd } from '../lib/matroska/MatroskaDtd.js';
import type { IDecodedAttachedFile, IDecodedTrackEntry } from '../lib/matroska/types.js';

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
