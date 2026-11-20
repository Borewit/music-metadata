import { rejects } from 'node:assert/strict';
import { Readable } from 'node:stream';
import { EndOfStreamError, fromBuffer, fromStream } from 'strtok3';
import { assert, vi } from 'vitest';
import { MetadataCollector } from '../lib/common/MetadataCollector.js';
import { FlacParser } from '../lib/flac/FlacParser.js';
import { parseBuffer, parseStream, parseWebStream } from '../lib/index.js';
import { BlockType } from '../lib/tokens/flac.js';
import type { IOptions } from '../lib/type.js';

function streamInfo(): Buffer {
  const data = Buffer.alloc(34);
  data.writeUInt16BE(4096, 0);
  data.writeUInt16BE(4096, 2);
  data.writeBigUInt64BE((44100n << 44n) | (1n << 41n) | (15n << 36n) | 44100n, 10);
  return data;
}

function comments(...values: string[]): Buffer {
  const prefix = (value: string) => {
    const data = Buffer.from(value);
    const length = Buffer.alloc(4);
    length.writeUInt32LE(data.length);
    return Buffer.concat([length, data]);
  };
  const count = Buffer.alloc(4);
  count.writeUInt32LE(values.length);
  return Buffer.concat([prefix('FLAC performance tests'), count, ...values.map(prefix)]);
}

function picture(data = Buffer.alloc(256, 0xaa)): Buffer {
  const mime = Buffer.from('image/jpeg');
  const result = Buffer.alloc(32 + mime.length + data.length);
  result.writeUInt32BE(3, 0);
  result.writeUInt32BE(mime.length, 4);
  result.set(mime, 8);
  const properties = 12 + mime.length;
  result.writeUInt32BE(16, properties);
  result.writeUInt32BE(16, properties + 4);
  result.writeUInt32BE(24, properties + 8);
  result.writeUInt32BE(data.length, properties + 16);
  result.set(data, properties + 20);
  return result;
}

function flac(blocks: [number, Buffer][], audio = Buffer.alloc(8192, 0xee)): Buffer {
  return Buffer.concat([
    Buffer.from('fLaC'),
    ...[[BlockType.STREAMINFO, streamInfo()] as [number, Buffer], ...blocks].flatMap(([type, data], index) => {
      const header = Buffer.alloc(4);
      header[0] = type | (index === blocks.length ? 0x80 : 0);
      header.writeUIntBE(data.length, 1, 3);
      return [header, data];
    }),
    audio
  ]);
}

async function metadata(data: Buffer, options: IOptions = {}) {
  const tokenizer = fromBuffer(data);
  const collector = new MetadataCollector(options);
  await new FlacParser(collector, tokenizer, options).postId3v2Parse();
  return { tokenizer, result: collector.toCommonMetadata() };
}

