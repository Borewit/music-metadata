import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { BufferSizeError, fromStream } from 'strtok3';
import * as Token from 'token-types';
import { getTokenizerOptions } from '../../lib/common/Allocation.js';
import { FourCcToken } from '../../lib/common/FourCC.js';
import { ChunkHeader64 } from '../../lib/dsdiff/DsdiffToken.js';
import * as mm from '../../lib/index.js';

const [mode, sizeText, limitText] = process.argv.slice(2);
const size = BigInt(sizeText);
const options = limitText === undefined ? {} : { maxMemoryAllocation: Number(limitText) };
const sample = new Uint8Array(28);
const view = new DataView(sample.buffer);
sample.set([0x46, 0x52, 0x4d, 0x38]); // FRM8
view.setBigInt64(4, size <= BigInt(Number.MAX_SAFE_INTEGER) ? size + 16n : 256n);
sample.set([0x44, 0x53, 0x44, 0x20], 12); // DSD form
sample.set([0x49, 0x44, 0x33, 0x20], 16); // ID3 chunk
view.setBigInt64(20, size);

class OversizedAllocationError extends Error {
  constructor(size: number) {
    super(`Attempted allocation of ${size} bytes`);
    this.name = 'OversizedAllocationError';
  }
}

// A broken guard must fail the regression without attempting a real multi-gigabyte allocation.
const originalUint8Array = globalThis.Uint8Array;
let largestAllocation = 0;
globalThis.Uint8Array = new Proxy(originalUint8Array, {
  construct(target, args, newTarget) {
    if (typeof args[0] === 'number') {
      largestAllocation = Math.max(largestAllocation, args[0]);
      if (args[0] > 1024 * 1024) {
        throw new OversizedAllocationError(args[0]);
      }
    }
    return Reflect.construct(target, args, newTarget);
  }
});

let directory: string | undefined;
let result: { error: string; message?: string; requestedSize?: number; maxBufferSize?: number };
try {
  if (mode === 'tokenizer' || mode === 'uncapped-tokenizer') {
    const tokenizer = await fromStream(
      Readable.from([sample], { objectMode: false }),
      mode === 'tokenizer' ? getTokenizerOptions(options) : undefined
    );
    try {
      await tokenizer.readToken(ChunkHeader64);
      await tokenizer.readToken(FourCcToken);
      const header = await tokenizer.readToken(ChunkHeader64);
      // Replay the advisory's original allocation sink, without music-metadata's chunk/allocation guards.
      await tokenizer.readToken(new Token.Uint8ArrayType(Number(header.chunkSize)));
    } finally {
      await tokenizer.close();
    }
  } else if (mode === 'buffer') {
    await mm.parseBuffer(sample, 'audio/dsd', options);
  } else if (mode === 'blob') {
    await mm.parseBlob(new Blob([sample], { type: 'audio/dsd' }), options);
  } else if (mode === 'file') {
    directory = await mkdtemp(path.join(tmpdir(), 'music-metadata-dsdiff-worker-'));
    const filePath = path.join(directory, 'advisory.dff');
    await writeFile(filePath, sample);
    await mm.parseFile(filePath, options);
  } else if (mode === 'stream' || mode === 'advertised-stream') {
    await mm.parseStream(
      Readable.from([sample], { objectMode: false }),
      { mimeType: 'audio/dsd', size: mode === 'advertised-stream' ? Number(size + 28n) : undefined },
      options
    );
  } else if (mode === 'web-stream' || mode === 'BYOB-web-stream') {
    const blob = new Blob([sample]);
    const stream =
      mode === 'BYOB-web-stream'
        ? blob.stream()
        : new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(sample);
              controller.close();
            }
          });
    await mm.parseWebStream(stream, 'audio/dsd', options);
  } else {
    throw new Error(`Unknown regression mode: ${mode}`);
  }
  result = { error: 'none' };
} catch (error) {
  result = {
    error: error instanceof Error ? error.name : String(error),
    message: error instanceof Error ? error.message : undefined,
    requestedSize: error instanceof BufferSizeError ? error.requestedSize : undefined,
    maxBufferSize: error instanceof BufferSizeError ? error.maxBufferSize : undefined
  };
} finally {
  globalThis.Uint8Array = originalUint8Array;
  if (directory) {
    await rm(directory, { recursive: true, force: true });
  }
}
console.log(JSON.stringify({ ...result, largestAllocation }));
