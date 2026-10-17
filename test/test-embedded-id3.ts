import { Readable } from 'node:stream';
import { assert, expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { EndOfStreamError, fromBuffer, fromStream } from 'strtok3';
import { Id3v2ContentError } from '../lib/id3v2/FrameParser.js';
import { parseFromTokenizer } from '../lib/index.js';

use(chaiAsPromised);

function textTag(frameId: string, value: string): Buffer {
  const text = Buffer.concat([Buffer.from([0]), Buffer.from(value)]);
  const frame = Buffer.alloc(10);
  frame.write(frameId);
  frame.writeUInt32BE(text.length, 4);
  const header = Buffer.from([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, frame.length + text.length]);
  return Buffer.concat([header, frame, text]);
}

const containers = [
  { name: 'WAV lowercase', root: 'RIFF', type: 'WAVE', id: 'id3 ', mime: 'audio/wav', littleEndian: true, wide: false },
  { name: 'WAV uppercase', root: 'RIFF', type: 'WAVE', id: 'ID3 ', mime: 'audio/wav', littleEndian: true, wide: false },
  { name: 'AIFF', root: 'FORM', type: 'AIFF', id: 'ID3 ', mime: 'audio/aiff', littleEndian: false, wide: false },
  { name: 'DSDIFF', root: 'FRM8', type: 'DSD ', id: 'ID3 ', mime: 'audio/dsd', littleEndian: false, wide: true }
];

describe('Embedded ID3 chunk boundaries', () => {
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

      for (const source of ['buffer', 'stream']) {
        async function tokenize(data: Buffer) {
          const options = { fileInfo: { mimeType: container.mime } };
          return source === 'buffer'
            ? fromBuffer(data, options)
            : fromStream(Readable.from([data.subarray(0, 17), data.subarray(17)], { objectMode: false }), options);
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