describe('FLAC metadata read-ahead', () => {
  afterEach(() => vi.restoreAllMocks());

  const input = flac([
    [BlockType.APPLICATION, Buffer.alloc(32)],
    [BlockType.VORBIS_COMMENT, comments('TITLE=Buffered FLAC', 'ARTIST=One', 'ARTIST=Two')],
    [BlockType.PICTURE, picture()],
    [BlockType.PADDING, Buffer.alloc(64)]
  ]);

  it('coalesces small metadata fields into one bounded peek and leaves the audio cursor untouched', async () => {
    const tokenizer = fromBuffer(input);
    const read = vi.spyOn(tokenizer, 'readBuffer');
    const peek = vi.spyOn(tokenizer, 'peekBuffer');
    const collector = new MetadataCollector({});
    await new FlacParser(collector, tokenizer, {}).postId3v2Parse();
    assert.lengthOf(peek.mock.calls, 1);
    assert.strictEqual(peek.mock.calls[0][0].length, 4096);
    assert.lengthOf(read.mock.calls, 0);
    assert.strictEqual(tokenizer.position, input.length - 8192);
    assert.strictEqual(collector.common.title, 'Buffered FLAC');
    assert.deepEqual(collector.common.artists, ['One', 'Two']);
    assert.strictEqual(collector.format.bitrate, 8192 * 8);
  });

  it('matches buffer, Node stream and web stream metadata without read-ahead on streams', async () => {
    const options = { duration: true, skipPostHeaders: true };
    const expected = await parseBuffer(input, 'audio/flac', options);
    const chunks = () =>
      Array.from({ length: Math.ceil(input.length / 7) }, (_, index) => input.subarray(index * 7, index * 7 + 7));
    for (const size of [undefined, input.length]) {
      const result = await parseStream(
        Readable.from(chunks(), { objectMode: false }),
        { mimeType: 'audio/flac', size },
        options
      );
      assert.deepEqual(result.common, expected.common);
      assert.deepEqual(result.native, expected.native);
      assert.deepEqual(result.quality, expected.quality);
      assert.strictEqual(result.format.duration, expected.format.duration);
      assert.strictEqual(result.format.sampleRate, expected.format.sampleRate);
    }
    const data = chunks();
    const webResult = await parseWebStream(
      new ReadableStream<Uint8Array>({
        pull(controller) {
          const chunk = data.shift();
          if (chunk) {
            controller.enqueue(chunk);
          } else {
            controller.close();
          }
        }
      }),
      'audio/flac',
      options
    );
    assert.deepEqual(webResult.common, expected.common);
    assert.deepEqual(webResult.native, expected.native);
    assert.deepEqual(webResult.quality, expected.quality);
    assert.strictEqual(webResult.format.duration, expected.format.duration);
    const tokenizer = await fromStream(Readable.from([input], { objectMode: false }), {
      fileInfo: { mimeType: 'audio/flac' }
    });
    const peek = vi.spyOn(tokenizer, 'peekBuffer');
    try {
      await new FlacParser(new MetadataCollector({}), tokenizer, {}).postId3v2Parse();
      assert.lengthOf(peek.mock.calls, 0);
      assert.strictEqual(tokenizer.position, input.length - 8192);
    } finally {
      await tokenizer.close();
    }
  });

  it('matches hinted and sniffed FLAC metadata', async () => {
    assert.deepEqual(await parseBuffer(input), await parseBuffer(input, 'audio/flac'));
  });

  it('handles random-access input without an advertised size', async () => {
    const tokenizer = fromBuffer(input);
    delete tokenizer.fileInfo.size;
    const collector = new MetadataCollector({});
    await new FlacParser(collector, tokenizer, {}).postId3v2Parse();
    assert.strictEqual(collector.common.title, 'Buffered FLAC');
    assert.strictEqual(collector.format.duration, 1);
    assert.strictEqual(tokenizer.position, input.length - 8192);
  });

  for (const offset of [4093, 4094, 4095, 4096, 4097]) {
    it(`handles a block header starting at read-ahead boundary ${offset}`, async () => {
      const data = flac([
        [BlockType.PADDING, Buffer.alloc(offset - 46)],
        [BlockType.VORBIS_COMMENT, comments('TITLE=After boundary')]
      ]);
      const { tokenizer, result } = await metadata(data);
      assert.strictEqual(result.common.title, 'After boundary');
      assert.strictEqual(tokenizer.position, data.length - 8192);
      assert.isEmpty(result.quality.warnings);
    });
  }

  it('reads large metadata blocks normally and refills after skipped blocks without corrupting retained pictures', async () => {
    const data = flac([
      [BlockType.PICTURE, picture()],
      [BlockType.VORBIS_COMMENT, comments(`COMMENT=${'x'.repeat(70000)}`)],
      [BlockType.PADDING, Buffer.alloc(8192)],
      [BlockType.PICTURE, picture(Buffer.alloc(5000, 0xbb))],
      [BlockType.VORBIS_COMMENT, comments('TITLE=After large blocks')]
    ]);
    const { result, tokenizer } = await metadata(data);
    assert.strictEqual(result.common.title, 'After large blocks');
    assert.deepEqual(result.common.comment, [{ text: 'x'.repeat(70000) }]);
    assert.deepEqual(
      result.common.picture?.map(value => value.data),
      [Buffer.alloc(256, 0xaa), Buffer.alloc(5000, 0xbb)]
    );
    assert.strictEqual(tokenizer.position, data.length - 8192);
  });

  it('preserves unknown-block warnings and skips malformed pictures when requested', async () => {
    const data = flac([
      [125, Buffer.alloc(17)],
      [BlockType.PICTURE, Buffer.alloc(8000)],
      [BlockType.VORBIS_COMMENT, comments('TITLE=After skipped cover')]
    ]);
    const { result } = await metadata(data, { skipCovers: true });
    assert.strictEqual(result.common.title, 'After skipped cover');
    assert.isUndefined(result.common.picture);
    assert.deepEqual(result.quality.warnings, [{ message: 'Unknown block type: 125' }]);
  });

  it('retains the STREAMINFO checksum after reusing the metadata buffer', async () => {
    const data = flac([
      [BlockType.PADDING, Buffer.alloc(4096)],
      [BlockType.VORBIS_COMMENT, comments('TITLE=Refill')]
    ]);
    const checksum = Buffer.from('0123456789abcdef');
    data.set(checksum, 26);
    const parser = new FlacParser(new MetadataCollector({}), fromBuffer(data), {});
    const process = vi.spyOn(parser, 'processsStreamInfo');
    await parser.postId3v2Parse();
    assert.deepEqual(process.mock.calls[0][0].fileMD5, checksum);
  });

  it('honors allocation limits both inside and outside the read-ahead window', async () => {
    for (const limit of [34, 64, 128]) {
      const tokenizer = fromBuffer(input);
      const peek = vi.spyOn(tokenizer, 'peekBuffer');
      await rejects(
        new FlacParser(new MetadataCollector({}), tokenizer, { maxMemoryAllocation: limit }).postId3v2Parse(),
        /allocation limit/
      );
      assert.isAtMost(Math.max(...peek.mock.calls.map(([data]) => data.length)), limit);
    }
    const data = flac([]);
    const { result, tokenizer } = await metadata(data, { maxMemoryAllocation: 34 });
    assert.strictEqual(result.format.duration, 1);
    assert.strictEqual(tokenizer.position, 42);
    await rejects(metadata(data, { maxMemoryAllocation: 33 }), /allocation limit/);
  });

  it('does not read past the advertised file size or invent bytes from an incomplete cache refill', async () => {
    const data = flac([[BlockType.VORBIS_COMMENT, comments('TITLE=Truncated')]], Buffer.alloc(0));
    for (const length of [1, 3, 5, 7, 9, 41, data.length - 1]) {
      const tokenizer = fromBuffer(data.subarray(0, length));
      tokenizer.fileInfo.size = data.length;
      const peek = vi.spyOn(tokenizer, 'peekBuffer');
      await rejects(new FlacParser(new MetadataCollector({}), tokenizer, {}).postId3v2Parse(), EndOfStreamError);
      for (const [, options] of peek.mock.calls) {
        assert.isAtMost((options?.position ?? 0) + (options?.length ?? 0), data.length);
      }
    }
  });

  it('propagates non-EOF I/O failures from read-ahead', async () => {
    const tokenizer = fromBuffer(input);
    vi.spyOn(tokenizer, 'peekBuffer').mockRejectedValue(new Error('FLAC read failed'));
    await rejects(new FlacParser(new MetadataCollector({}), tokenizer, {}).postId3v2Parse(), /FLAC read failed/);
  });

  it('retains leading ID3v2 and trailing ID3v1 tags without changing their priority', async () => {
    const id3v2 = Buffer.concat([
      Buffer.from('ID3\x04\0\0\0\0\0\x0d', 'binary'),
      Buffer.from('TIT2\0\0\0\x03\0\0\x03Hi', 'binary')
    ]);
    const id3v1 = Buffer.alloc(128);
    id3v1.write('TAG');
    id3v1.write('Trailing title', 3);
    id3v1.write('Trailing album', 63);
    id3v1[127] = 255;
    const { format, native, common } = await parseBuffer(Buffer.concat([id3v2, input, id3v1]), 'audio/flac');
    assert.deepEqual(format.tagTypes, ['ID3v2.4', 'vorbis', 'ID3v1']);
    assert.strictEqual(common.title, 'Buffered FLAC');
    assert.deepEqual(
      native['ID3v2.4']?.filter(tag => tag.id === 'TIT2'),
      [{ id: 'TIT2', value: 'Hi' }]
    );
    assert.strictEqual(common.album, 'Trailing album');
    assert.deepEqual(
      native.vorbis?.filter(tag => tag.id === 'TITLE'),
      [{ id: 'TITLE', value: 'Buffered FLAC' }]
    );
    assert.deepEqual(
      native.ID3v1?.filter(tag => tag.id === 'title'),
      [{ id: 'title', value: 'Trailing title' }]
    );
  });

  it('retains APEv2 tags immediately before ID3v1 without changing their priority', async () => {
    const key = Buffer.from('Album\0');
    const value = Buffer.from('Appended APE album');
    const item = Buffer.alloc(8 + key.length + value.length);
    item.writeUInt32LE(value.length);
    item.set(key, 8);
    item.set(value, 8 + key.length);
    const footer = Buffer.alloc(32);
    footer.write('APETAGEX');
    footer.writeUInt32LE(2000, 8);
    footer.writeUInt32LE(item.length + footer.length, 12);
    footer.writeUInt32LE(1, 16);
    const id3v1 = Buffer.alloc(128);
    id3v1.write('TAG');
    id3v1.write('ID3 album', 63);
    id3v1[127] = 255;
    const { format, common, native } = await parseBuffer(Buffer.concat([input, item, footer, id3v1]), 'audio/flac');
    assert.deepEqual(format.tagTypes, ['vorbis', 'APEv2', 'ID3v1']);
    assert.strictEqual(common.album, 'Appended APE album');
    assert.strictEqual(common.title, 'Buffered FLAC');
    assert.deepEqual(native.APEv2, [{ id: 'Album', value: 'Appended APE album' }]);
    assert.deepEqual(
      native.ID3v1?.filter(tag => tag.id === 'album'),
      [{ id: 'album', value: 'ID3 album' }]
    );
  });
});
