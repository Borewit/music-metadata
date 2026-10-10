import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { assert, expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { BufferSizeError, fromBuffer, fromStream } from 'strtok3';
import * as Token from 'token-types';
import { getTokenizerOptions } from '../lib/common/Allocation.js';
import * as mm from '../lib/index.js';

use(chaiAsPromised);

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

describe('strtok3 safety net for GHSA-5pwx-m48f-hw27', () => {
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
