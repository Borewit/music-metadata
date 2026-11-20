import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PassThrough, Readable } from 'node:stream';
import { EndOfStreamError, fromBuffer, fromFile, fromStream } from 'strtok3';
import { StringType, UINT32_BE } from 'token-types';
import { assert, describe, expect, it } from 'vitest';
import { MetadataCollector } from '../lib/common/MetadataCollector.js';
import * as mm from '../lib/index.js';
import { MpegFrameHeader } from '../lib/mpeg/MpegFrameHeader.js';
import { MpegFrameReader } from '../lib/mpeg/MpegFrameReader.js';
import { MpegParser } from '../lib/mpeg/MpegParser.js';
import { readXingHeader } from '../lib/mpeg/XingTag.js';

function makeFrame(version = 0xfb, mode = 0, bitrate = 0x90): Buffer {
  const prefix = Buffer.from([0xff, version, bitrate, mode]);
  const header = new MpegFrameHeader(prefix);
  const frame = Buffer.alloc(header.frameSize);
  frame.set(prefix);
  return frame;
}

function makeXing(flags: number): Buffer {
  const parts = [Buffer.alloc(4)];
  parts[0].writeUInt32BE(flags);
  if (flags & 1) {
    const frames = Buffer.alloc(4);
    frames.writeUInt32BE(123);
    parts.push(frames);
  }
  if (flags & 2) {
    const bytes = Buffer.alloc(4);
    bytes.writeUInt32BE(41700);
    parts.push(bytes);
  }
  if (flags & 4) {
    parts.push(Buffer.from(Array.from({ length: 100 }, (_, i) => i)));
  }
  if (flags & 8) {
    const scale = Buffer.alloc(4);
    scale.writeUInt32BE(70);
    parts.push(scale);
  }
  const extended = Buffer.alloc(27);
  extended.writeUInt32BE(2 ** 22, 2);
  extended.writeUInt16BE(0x2c44, 6); // Radio replay gain, +6.8 dB.
  extended.writeUInt16BE(0x2c44, 8); // Album replay gain, +6.8 dB.
  extended.writeUInt32BE(123000, 20);
  parts.push(Buffer.from('LAME3.99r'), extended);
  return Buffer.concat(parts);
}

const sources = ['buffer', 'sized stream', 'unknown-size stream', 'web stream'] as const;
async function parse(data: Buffer, source: (typeof sources)[number]) {
  if (source === 'buffer') {
    return mm.parseBuffer(data, 'audio/mpeg', { duration: true });
  }
  // Split transport chunks independently of both frame and lookahead boundaries.
  const chunks = Array.from({ length: Math.ceil(data.length / 73) }, (_, i) => data.subarray(i * 73, (i + 1) * 73));
  if (source === 'web stream') {
    return mm.parseWebStream(
      new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(chunk);
          }
          controller.close();
        }
      }),
      { mimeType: 'audio/mpeg', size: data.length },
      { duration: true }
    );
  }
  return mm.parseStream(
    Readable.from(chunks, { objectMode: false }),
    { mimeType: 'audio/mpeg', size: source === 'sized stream' ? data.length : undefined },
    { duration: true }
  );
}

