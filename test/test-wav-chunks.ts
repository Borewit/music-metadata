import { Readable } from 'node:stream';
import { assert } from 'chai';
import { fromBuffer, fromStream } from 'strtok3';
import * as mm from '../lib/index.js';

function chunk(id: string, payload: Buffer, size = payload.length): Buffer {
  const header = Buffer.alloc(8);
  header.write(id);
  header.writeUInt32LE(size, 4);
  return Buffer.concat([header, payload, Buffer.alloc(size & 1)]);
}

function wave(...chunks: Buffer[]): Buffer {
  const format = Buffer.alloc(16);
  format.writeUInt16LE(1, 0); // PCM
  format.writeUInt16LE(1, 2); // Mono
  format.writeUInt32LE(8000, 4);
  format.writeUInt32LE(16000, 8);
  format.writeUInt16LE(2, 12);
  format.writeUInt16LE(16, 14);
  return chunk('RIFF', Buffer.concat([Buffer.from('WAVE'), chunk('fmt ', format), ...chunks]));
}

describe('WAV chunk accounting', () => {
  for (const source of ['buffer', 'stream', 'advertised stream']) {
    async function tokenize(data: Buffer) {
      return source === 'buffer'
        ? fromBuffer(data, { fileInfo: { mimeType: 'audio/wav' } })
        : fromStream(Readable.from([data], { objectMode: false }), {
            fileInfo: { mimeType: 'audio/wav', size: source === 'advertised stream' ? data.length : undefined }
          });
    }

    it(`does not report a size warning for a valid final data chunk (${source})`, async () => {
      const tokenizer = await tokenize(wave(chunk('data', Buffer.alloc(8))));
      try {
        const { format, quality } = await mm.parseFromTokenizer(tokenizer);
        assert.strictEqual(format.numberOfSamples, 4);
        assert.isEmpty(quality.warnings);
      } finally {
        await tokenizer.close();
      }
    });

    it(`accounts for odd padding without reading tags after the RIFF boundary (${source})`, async () => {
      const data = wave(
        ...Array.from({ length: 8 }, () => chunk('JUNK', Buffer.from([0]))),
        chunk('data', Buffer.alloc(8))
      );
      const outside = chunk('LIST', Buffer.concat([Buffer.from('INFO'), chunk('INAM', Buffer.from('Outside\0'))]));
      const tokenizer = await tokenize(Buffer.concat([data, outside]));
      try {
        const { common, format } = await mm.parseFromTokenizer(tokenizer);
        assert.strictEqual(format.numberOfSamples, 4);
        assert.isUndefined(common.title);
        assert.strictEqual(tokenizer.position, data.length);
      } finally {
        await tokenizer.close();
      }
    });

    it(`preserves duration recovery and warnings for an oversized audio chunk (${source})`, async () => {
      const tokenizer = await tokenize(wave(chunk('data', Buffer.alloc(8), 16)));
      try {
        const { format, quality } = await mm.parseFromTokenizer(tokenizer);
        assert.includeDeepMembers(quality.warnings, [{ message: 'Data chunk size exceeds file size' }]);
        if (source !== 'stream') {
          assert.strictEqual(format.numberOfSamples, 4);
          assert.strictEqual(format.duration, 4 / 8000);
          assert.includeDeepMembers(quality.warnings, [{ message: 'data chunk length exceeding file length' }]);
        }
      } finally {
        await tokenizer.close();
      }
    });
  }
});
