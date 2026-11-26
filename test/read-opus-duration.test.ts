import { rejects } from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { EndOfStreamError, fromBuffer } from 'strtok3';
import { assert, vi } from 'vitest';
import { MetadataCollector } from '../lib/common/MetadataCollector.js';
import { parseBuffer, parseStream, parseWebStream } from '../lib/index.js';
import { crc } from '../lib/ogg/OggCrc.js';
import { OggParser } from '../lib/ogg/OggParser.js';
import { PageHeader } from '../lib/ogg/OggToken.js';
import { ParserFactory } from '../lib/ParserFactory.js';
import type { IOptions } from '../lib/type.js';
import { samplePath } from './helpers/util.js';

const preSkip = 312;
const sampleRate = 48000;

function page(
  serial: number,
  sequence: number,
  flags: number,
  granule: number,
  data: Uint8Array,
  laces = Array.from({ length: Math.ceil(data.length / 255) }, (_, index) => Math.min(255, data.length - index * 255))
): Buffer {
  const result = Buffer.alloc(PageHeader.len + laces.length + data.length);
  result.write('OggS');
  result[5] = flags;
  result.writeBigUInt64LE(granule < 0 ? 0xffffffffffffffffn : BigInt(granule), 6);
  result.writeUInt32LE(serial, 14);
  result.writeUInt32LE(sequence, 18);
  result[26] = laces.length;
  result.set(laces, PageHeader.len);
  result.set(data, PageHeader.len + laces.length);
  result.writeUInt32LE(crc(result), 22);
  return result;
}

function identification(): Buffer {
  const data = Buffer.alloc(19);
  data.write('OpusHead');
  data[8] = 1;
  data[9] = 2;
  data.writeUInt16LE(preSkip, 10);
  data.writeUInt32LE(sampleRate, 12);
  return data;
}

function comments(title?: string): Buffer {
  const comments = title ? Buffer.from(`TITLE=${title}`) : undefined;
  const data = Buffer.alloc(16 + (comments ? 4 + comments.length : 0));
  data.write('OpusTags');
  if (comments) {
    data.writeUInt32LE(1, 12);
    data.writeUInt32LE(comments.length, 16);
    data.set(comments, 20);
  }
  return data;
}

function opusPages(serial = 1, finalSequence = 49, finalPayload = Buffer.alloc(4096)): Buffer[] {
  const pages = [page(serial, 0, 2, 0, identification()), page(serial, 1, 0, 0, comments())];
  for (let sequence = 2; sequence <= finalSequence; ++sequence) {
    pages.push(
      page(
        serial,
        sequence,
        sequence === finalSequence ? 4 : 0,
        preSkip + (sequence - 1) * sampleRate,
        sequence === finalSequence ? finalPayload : Buffer.alloc(4096)
      )
    );
  }
  return pages;
}

async function parseSequential(data: Uint8Array, knownSize = false) {
  return parseStream(
    Readable.from([data], { objectMode: false }),
    { mimeType: 'audio/ogg', ...(knownSize ? { size: data.length } : {}) },
    { duration: true }
  );
}

async function parseWithReadCount(data: Uint8Array, options: IOptions = {}) {
  const tokenizer = fromBuffer(data);
  const peek = vi.spyOn(tokenizer, 'peekBuffer');
  const metadata = new MetadataCollector(options);
  await new OggParser(metadata, tokenizer, { ...options, duration: true }).parse();
  return {
    metadata,
    // BufferTokenizer implements readBuffer using peekBuffer, so count just the latter.
    bytesRead: peek.mock.calls.reduce((sum, [buffer, readOptions]) => sum + (readOptions?.length ?? buffer.length), 0),
    readCount: peek.mock.calls.length,
    largestRead: Math.max(...peek.mock.calls.map(([buffer]) => buffer.length))
  };
}