describe('MPEG lookahead regressions', () => {
  for (const offset of [0, 900, 963, 1000, 1021, 1022, 1023, 1024, 2047]) {
    for (const source of sources) {
      it(`preserves headers and frame counts at offset ${offset} (${source})`, async () => {
        const frame = makeFrame();
        const data = Buffer.concat([Buffer.alloc(offset), ...new Array(8).fill(frame)]);
        const metadata = await parse(data, source);
        assert.equal(metadata.format.codec, 'MPEG 1 Layer 3');
        assert.equal(metadata.format.numberOfSamples, 8 * 1152);
        assert.equal(metadata.format.duration, (8 * 1152) / 44100);
        assert.deepEqual(metadata.quality.warnings, []);
      });
    }
  }

  for (const version of [0xfb, 0xfa, 0xf3, 0xf2, 0xe3, 0xe2]) {
    for (const mode of [0, 0xc0]) {
      it(`preserves Info duration and CRC/side-info offsets (${version.toString(16)}, ${mode})`, async () => {
        const frame = makeFrame(version, mode);
        const header = new MpegFrameHeader(frame);
        frame.write('Info', 4 + header.sideInfoLength);
        makeXing(3).copy(frame, 8 + header.sideInfoLength);
        // The first CRC is inside side information; later CRCs precede it.
        const data = Buffer.concat(new Array(6).fill(frame));
        for (const source of ['buffer', 'unknown-size stream'] as const) {
          const metadata = await parse(data, source);
          assert.equal(metadata.format.duration, (123 * header.samplesPerFrame) / header.samplingRate);
          assert.equal(metadata.format.tool, 'LAME 3.99r');
          assert.equal(metadata.format.trackGain, 6.8);
          assert.equal(metadata.format.albumGain, 6.8);
          assert.equal(metadata.format.trackPeakLevel, 0.5);
          assert.equal(metadata.format.numberOfChannels, header.numberOfChannels);
          assert.deepEqual(metadata.quality.warnings, []);
        }
      });
    }
  }

  for (const source of sources) {
    it(`counts short final frames and excludes a truncated different-bitrate frame (${source})`, async () => {
      const full = makeFrame();
      const short = makeFrame(0xfb, 0, 0x10);
      const partial = makeFrame(0xfb, 0, 0xa0).subarray(0, 200);
      const data = Buffer.concat([...new Array(6).fill(full), short, partial]);
      const { format } = await parse(data, source);
      assert.equal(format.numberOfSamples, 7 * 1152);
      assert.equal(format.duration, (7 * 1152) / 44100);
      assert.equal(format.bitrate, source === 'unknown-size stream' ? 32000 : (data.length * 8) / format.duration!);
      assert.equal(format.codecProfile, 'VBR');
    });
  }

  it('does not search stale bytes after a short final peek', async () => {
    const frame = makeFrame();
    const tokenizer = fromBuffer(Buffer.concat([...new Array(6).fill(frame), Buffer.alloc(200)]));
    const metadata = new MetadataCollector({ duration: true });
    await new MpegParser(metadata, tokenizer, { duration: true, skipPostHeaders: true }).postId3v2Parse();
    assert.equal(metadata.format.numberOfSamples, 6 * 1152);
    assert.equal(tokenizer.position, 6 * frame.length, 'junk must not expose a sync from the previous window');
  });

  it('does not mistake the end of a reused window for stream EOF', async () => {
    const frame = makeFrame();
    const data = Buffer.concat(new Array<Buffer>(8).fill(frame));
    // This looks like ID3v1 at the end of the initial window, not at physical EOF.
    data.write('TAG', 1024 - 128);
    const metadata = await parse(data, 'unknown-size stream');
    assert.equal(metadata.format.numberOfSamples, 8 * 1152);
    assert.equal(metadata.format.duration, (8 * 1152) / 44100);
    assert.deepEqual(metadata.quality.warnings, []);
  });

  it('still checks the physical end of a file with an overstated size', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'mpeg-lookahead-'));
    const filename = path.join(directory, 'truncated.mp3');
    const frame = makeFrame();
    const data = Buffer.concat([...new Array(6).fill(frame), frame.subarray(0, -1)]);
    await writeFile(filename, data);
    const tokenizer = await fromFile(filename);
    tokenizer.fileInfo.size = 7 * frame.length;
    try {
      const metadata = new MetadataCollector({ duration: true });
      await new MpegParser(metadata, tokenizer, { duration: true }).postId3v2Parse();
      assert.equal(metadata.format.numberOfSamples, 6 * 1152);
      assert.equal(metadata.format.duration, (6 * 1152) / 44100);
    } finally {
      await tokenizer.close();
      await rm(directory, { recursive: true });
    }
  });

  it('preserves the source token allocation guard when parsing LAME headers', async () => {
    const frame = makeFrame();
    frame.write('Info', 36);
    makeXing(3).copy(frame, 40);
    const tokenizer = fromBuffer(Buffer.concat(new Array(6).fill(frame)), { maxBufferSize: 20 });
    const metadata = new MetadataCollector({});
    await expect(new MpegParser(metadata, tokenizer, {}).postId3v2Parse()).rejects.toThrow(/maxBufferSize 20/);
  });

  it('retains live stream behavior without requiring more than the existing lookahead', async () => {
    const stream = new PassThrough();
    const frame = makeFrame();
    stream.write(Buffer.concat(new Array(6).fill(frame)));
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const metadata = await Promise.race([
        mm.parseStream(stream, 'audio/mpeg', { skipPostHeaders: true }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Waited for live audio EOF')), 1000);
        })
      ]);
      assert.equal(metadata.format.sampleRate, 44100);
      assert.isFalse(stream.readableEnded);
    } finally {
      clearTimeout(timer);
      stream.destroy();
    }
  });
});

