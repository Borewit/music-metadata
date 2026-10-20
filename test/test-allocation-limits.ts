import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { assert, expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { BufferSizeError, EndOfStreamError, fromBuffer, fromStream } from 'strtok3';
import * as Token from 'token-types';
import {
  getMaxMetadataEntries,
  getTokenizerOptions,
  readBuffer,
  readToken,
  validateAllocation
} from '../lib/common/Allocation.js';
import { MetadataCollector } from '../lib/common/MetadataCollector.js';
import { parseFromTokenizer } from '../lib/core.js';
import * as mm from '../lib/index.js';
import type { IPageHeader } from '../lib/ogg/OggToken.js';
import { VorbisStream } from '../lib/ogg/vorbis/VorbisStream.js';
import { UnexpectedFileContentError, UnsupportedFileTypeError } from '../lib/ParseError.js';
import { dff, dffChunk } from './fixtures/dsdiff.js';

use(chaiAsPromised);

function iff(id: string, size: number, payload = Buffer.alloc(0), littleEndian = false): Buffer {
  const header = Buffer.alloc(8);
  header.write(id);
  if (littleEndian) {
    header.writeUInt32LE(size, 4);
  } else {
    header.writeUInt32BE(size, 4);
  }
  return Buffer.concat([header, payload]);
}

describe('Shared metadata allocation limits', () => {
  it('defaults to 64 MiB and permits the exact limit', () => {
    assert.doesNotThrow(() => validateAllocation(64 * 1024 * 1024, {}));
    assert.throws(() => validateAllocation(64 * 1024 * 1024 + 1, {}), UnexpectedFileContentError, 'allocation limit');
  });

  it('does not account for collected metadata bytes or record counts', async () => {
    const collector = new MetadataCollector({ maxMemoryAllocation: 256, maxMetadataEntries: 1 });
    for (let index = 0; index < 3; ++index) {
      collector.addWarning(`warning ${index}`);
      collector.addStreamInfo({ id: index });
      await collector.addTag('ID3v2.4', 'GEOB', { data: new Uint8Array(1024) });
    }
    assert.lengthOf(collector.quality.warnings, 3);
    assert.lengthOf(collector.format.trackInfo, 3);
    assert.lengthOf(collector.native['ID3v2.4'], 3);
  });

  it('parses lyrics with default limits when collector options are omitted', async () => {
    const collector = new MetadataCollector();
    await collector.addTag('vorbis', 'LYRICS', '[00:00.00]First');
    assert.deepEqual(collector.common.lyrics?.[0].syncText, [{ timestamp: 0, text: 'First' }]);
  });

  it('limits decoded lyric lines per tag rather than across the collector', async () => {
    const collector = new MetadataCollector({ maxMetadataEntries: 2 });
    await collector.addTag('vorbis', 'LYRICS', '[00:00.00]First\n[00:01.00]Second');
    await collector.addTag('vorbis', 'LYRICS', '[00:02.00]Third\n[00:03.00]Fourth');
    assert.lengthOf(collector.common.lyrics, 2);
    await expect(collector.addTag('vorbis', 'LYRICS', '[00:00.00]A\n[00:01.00]B\n[00:02.00]C')).to.be.rejectedWith(
      UnexpectedFileContentError,
      'Line count 3 exceeds entry limit 2'
    );
  });

  it('defaults to 100000 entries independently of the byte-buffer limit', () => {
    assert.strictEqual(getMaxMetadataEntries({}), 100_000);
    assert.strictEqual(getMaxMetadataEntries({ maxMemoryAllocation: 1 }), 100_000);
    assert.strictEqual(getMaxMetadataEntries({ maxMetadataEntries: 200_000 }), 200_000);
  });

  for (const maxMetadataEntries of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
    it(`rejects invalid entry limit ${maxMetadataEntries} through the public API`, async () => {
      await expect(mm.parseBuffer(new Uint8Array(0), 'audio/wav', { maxMetadataEntries })).to.be.rejectedWith(
        RangeError,
        'maxMetadataEntries must be a positive safe integer'
      );
    });
  }

  for (const size of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN, Number.POSITIVE_INFINITY]) {
    it(`rejects invalid allocation size ${size} before asking the tokenizer to read`, async () => {
      const tokenizer = fromBuffer(new Uint8Array(0));
      tokenizer.readToken = async () => assert.fail('must validate before allocation');
      await expect(readToken(tokenizer, new Token.Uint8ArrayType(size), {})).to.be.rejectedWith(
        UnexpectedFileContentError,
        'Invalid allocation size'
      );
    });
  }

  for (const maxChapterCount of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
    it(`rejects invalid chapter limit ${maxChapterCount} through the public API`, async () => {
      await expect(mm.parseBuffer(new Uint8Array(0), 'audio/wav', { maxChapterCount })).to.be.rejectedWith(
        RangeError,
        'maxChapterCount must be a positive safe integer'
      );
    });
  }

  for (const maxMemoryAllocation of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
    it(`rejects invalid option ${maxMemoryAllocation} through the public API`, async () => {
      await expect(mm.parseBuffer(new Uint8Array(0), 'audio/wav', { maxMemoryAllocation })).to.be.rejectedWith(
        RangeError,
        'maxMemoryAllocation must be a positive safe integer'
      );
    });
  }

  it('checks remaining input at an explicit position before allocating', async () => {
    const tokenizer = fromBuffer(new Uint8Array(128));
    tokenizer.readBuffer = async () => assert.fail('must reject before allocation');
    await expect(readBuffer(tokenizer, 100, {}, 32)).to.be.rejectedWith(EndOfStreamError);
  });

  for (const size of [undefined, 1024 * 1024]) {
    it(`preserves multibyte text and the following token using bounded stream reads (size=${size})`, async () => {
      const payload = Buffer.alloc(65539, 0x61);
      payload.set([0xe2, 0x82, 0xac], 65535);
      const tokenizer = await fromStream(Readable.from([payload, Buffer.from([42])], { objectMode: false }), {
        fileInfo: { size }
      });
      const originalRead = tokenizer.readBuffer.bind(tokenizer);
      tokenizer.readBuffer = (buffer, options) => {
        assert.isAtMost(buffer.length, 64 * 1024);
        return originalRead(buffer, options);
      };
      try {
        assert.strictEqual(
          await readToken(tokenizer, new Token.StringType(payload.length, 'utf-8'), {
            maxMemoryAllocation: payload.length
          }),
          `${'a'.repeat(65535)}€a`
        );
        assert.strictEqual(await tokenizer.readNumber(Token.UINT8), 42);
      } finally {
        await tokenizer.close();
      }
    });
  }

  it('reads a truncated below-limit stream without a full payload allocation', async () => {
    const tokenizer = await fromStream(Readable.from([Buffer.alloc(1)], { objectMode: false }));
    const originalRead = tokenizer.readBuffer.bind(tokenizer);
    tokenizer.readBuffer = (buffer, options) => {
      assert.isAtMost(buffer.length, 64 * 1024);
      return originalRead(buffer, options);
    };
    try {
      await expect(readBuffer(tokenizer, 32 * 1024 * 1024, {})).to.be.rejectedWith(EndOfStreamError);
    } finally {
      await tokenizer.close();
    }
  });

  for (const length of [32, 64 * 1024 + 1]) {
    it(`rejects a short custom tokenizer read for a ${length}-byte payload`, async () => {
      const tokenizer = await fromStream(Readable.from([Buffer.from([42])], { objectMode: false }));
      const originalRead = tokenizer.readBuffer.bind(tokenizer);
      tokenizer.readBuffer = (buffer, options) => originalRead(buffer, { ...options, mayBeLess: true });
      try {
        await expect(readBuffer(tokenizer, length, {})).to.be.rejectedWith(EndOfStreamError);
      } finally {
        await tokenizer.close();
      }
    });
  }

  for (const [name, sample, mimeType] of [
    [
      'WAV fmt',
      iff('RIFF', 104, Buffer.concat([Buffer.from('WAVE'), iff('fmt ', 92, Buffer.alloc(0), true)]), true),
      'audio/wav'
    ],
    [
      'WAV ID3',
      iff('RIFF', 104, Buffer.concat([Buffer.from('WAVE'), iff('id3 ', 92, Buffer.alloc(0), true)]), true),
      'audio/wav'
    ],
    ['AIFF text', iff('FORM', 104, Buffer.concat([Buffer.from('AIFF'), iff('NAME', 92)])), 'audio/aiff'],
    ['AIFF ID3', iff('FORM', 104, Buffer.concat([Buffer.from('AIFF'), iff('ID3 ', 92)])), 'audio/aiff'],
    ['DSDIFF ID3', dff(dffChunk('ID3 ', 92n), 108n), 'audio/dsd'],
    ['MP4 date', Buffer.from([0, 0, 0, 100, 0x64, 0x61, 0x74, 0x65]), 'audio/mp4']
  ] as const) {
    it(`applies a configured cap before reading ${name} from an unknown-size stream`, async () => {
      const tokenizer = await fromStream(Readable.from([sample], { objectMode: false }), {
        fileInfo: { mimeType }
      });
      const originalRead = tokenizer.readBuffer.bind(tokenizer);
      tokenizer.readBuffer = (buffer, options) => {
        assert.isAtMost(buffer.length, 64, 'no oversized allocation may reach the tokenizer');
        return originalRead(buffer, options);
      };
      try {
        await expect(mm.parseFromTokenizer(tokenizer, { maxMemoryAllocation: 64 })).to.be.rejectedWith(
          UnexpectedFileContentError,
          'allocation limit 64'
        );
      } finally {
        await tokenizer.close();
      }
    });
  }

  it('applies the configured cap to a standalone ID3v2 tag on an unknown-size stream', async () => {
    const sample = Buffer.from([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 100]);
    await expect(
      mm.parseStream(Readable.from([sample], { objectMode: false }), 'audio/mpeg', { maxMemoryAllocation: 64 })
    ).to.be.rejectedWith(UnexpectedFileContentError, 'allocation limit 64');
  });

  it('can raise the limit for legitimate metadata', async () => {
    const sample = iff('FORM', 112, Buffer.concat([Buffer.from('AIFF'), iff('NAME', 100, Buffer.alloc(100, 0x61))]));
    await expect(mm.parseBuffer(sample, 'audio/aiff', { maxMemoryAllocation: 64 })).to.be.rejectedWith(
      UnexpectedFileContentError,
      'allocation limit 64'
    );
    const metadata = await mm.parseBuffer(sample, 'audio/aiff', { maxMemoryAllocation: 100 });
    assert.strictEqual(metadata.common.title, 'a'.repeat(100));
  });

  it('bounds a WavPack metadata sub-block by its enclosing block', async () => {
    const sample = Buffer.alloc(36);
    sample.write('wvpk');
    sample.writeUInt32LE(28, 4);
    sample[32] = 0x80;
    sample.writeUIntLE(0xffffff, 33, 3);
    await expect(mm.parseBuffer(sample, 'audio/wavpack')).to.be.rejectedWith(
      UnexpectedFileContentError,
      'Metadata sub-block exceeds its enclosing block'
    );
  });

  it('rejects a forged FLAC comment count without allocating an array from it', async () => {
    const sample = Buffer.alloc(16);
    sample.write('fLaC');
    sample[4] = 0x84; // Last block, VORBIS_COMMENT
    sample.writeUIntBE(8, 5, 3);
    sample.writeUInt32LE(0xffffffff, 12);
    await expect(mm.parseBuffer(sample, 'audio/flac')).to.be.rejectedWith(
      UnexpectedFileContentError,
      'Vorbis comment count 4294967295 exceeds remaining data'
    );
  });

  it('rejects a valid-sized FLAC comment list exceeding the decoded-entry allocation limit', async () => {
    const comments = Buffer.alloc(16);
    comments.writeUInt32LE(2, 4);
    const sample = Buffer.concat([Buffer.from([0x66, 0x4c, 0x61, 0x43, 0x84, 0, 0, 16]), comments]);
    await expect(mm.parseBuffer(sample, 'audio/flac', { maxMetadataEntries: 1 })).to.be.rejectedWith(
      UnexpectedFileContentError,
      'Vorbis comment count 2 exceeds entry limit 1'
    );
  });

  for (const [name, payload, message] of [
    ['vendor length', [0, 0, 0], 'Truncated Vorbis comment length'],
    ['vendor string', [5, 0, 0, 0, 0x61], 'Vorbis comment length 5 exceeds remaining data 1'],
    ['user comment', [0, 0, 0, 0, 1, 0, 0, 0, 5, 0, 0, 0], 'Vorbis comment length 5 exceeds remaining data 0']
  ] as const) {
    it(`rejects a truncated FLAC Vorbis ${name}`, async () => {
      const sample = Buffer.alloc(8 + payload.length);
      sample.write('fLaC');
      sample[4] = 0x84; // Last block, VORBIS_COMMENT
      sample.writeUIntBE(payload.length, 5, 3);
      sample.set(payload, 8);
      await expect(mm.parseBuffer(sample, 'audio/flac')).to.be.rejectedWith(UnexpectedFileContentError, message);
    });
  }

  it('caps continued Ogg pages before retaining and merging the payload', async () => {
    const consumer = new VorbisStream(new MetadataCollector({}), { maxMemoryAllocation: 64 });
    const header = {
      headerType: { firstPage: false, lastPage: false, continued: false }
    } as IPageHeader;
    await consumer.parsePage(header, new Uint8Array(32));
    header.headerType.continued = true;
    await consumer.parsePage(header, new Uint8Array(32));
    await expect(consumer.parsePage(header, new Uint8Array(1))).to.be.rejectedWith(
      UnexpectedFileContentError,
      'allocation limit 64'
    );
  });

  it('caps retained empty Ogg page segments independently of their byte length', async () => {
    const consumer = new VorbisStream(new MetadataCollector({}), { maxMetadataEntries: 16 });
    const header = {
      headerType: { firstPage: false, lastPage: false, continued: false }
    } as IPageHeader;
    await consumer.parsePage(header, new Uint8Array(0));
    header.headerType.continued = true;
    for (let index = 1; index < 16; ++index) {
      await consumer.parsePage(header, new Uint8Array(0));
    }
    await expect(consumer.parsePage(header, new Uint8Array(0))).to.be.rejectedWith(
      Error,
      'Buffered Ogg page count exceeds entry limit'
    );
  });

  describe('file-type allocation cap', () => {
    // PNG signature, IHDR with 13 bytes of data and a CRC, then an empty IDAT header.
    const png = new Uint8Array(41);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
    png.set([0, 0, 0, 0, 0x49, 0x44, 0x41, 0x54], 33);

    it('caps media format detection independently of a caller-supplied tokenizer', async () => {
      // Leave the outer tokenizer uncapped to exercise file-type's own tokenizer.
      await expect(parseFromTokenizer(fromBuffer(png), { maxMemoryAllocation: 2 })).to.be.rejectedWith(
        BufferSizeError,
        'maxBufferSize 2'
      );
      // Raising the cap permits detection; PNG is recognized but is not a supported media format.
      await expect(parseFromTokenizer(fromBuffer(png), { maxMemoryAllocation: 4 })).to.be.rejectedWith(
        UnsupportedFileTypeError,
        'image/png'
      );
    });

    it('caps cover art detection and allows callers to raise the limit', async () => {
      const limited = new MetadataCollector({ maxMemoryAllocation: 2 });
      await expect(limited.addTag('ID3v2.3', 'APIC', { data: png, format: '' })).to.be.rejectedWith(
        BufferSizeError,
        'maxBufferSize 2'
      );
      for (const options of [undefined, { maxMemoryAllocation: 4 }]) {
        const metadata = new MetadataCollector(options);
        await metadata.addTag('ID3v2.3', 'APIC', { data: png, format: '' });
        assert.strictEqual(metadata.common.picture?.[0].format, 'image/png');
      }
    });
  });

  describe('Tokenizer allocation limits (GHSA-5pwx-m48f-hw27)', () => {
    interface WorkerResult {
      error: string;
      message?: string;
      requestedSize?: number;
      maxBufferSize?: number;
      largestAllocation: number;
    }

    function regression(mode: string, size: bigint, limit?: number): WorkerResult {
      const worker = fileURLToPath(new URL('./fixtures/dsdiff-allocation-worker.js', import.meta.url));
      const args = [worker, mode, String(size)];
      if (limit !== undefined) {
        args.push(String(limit));
      }
      const child = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 10000 });
      assert.isUndefined(child.error, child.error?.message);
      assert.isNull(child.signal, `Worker terminated by ${child.signal}: ${child.stderr}`);
      assert.strictEqual(child.status, 0, child.stderr);
      return JSON.parse(child.stdout.trim()) as WorkerResult;
    }

    const id3Header = new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0]);
    let directory: string;
    let filePath: string;

    before(async () => {
      directory = await mkdtemp(path.join(tmpdir(), 'music-metadata-tokenizer-cap-'));
      filePath = path.join(directory, 'header.mp3');
      await writeFile(filePath, id3Header);
    });

    after(async () => {
      await rm(directory, { recursive: true, force: true });
    });

    for (const size of [2n * 1024n ** 3n, 4n * 1024n ** 3n]) {
      it(`rejects the original ID3 allocation sink of ${size} bytes using only the tokenizer cap`, () => {
        const result = regression('tokenizer', size);
        assert.strictEqual(result.error, 'BufferSizeError');
        assert.strictEqual(result.requestedSize, Number(size));
        assert.strictEqual(result.maxBufferSize, 64 * 1024 * 1024);
        assert.isAtMost(result.largestAllocation, 64 * 1024, 'no oversized allocation was attempted');
      });

      it(`detects the unsafe ${size}-byte allocation when the tokenizer cap is disabled`, () => {
        const result = regression('uncapped-tokenizer', size);
        assert.strictEqual(result.error, 'OversizedAllocationError');
        assert.strictEqual(result.largestAllocation, Number(size));
      });

      for (const mode of ['buffer', 'file', 'blob', 'stream', 'advertised-stream', 'web-stream', 'BYOB-web-stream']) {
        it(`rejects the ${size}-byte advisory payload through ${mode} before attempting an oversized allocation`, () => {
          const result = regression(mode, size);
          assert.strictEqual(result.error, 'UnexpectedFileContentError');
          assert.isAtMost(result.largestAllocation, 64 * 1024, 'no oversized allocation was attempted');
        });
      }
    }

    it('rejects the advisory 64-bit size at the original sink before attempting an allocation', () => {
      const result = regression('tokenizer', 0x7fffffffffffffffn);
      assert.strictEqual(result.error, 'RangeError');
      assert.include(result.message, 'non-negative safe integer');
      assert.isAtMost(result.largestAllocation, 64 * 1024);
    });

    it('uses the configured music-metadata limit for the tokenizer safety net', () => {
      const result = regression('tokenizer', 1024n * 1024n, 64 * 1024);
      assert.strictEqual(result.error, 'BufferSizeError');
      assert.strictEqual(result.requestedSize, 1024 * 1024);
      assert.strictEqual(result.maxBufferSize, 64 * 1024);
      assert.isAtMost(result.largestAllocation, 64 * 1024);
    });

    it('raises the tokenizer limit once for successive legitimate reads and peeks', async () => {
      const payload = Uint8Array.from({ length: 128 }, (_, index) => index);
      const tokenizer = fromBuffer(payload, getTokenizerOptions({ maxMemoryAllocation: 64 }));
      await expect(tokenizer.readToken(new Token.Uint8ArrayType(65))).to.be.rejectedWith(BufferSizeError);
      const raised = fromBuffer(payload, getTokenizerOptions({ maxMemoryAllocation: 128 }));
      assert.deepEqual(await raised.peekToken(new Token.Uint8ArrayType(128)), payload);
      assert.deepEqual(await raised.readToken(new Token.Uint8ArrayType(128)), payload);
    });

    it('caps distant stream peeks, including with mayBeLess enabled', async () => {
      const tokenizer = await fromStream(
        Readable.from([new Uint8Array(128)], { objectMode: false }),
        getTokenizerOptions({ maxMemoryAllocation: 64 })
      );
      try {
        await expect(tokenizer.peekToken(Token.UINT8, 64)).to.be.rejectedWith(BufferSizeError);
        await expect(tokenizer.peekBuffer(new Uint8Array(1), { position: 64, mayBeLess: true })).to.be.rejectedWith(
          BufferSizeError
        );
        assert.strictEqual(tokenizer.position, 0);
      } finally {
        await tokenizer.close();
      }
    });

    for (const parse of ['buffer', 'file', 'blob', 'stream', 'web-stream'] as const) {
      it(`enables the cap on the public ${parse} tokenizer, including token reads outside parser allocation helpers`, async () => {
        // The MPEG parser peeks at the 10-byte ID3 header directly through the tokenizer.
        const options = { maxMemoryAllocation: 8 };
        const parsers = {
          buffer: () => mm.parseBuffer(id3Header, 'audio/mpeg', options),
          file: () => mm.parseFile(filePath, options),
          blob: () => mm.parseBlob(new Blob([id3Header], { type: 'audio/mpeg' }), options),
          stream: () => mm.parseStream(Readable.from([id3Header], { objectMode: false }), 'audio/mpeg', options),
          'web-stream': () => mm.parseWebStream(new Blob([id3Header]).stream(), 'audio/mpeg', options)
        };
        await expect(parsers[parse]()).to.be.rejectedWith(BufferSizeError, 'maxBufferSize 8');
      });
    }

    it('rejects invalid limits before locking a web stream', async () => {
      const stream = new Blob([id3Header]).stream();
      await expect(mm.parseWebStream(stream, 'audio/mpeg', { maxMemoryAllocation: 0 })).to.be.rejectedWith(
        RangeError,
        'maxMemoryAllocation must be a positive safe integer'
      );
      assert.isFalse(stream.locked);
    });

    it('rejects invalid limits before opening a file', async () => {
      await expect(mm.parseFile(path.join(directory, 'missing.mp3'), { maxMemoryAllocation: 0 })).to.be.rejectedWith(
        RangeError,
        'maxMemoryAllocation must be a positive safe integer'
      );
    });
  });
});