describe('Opus duration tail lookup', () => {
  const data = Buffer.concat(opusPages());

  it('reads EOS after comments spanning more than twelve pages with default options', async () => {
    const fixture = await readFile(path.join(samplePath, 'ogg', 'generated-opus.opus'));
    const expected = await parseBuffer(fixture, 'audio/ogg');
    const fixturePages: { header: ReturnType<typeof PageHeader.get>; laces: number[]; payload: Buffer }[] = [];
    for (let offset = 0; offset < fixture.length; ) {
      const header = PageHeader.get(fixture, offset);
      const payloadOffset = offset + PageHeader.len + header.page_segments;
      const laces = [...fixture.subarray(offset + PageHeader.len, payloadOffset)];
      const end = payloadOffset + laces.reduce((sum, lace) => sum + lace, 0);
      fixturePages.push({ header, laces, payload: fixture.subarray(payloadOffset, end) });
      offset = end;
    }
    const serial = fixturePages[0].header.streamSerialNumber;
    const tags = comments('x'.repeat(70000));
    const pages = [page(serial, 0, 2, 0, fixturePages[0].payload)];
    for (let offset = 0; offset < tags.length; offset += 4080) {
      pages.push(page(serial, pages.length, offset === 0 ? 0 : 1, -1, tags.subarray(offset, offset + 4080)));
    }
    // Keep real encoded packets, but put the short clip on one EOS page after the enlarged tags.
    const audio = fixturePages.slice(2);
    pages.push(
      page(
        serial,
        pages.length,
        4,
        audio[audio.length - 1].header.absoluteGranulePosition,
        Buffer.concat(audio.map(item => item.payload)),
        audio.flatMap(item => item.laces)
      )
    );
    const input = Buffer.concat(pages);
    const buffered = await parseBuffer(input, 'audio/ogg');
    const streamed = await parseStream(Readable.from([input], { objectMode: false }), { mimeType: 'audio/ogg' });
    assert.strictEqual(expected.format.duration, 1);
    assert.strictEqual(buffered.format.duration, expected.format.duration);
    assert.strictEqual(streamed.format.duration, expected.format.duration);
  });

  for (const fileInfo of [{ mimeType: 'audio/opus' }, { path: 'audio.opus' }, {}]) {
    it(`does not probe appended ID3/APEv2 tags for Ogg (${JSON.stringify(fileInfo)})`, async () => {
      const tokenizer = fromBuffer(data, { fileInfo });
      const read = vi.spyOn(tokenizer, 'readBuffer');
      const metadata = await new ParserFactory().parse(tokenizer, { duration: true });
      assert.strictEqual(metadata.format.duration, 48);
      assert.isFalse(
        read.mock.calls.some(([, options]) => options?.position === data.length - 128),
        'no unrelated ID3v1 tail read'
      );
      assert.isFalse(
        read.mock.calls.some(([, options]) => options?.position === data.length - 32),
        'no unrelated APEv2 tail read'
      );
    });
  }

  for (const knownSize of [false, true]) {
    it(`reads long Node streams to EOS (known size=${knownSize})`, async () => {
      const { format, quality } = await parseStream(
        Readable.from([data], { objectMode: false }),
        { mimeType: 'audio/ogg', ...(knownSize ? { size: data.length } : {}) },
        { duration: true }
      );
      assert.strictEqual(format.duration, 48);
      assert.strictEqual(format.numberOfSamples, 48 * sampleRate);
      assert.strictEqual(format.trackInfo[0].bitrate, ((19 + 16 + 48 * 4096) * 8) / 48);
      assert.isEmpty(quality.warnings);
    });
  }

  it('reads long web streams to EOS', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(data);
        controller.close();
      }
    });
    const { format } = await parseWebStream(stream, { mimeType: 'audio/ogg', size: data.length }, { duration: true });
    assert.strictEqual(format.duration, 48);
    assert.strictEqual(format.trackInfo[0].bitrate, ((19 + 16 + 48 * 4096) * 8) / 48);
  });

  it('handles headers, lacing tables and payloads split across small stream chunks', async () => {
    const input = Buffer.concat(opusPages(1, 4, Buffer.alloc(40)));
    const chunks: Buffer[] = [];
    for (let offset = 0; offset < input.length; offset += 13) {
      chunks.push(input.subarray(offset, offset + 13));
    }
    const expected = await parseSequential(input, true);
    const actual = await parseStream(
      Readable.from(chunks, { objectMode: false }),
      { mimeType: 'audio/ogg', size: input.length },
      { duration: true }
    );
    assert.deepEqual(actual, expected);
  });

  it('preserves stream discovery and diagnostics when the first lacing table is truncated', async () => {
    const input = page(1, 0, 2, 0, identification()).subarray(0, PageHeader.len);
    const { format, quality } = await parseBuffer(input, 'audio/ogg', { duration: true });
    assert.isUndefined(format.codec);
    assert.deepEqual(quality.warnings, [
      { message: 'End-of-stream reached before reaching last page in Ogg stream serial=1' }
    ]);
  });

  it('uses ordinary header reads when the allocation limit is below the coalesced header size', async () => {
    const { metadata, largestRead } = await parseWithReadCount(data, { maxMemoryAllocation: 64 });
    assert.strictEqual(metadata.format.duration, 48);
    assert.strictEqual(metadata.format.trackInfo[0].bitrate, ((19 + 16 + 48 * 4096) * 8) / 48);
    assert.isAtMost(largestRead, 64);
    assert.isEmpty(metadata.quality.warnings);
  });

  it('reads metadata and a batched validation scan with complete track bitrate', async () => {
    const { metadata, bytesRead, readCount } = await parseWithReadCount(data);
    const sequential = await parseSequential(data, true);
    assert.strictEqual(metadata.format.duration, 48);
    assert.strictEqual(metadata.format.numberOfSamples, 48 * sampleRate);
    assert.strictEqual(metadata.format.bitrate, sequential.format.bitrate, 'retain the existing summary estimate');
    assert.deepEqual(metadata.format.trackInfo, sequential.format.trackInfo);
    assert.isBelow(readCount, 20, 'batch the validation scan across pages');
    assert.isBelow(bytesRead, data.length * 2, 'do not reread the stream');
    assert.isEmpty(metadata.quality.warnings);
  });

  it('finishes comments before reading the first audio page', async () => {
    const pages = opusPages();
    const tokenizer = fromBuffer(Buffer.concat(pages));
    const metadata = new MetadataCollector({});
    const firstAudioOffset = pages[0].length + pages[1].length;
    await new OggParser(metadata, tokenizer, { duration: true }).parse();
    assert.strictEqual(tokenizer.position, firstAudioOffset);
    assert.strictEqual(metadata.format.bitrate, ((data.length - firstAudioOffset) * 8) / 48);
    assert.isEmpty(metadata.quality.warnings);
  });

  it('keeps the summary bitrate independent of the comment packet size', async () => {
    const audio = opusPages().slice(2);
    const expectedBitrate = (audio.reduce((sum, page) => sum + page.length, 0) * 8) / 48;
    for (const title of ['Short', 'Large comment '.repeat(2000)]) {
      const input = Buffer.concat([page(1, 0, 2, 0, identification()), page(1, 1, 0, 0, comments(title)), ...audio]);
      const actual = await parseBuffer(input, 'audio/ogg', { duration: true });
      const sequential = await parseSequential(input, true);
      assert.strictEqual(actual.format.bitrate, expectedBitrate);
      assert.strictEqual(sequential.format.bitrate, expectedBitrate);
      assert.strictEqual(actual.common.title, title);
    }
  });

  for (const continued of [false, true]) {
    it(`parses comments on the EOS page (continued=${continued}) exactly once`, async () => {
      const title = 'EOS title '.repeat(50);
      const packet = comments(title);
      const pages = [page(1, 0, 2, 0, identification())];
      if (continued) {
        pages.push(page(1, 1, 0, -1, packet.subarray(0, 255)));
      }
      pages.push(page(1, pages.length, continued ? 5 : 4, preSkip, packet.subarray(continued ? 255 : 0)));
      for (const parse of [
        parseSequential,
        (input: Uint8Array) => parseBuffer(input, 'audio/ogg', { duration: true })
      ]) {
        const { common, native, format, quality } = await parse(Buffer.concat(pages));
        assert.strictEqual(common.title, title);
        assert.lengthOf(native.vorbis, 1);
        assert.strictEqual(format.duration, 0);
        assert.isEmpty(quality.warnings);
      }
    });
  }

  for (const samePage of [false, true]) {
    it(`requires the zero terminating lace for 255-byte-exact comments (same page=${samePage})`, async () => {
      const title = 'x'.repeat(229);
      const packet = comments(title);
      assert.lengthOf(packet, 255);
      const pages = [page(1, 0, 2, 0, identification())];
      pages.push(page(1, 1, 0, samePage ? 0 : -1, packet, samePage ? [255, 0] : [255]));
      if (!samePage) {
        // A page with no laces does not terminate the continued packet.
        pages.push(page(1, 2, 1, -1, Buffer.alloc(0), []));
        pages.push(page(1, 3, 1, 0, Buffer.alloc(0), [0]));
      }
      const audioOffset = pages.reduce((sum, page) => sum + page.length, 0);
      for (let index = 0; index < 50; ++index) {
        pages.push(page(1, pages.length, index === 49 ? 4 : 0, preSkip + sampleRate, Buffer.alloc(4096)));
      }
      const input = Buffer.concat(pages);
      const tokenizer = fromBuffer(input);
      const metadata = new MetadataCollector({});
      await new OggParser(metadata, tokenizer, { duration: true }).parse();
      assert.strictEqual(tokenizer.position, audioOffset);
      assert.strictEqual(metadata.common.title, title);
      assert.lengthOf(metadata.native.vorbis, 1);
      assert.strictEqual(metadata.format.duration, 1);
      const sequential = await parseSequential(input);
      assert.strictEqual(sequential.common.title, title);
      assert.lengthOf(sequential.native.vorbis, 1);
      assert.isEmpty(sequential.quality.warnings);
    });
  }

  it('rejects a continuation with no buffered comment packet', async () => {
    const input = Buffer.concat([page(1, 0, 2, 0, identification()), page(1, 1, 1, 0, comments('Missing first page'))]);
    await rejects(parseBuffer(input, 'audio/ogg', { duration: true }), /Cannot continue on previous page/);
  });

  it('rejects a missing continuation flag on an incomplete comment packet', async () => {
    const packet = comments('Incomplete '.repeat(50));
    const input = Buffer.concat([
      page(1, 0, 2, 0, identification()),
      page(1, 1, 0, -1, packet.subarray(0, 255)),
      page(1, 2, 0, 0, packet.subarray(255))
    ]);
    await rejects(parseBuffer(input, 'audio/ogg', { duration: true }), /remaining data/);
  });

  it('preserves an exact track bitrate for short files', async () => {
    const input = Buffer.concat(
      opusPages(1, 14, Buffer.alloc(40)).map((value, index) => {
        if (index < 2) {
          return value;
        }
        return page(1, index, index === 14 ? 4 : 0, preSkip + (index - 1) * sampleRate, Buffer.alloc(40));
      })
    );
    const expected = await parseSequential(input);
    const actual = await parseBuffer(input, 'audio/ogg', { duration: true });
    assert.deepEqual(actual.format.trackInfo, expected.format.trackInfo);
  });

  it('keeps duration and payload accounting separate for long multiplexed Opus streams', async () => {
    const first = opusPages(1, 49);
    const second = opusPages(2, 59, Buffer.alloc(80));
    const input = Buffer.concat(
      second.flatMap((value, index) => (index < first.length ? [first[index], value] : [value]))
    );
    const expected = await parseSequential(input);
    const actual = await parseBuffer(input, 'audio/ogg', { duration: true });
    assert.deepEqual(actual.format.trackInfo, expected.format.trackInfo);
    assert.strictEqual(actual.format.trackInfo[0].duration, 48);
    assert.strictEqual(actual.format.trackInfo[1].duration, 58);
  });

  it('continues sequentially when a tokenizer has no known size', async () => {
    const tokenizer = fromBuffer(data);
    delete tokenizer.fileInfo.size;
    const metadata = new MetadataCollector({});
    await new OggParser(metadata, tokenizer, { duration: true }).parse();
    assert.strictEqual(tokenizer.position, data.length);
    assert.strictEqual(metadata.format.duration, 48);
    assert.strictEqual(metadata.format.trackInfo[0].bitrate, ((19 + 16 + 48 * 4096) * 8) / 48);
  });

  for (const validChecksum of [false, true]) {
    it(`does not mistake an embedded OggS header for a page boundary (valid CRC=${validChecksum})`, async () => {
      const forged = page(1, 999, 4, preSkip + 999 * sampleRate, Buffer.alloc(40));
      if (!validChecksum) {
        forged.writeUInt32LE(0, 22);
      }
      const payload = Buffer.alloc(4096);
      payload.set(forged, payload.length - forged.length);
      const input = Buffer.concat(opusPages(1, 49, payload));
      const { format } = await parseBuffer(input, 'audio/ogg', { duration: true });
      assert.strictEqual(format.duration, 48);
    });
  }

  for (const fault of ['crc', 'serial', 'flags']) {
    it(`does not accept a valid embedded page after rejecting its enclosing page (${fault})`, async () => {
      const forged = page(1, 999, 4, preSkip + 999 * sampleRate, Buffer.alloc(40));
      const payload = Buffer.alloc(4096);
      payload.set(forged, payload.length - forged.length);
      const pages = opusPages(1, 49, payload);
      const last = pages[pages.length - 1];
      if (fault === 'serial') {
        last.writeUInt32LE(2, 14);
      } else if (fault === 'flags') {
        last[5] = 12;
      }
      last.fill(0, 22, 26);
      if (fault !== 'crc') {
        last.writeUInt32LE(crc(last), 22);
      }
      const input = Buffer.concat(pages);
      if (fault === 'serial') {
        await rejects(parseSequential(input), /pageConsumer should be initialized/);
        await rejects(parseBuffer(input, 'audio/ogg', { duration: true }), /pageConsumer should be initialized/);
        return;
      }
      const expected = await parseSequential(input);
      const actual = await parseBuffer(input, 'audio/ogg', { duration: true });
      assert.deepEqual(actual.format.trackInfo, expected.format.trackInfo);
      assert.deepEqual(actual.quality.warnings, expected.quality.warnings);
    });
  }

  it('does not accept an embedded page when the allocation limit hides the enclosing header', async () => {
    const forged = page(1, 999, 4, preSkip + 999 * sampleRate, Buffer.alloc(40));
    const payload = Buffer.alloc(4096);
    payload.set(forged, payload.length - forged.length);
    const pages = opusPages(1, 49, payload).map((value, sequence) =>
      sequence < 2 || sequence === 49
        ? value
        : page(1, sequence, 0, preSkip + (sequence - 1) * sampleRate, Buffer.alloc(128))
    );
    const input = Buffer.concat(pages);
    const expected = await parseSequential(input);
    const { metadata, largestRead } = await parseWithReadCount(input, { maxMemoryAllocation: 1024 });
    assert.deepEqual(metadata.format.trackInfo, expected.format.trackInfo);
    assert.isAtMost(largestRead, 1024);
  });

  it('finds a final page whose payload fills all 255 lacing entries', async () => {
    const input = Buffer.concat(opusPages(1, 49, Buffer.alloc(65024)));
    const { metadata, bytesRead, readCount } = await parseWithReadCount(input);
    assert.strictEqual(metadata.format.duration, 48);
    assert.isBelow(readCount, 20, 'batch the validation scan across pages');
    assert.isBelow(bytesRead, input.length * 2, 'do not reread the stream');
    assert.isEmpty(metadata.quality.warnings);
  });

  it('batches the earlier-EOS validation scan across many pages', async () => {
    const input = Buffer.concat(opusPages(1, 999));
    const { metadata, readCount } = await parseWithReadCount(input);
    assert.strictEqual(metadata.format.duration, 998);
    assert.isBelow(readCount, 200, 'do not read once per page');
    assert.isEmpty(metadata.quality.warnings);
  });

  it('refills the scan buffer when a lacing table crosses a chunk boundary', async () => {
    const pages = opusPages(1, 49);
    pages[2] = page(1, 2, 0, preSkip + sampleRate, Buffer.alloc(64988));
    pages[3] = page(1, 3, 0, preSkip + 2 * sampleRate, Buffer.alloc(4096));
    const input = Buffer.concat(pages);
    const { metadata, readCount } = await parseWithReadCount(input);
    assert.strictEqual(metadata.format.duration, 48);
    assert.isBelow(readCount, 20, 'do not read remaining pages individually');
  });

  for (const fault of [
    'missing-eos',
    'unknown-granule',
    'crc',
    'version',
    'reserved-flags',
    'bos',
    'old-sequence',
    'backwards-granule',
    'truncated-payload',
    'trailing-junk'
  ]) {
    it(`falls back to sequential parsing for a ${fault} tail`, async () => {
      const pages = opusPages();
      const last = pages[pages.length - 1];
      if (fault === 'missing-eos') {
        last[5] = 0;
      } else if (fault === 'unknown-granule') {
        last.writeBigUInt64LE(0xffffffffffffffffn, 6);
      } else if (fault === 'crc') {
        last.writeUInt32LE(0, 22);
      } else if (fault === 'version') {
        last[4] = 1;
      } else if (fault === 'reserved-flags') {
        last[5] = 12;
      } else if (fault === 'bos') {
        last[5] = 6;
      } else if (fault === 'old-sequence') {
        last.writeUInt32LE(1, 18);
      } else if (fault === 'backwards-granule') {
        last.writeBigUInt64LE(BigInt(preSkip + sampleRate), 6);
      } else if (fault === 'truncated-payload') {
        pages[pages.length - 1] = last.subarray(0, last.length - 10);
      } else {
        pages.push(Buffer.from('trailing data'));
      }
      if (fault !== 'crc') {
        last.fill(0, 22, 26);
        last.writeUInt32LE(crc(last), 22);
      }
      const input = Buffer.concat(pages);
      const expected = await parseSequential(input);
      const tokenizer = fromBuffer(input);
      const actual = await new ParserFactory().parse(tokenizer, { duration: true });
      if (fault === 'backwards-granule') {
        assert.strictEqual(tokenizer.position, input.length);
      }
      assert.deepEqual(actual.format.trackInfo, expected.format.trackInfo);
      assert.deepEqual(actual.quality.warnings, expected.quality.warnings);
    });
  }

  it('does not take the duration from the EOS of another logical stream at EOF', async () => {
    const input = Buffer.concat([...opusPages(), page(2, 99, 4, preSkip + 99 * sampleRate, Buffer.alloc(40))]);
    const expected = await parseSequential(input);
    const actual = await parseBuffer(input, 'audio/ogg', { duration: true });
    assert.deepEqual(actual.format.trackInfo, expected.format.trackInfo);
    assert.strictEqual(actual.format.duration, 48);
  });

  it('does not take the duration from a tail page after an earlier same-serial EOS', async () => {
    const pages = opusPages();
    pages[10] = page(1, 10, 4, preSkip + 9 * sampleRate, Buffer.alloc(4096));
    const input = Buffer.concat(pages);
    const expected = await parseSequential(input);
    const actual = await parseBuffer(input, 'audio/ogg', { duration: true });
    assert.deepEqual(actual.format.trackInfo, expected.format.trackInfo);
    assert.strictEqual(actual.format.duration, expected.format.duration);
  });

  it('falls back without moving the cursor when a tail read is short', async () => {
    const tokenizer = fromBuffer(data);
    tokenizer.fileInfo.size = data.length + 100000;
    const metadata = new MetadataCollector({});
    await new OggParser(metadata, tokenizer, { duration: true }).parse();
    assert.strictEqual(tokenizer.position, data.length);
    assert.strictEqual(metadata.format.duration, 48);
    assert.strictEqual(metadata.format.trackInfo[0].bitrate, ((19 + 16 + 48 * 4096) * 8) / 48);
    assert.isEmpty(metadata.quality.warnings);
  });

  it('attempts an invalid tail only once before scanning sequentially', async () => {
    const pages = opusPages();
    pages[pages.length - 1].fill(0, 22, 26);
    const tokenizer = fromBuffer(Buffer.concat(pages));
    const peek = vi.spyOn(tokenizer, 'peekBuffer');
    const metadata = new MetadataCollector({});
    await new OggParser(metadata, tokenizer, { duration: true }).parse();
    assert.lengthOf(
      peek.mock.calls.filter(([buffer]) => buffer.length > 10000),
      1
    );
    assert.strictEqual(metadata.format.duration, 48);
    assert.isDefined(metadata.format.trackInfo[0].bitrate);
  });

  it('respects the allocation limit when reading the tail', async () => {
    const pages = opusPages(1, 599).map((value, sequence) =>
      sequence < 2
        ? value
        : page(1, sequence, sequence === 599 ? 4 : 0, preSkip + (sequence - 1) * sampleRate, Buffer.alloc(128))
    );
    const input = Buffer.concat(pages);
    const unlimited = await parseWithReadCount(input);
    assert.deepEqual(unlimited.metadata.format.trackInfo, (await parseSequential(input)).format.trackInfo);
    const { metadata, largestRead } = await parseWithReadCount(input, { maxMemoryAllocation: 1024 });
    assert.strictEqual(metadata.format.duration, 598);
    assert.isDefined(metadata.format.trackInfo[0].bitrate);
    assert.isAtMost(largestRead, 1024);
  });

  it('scans with ignore when the final page does not fit the tail allocation limit', async () => {
    const pages = opusPages(1, 599).map((value, sequence) =>
      sequence < 2
        ? value
        : page(
            1,
            sequence,
            sequence === 599 ? 4 : 0,
            preSkip + (sequence - 1) * sampleRate,
            Buffer.alloc(sequence === 599 ? 4096 : 128)
          )
    );
    const input = Buffer.concat(pages);
    const { metadata, largestRead } = await parseWithReadCount(input, { maxMemoryAllocation: 1024 });
    const unlimited = await parseWithReadCount(input);
    assert.deepEqual(unlimited.metadata.format.trackInfo, (await parseSequential(input)).format.trackInfo);
    const expected = await parseSequential(input);
    assert.deepEqual(metadata.format.trackInfo, expected.format.trackInfo);
    assert.isDefined(metadata.format.trackInfo[0].bitrate);
    assert.isAtMost(largestRead, 1024);
  });

  it('detects a truncated ignored payload even when the advertised size is too large', async () => {
    const pages = opusPages();
    const last = pages[pages.length - 1];
    pages[pages.length - 1] = last.subarray(0, last.length - 10);
    const input = Buffer.concat(pages);
    const tokenizer = fromBuffer(input);
    tokenizer.fileInfo.size = input.length + 100000;
    const metadata = new MetadataCollector({});
    await new OggParser(metadata, tokenizer, { duration: true }).parse();
    const expected = await parseSequential(input);
    assert.deepEqual(metadata.format.trackInfo, expected.format.trackInfo);
    assert.deepEqual(metadata.quality.warnings, expected.quality.warnings);
  });

  it('retains comments spanning more than thirteen pages before looking for duration', async () => {
    const title = 'Long Opus title '.repeat(5000);
    const commentPages = comments(title);
    const pages = [page(1, 0, 2, 0, identification())];
    for (let offset = 0; offset < commentPages.length; offset += 4080) {
      pages.push(page(1, pages.length, offset > 0 ? 1 : 0, 0, commentPages.subarray(offset, offset + 4080)));
    }
    const firstAudioSequence = pages.length;
    for (let sequence = firstAudioSequence; sequence < firstAudioSequence + 50; ++sequence) {
      pages.push(page(1, sequence, sequence === firstAudioSequence + 49 ? 4 : 0, preSkip + 48000, Buffer.alloc(4096)));
    }
    const { common, format, quality } = await parseBuffer(Buffer.concat(pages), 'audio/ogg', { duration: true });
    assert.strictEqual(common.title, title);
    assert.strictEqual(format.duration, 1);
    assert.isEmpty(quality.warnings);
  });

  it('does not suppress I/O errors from the tail read', async () => {
    const tokenizer = fromBuffer(data);
    const peek = tokenizer.peekBuffer.bind(tokenizer);
    vi.spyOn(tokenizer, 'peekBuffer').mockImplementation((buffer, options) => {
      if (buffer.length > 10000) {
        throw new Error('tail read failed');
      }
      return peek(buffer, options);
    });
    await rejects(new OggParser(new MetadataCollector({}), tokenizer, { duration: true }).parse(), /tail read failed/);
  });

  it('falls back when a tokenizer throws EndOfStreamError during the tail peek', async () => {
    const tokenizer = fromBuffer(data);
    const peek = tokenizer.peekBuffer.bind(tokenizer);
    vi.spyOn(tokenizer, 'peekBuffer').mockImplementation((buffer, options) => {
      if (buffer.length > 10000) {
        throw new EndOfStreamError();
      }
      return peek(buffer, options);
    });
    const metadata = new MetadataCollector({});
    await new OggParser(metadata, tokenizer, { duration: true }).parse();
    assert.strictEqual(metadata.format.duration, 48);
    assert.strictEqual(metadata.format.trackInfo[0].bitrate, ((19 + 16 + 48 * 4096) * 8) / 48);
    assert.isEmpty(metadata.quality.warnings);
  });
});