describe('MPEG frame reader', () => {
  it('reuses only complete expected sync boundaries, not junk or short tails', async () => {
    const data = Buffer.alloc(1024);
    data.set([0xff, 0xfb, 0x90, 0], 860);
    data.set([0xff, 0xfb, 0x90, 0], 900);
    const tokenizer = fromBuffer(data);
    const reader = new MpegFrameReader(tokenizer);
    await reader.refresh();
    assert.isUndefined(reader.syncBuffer(), 'junk requires a new lookahead');
    tokenizer.setPosition(860);
    assert.equal(reader.syncBuffer()?.length, 164);
    tokenizer.setPosition(900);
    assert.isUndefined(reader.syncBuffer(), 'short tails require a fresh physical EOF check');
  });

  for (const prefix of [0, 77, 960, 1022]) {
    for (let flags = 0; flags < 16; ++flags) {
      it(`keeps Xing fields, LAME gains and owned TOC bytes (${prefix}, flags=${flags})`, async () => {
        const data = Buffer.concat([Buffer.alloc(prefix), makeXing(flags), Buffer.alloc(1024)]);
        const tokenizer = fromBuffer(data);
        const reader = new MpegFrameReader(tokenizer);
        await reader.refresh();
        await tokenizer.ignore(prefix);
        const expectedSource = fromBuffer(data);
        await expectedSource.ignore(prefix);
        const expected = await readXingHeader(expectedSource);
        const actual = await readXingHeader(reader);
        assert.deepEqual(actual, expected);
        assert.equal(tokenizer.position, expectedSource.position);
        assert.equal(actual.lame?.extended?.track_gain?.adjustment, 6.8);
        reader.buffer.fill(0xff);
        assert.deepEqual(actual.toc, expected.toc, 'TOC must not alias reusable lookahead');
      });
    }
  }

  it('avoids underlying reads for cached tokens, but still consumes stream bytes', async () => {
    const data = Buffer.alloc(2048);
    data.writeUInt32BE(123, 10);
    const tokenizer = await fromStream(Readable.from([data], { objectMode: false }));
    const reader = new MpegFrameReader(tokenizer);
    await reader.refresh();
    await tokenizer.ignore(10);
    assert.equal(await reader.peekToken(UINT32_BE), 123); // Establish the source's token-length guard.
    const read = tokenizer.readBuffer.bind(tokenizer);
    const ignore = tokenizer.ignore.bind(tokenizer);
    let consuming = false;
    tokenizer.ignore = async (length): Promise<number> => {
      consuming = true;
      try {
        return await ignore(length);
      } finally {
        consuming = false;
      }
    };
    tokenizer.readBuffer = (buffer, options): Promise<number> => {
      if (!consuming) {
        throw new Error('Duplicate read inside existing lookahead');
      }
      return read(buffer, options);
    };
    tokenizer.peekBuffer = async (): Promise<number> => {
      throw new Error('Duplicate peek inside existing lookahead');
    };
    assert.equal(await reader.peekToken(UINT32_BE), 123);
    assert.equal(tokenizer.position, 10, 'peek never consumes');
    assert.equal(await reader.readToken(UINT32_BE), 123);
    const bytes = new Uint8Array(3);
    assert.equal(await reader.readBuffer(bytes), 3);
    assert.equal(tokenizer.position, 17, 'cached reads consume bytes on the original stream');
    await tokenizer.close();
  });

  it('rejects a short cached ignore before decoding a token', async () => {
    const tokenizer = fromBuffer(Buffer.alloc(1024));
    const reader = new MpegFrameReader(tokenizer);
    await reader.refresh();
    await reader.peekToken(UINT32_BE);
    const ignore = tokenizer.ignore.bind(tokenizer);
    tokenizer.ignore = length => ignore(length - 1);
    await expect(reader.readToken(UINT32_BE)).rejects.toThrow(EndOfStreamError);
  });

  it('invalidates lookahead when a refresh fails', async () => {
    const tokenizer = fromBuffer(Buffer.alloc(1024));
    const reader = new MpegFrameReader(tokenizer);
    await reader.refresh();
    tokenizer.peekBuffer = async (): Promise<number> => {
      throw new Error('Transport failure');
    };
    await expect(reader.refresh()).rejects.toThrow(/Transport failure/);
    assert.equal(reader.length, 0);
    await expect(reader.peekToken(new StringType(4, 'ascii'))).rejects.toThrow(/Transport failure/);
  });

  it('does not bypass the advertised size guard for cached tokens', async () => {
    const tokenizer = fromBuffer(Buffer.alloc(1024));
    const reader = new MpegFrameReader(tokenizer);
    await reader.refresh();
    await reader.peekToken(UINT32_BE);
    tokenizer.fileInfo.size = 3;
    await expect(reader.peekToken(UINT32_BE)).rejects.toThrow(EndOfStreamError);
    await expect(reader.readToken(UINT32_BE)).rejects.toThrow(EndOfStreamError);
    assert.equal(tokenizer.position, 0);
  });

  it('does not bypass a caller-supplied tokenizer allocation limit', async () => {
    const tokenizer = fromBuffer(Buffer.alloc(1024), { maxBufferSize: 3 });
    const reader = new MpegFrameReader(tokenizer);
    await reader.refresh(); // Caller-owned lookahead is not subject to a token allocation limit.
    await reader.peekToken(new StringType(3, 'ascii'));
    await expect(reader.peekToken(UINT32_BE)).rejects.toThrow(/maxBufferSize 3/);
    await expect(reader.readToken(UINT32_BE)).rejects.toThrow(/maxBufferSize 3/);
    assert.equal(tokenizer.position, 0);
  });

  it('preserves buffer reads beyond an understated advertised size', async () => {
    const data = Buffer.from(Array.from({ length: 1024 }, (_, i) => i & 0xff));
    const tokenizer = fromBuffer(data);
    const reader = new MpegFrameReader(tokenizer);
    await reader.refresh();
    tokenizer.fileInfo.size = 3;
    const buffer = new Uint8Array(4);
    assert.equal(await reader.peekBuffer(buffer), 4);
    assert.equal(tokenizer.position, 0);
    assert.equal(await reader.readBuffer(buffer), 4);
    assert.equal(tokenizer.position, 4);
    assert.deepEqual(buffer, Uint8Array.of(0, 1, 2, 3));
  });

  it('keeps cached extended LAME gains at token-relative offsets', async () => {
    const xing = makeXing(15);
    const tokenizer = fromBuffer(Buffer.concat([xing, xing, Buffer.alloc(1024)]));
    const reader = new MpegFrameReader(tokenizer);
    await reader.refresh();
    const first = await readXingHeader(reader); // Validate each token length on the source.
    const readToken = tokenizer.readToken.bind(tokenizer);
    tokenizer.readToken = async <T>(): Promise<T> => {
      throw new Error('Repeated Xing token read inside lookahead');
    };
    const second = await readXingHeader(reader);
    assert.deepEqual(second, first);
    assert.equal(second.lame?.extended?.track_gain?.adjustment, 6.8);
    tokenizer.readToken = readToken;
  });
});
