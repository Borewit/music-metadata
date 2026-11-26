import { Readable } from 'node:stream';
import { fromBuffer } from 'strtok3';
import { describe, expect, it, vi } from 'vitest';
import { detectImageType, detectMediaSignature, skipPostId3Zeros } from '../lib/common/MediaFileType.js';
import { MetadataCollector } from '../lib/common/MetadataCollector.js';
import { parseBlob, parseBuffer, parseStream } from '../lib/index.js';
import type { ParserType } from '../lib/type.js';
import { type ContainerFormat, detectFormat } from '../lib/write/core/detect.js';
import { openSource } from '../lib/write/core/source.js';
import { makeFlac } from './helpers/flac.js';

const bytes = (value: string) => Uint8Array.from(value, char => char.charCodeAt(0));
const hex = (value: string) => Uint8Array.from(value.split(' '), byte => Number.parseInt(byte, 16));
const ftyp = (brand: string) => bytes(`\0\0\0\x18ftyp${brand}\0\0\0\0`);
const id3 = (size = 0, footer = false) =>
  Uint8Array.of(
    73,
    68,
    51,
    4,
    0,
    footer ? 16 : 0,
    (size >>> 21) & 127,
    (size >>> 14) & 127,
    (size >>> 7) & 127,
    size & 127
  );

const media: [ParserType, Uint8Array, ContainerFormat][] = [
  ['flac', bytes('fLaC'), 'flac'],
  ['ogg', bytes('OggS'), 'ogg'],
  ['riff', bytes('RIFF\0\0\0\0WAVE'), 'wav'],
  ['aiff', bytes('FORM\0\0\0\0AIFF'), 'unknown'],
  ['aiff', bytes('FORM\0\0\0\0AIFC'), 'unknown'],
  ['apev2', bytes('MAC '), 'ape'],
  ['wavpack', bytes('wvpk'), 'wv'],
  ['musepack', bytes('MP+'), 'mpc'],
  ['musepack', bytes('MPCK'), 'mpc'],
  ['dsf', bytes('DSD '), 'unknown'],
  ['dsdiff', bytes('FRM8\0\0\0\0\0\0\0\0DSD '), 'unknown'],
  ['caf', bytes('caff'), 'unknown'],
  ['asf', hex('30 26 b2 75 8e 66 cf 11 a6 d9 00 aa 00 62 ce 6c'), 'asf'],
  ['matroska', hex('1a 45 df a3'), 'unknown'],
  ['mp4', ftyp('M4A '), 'mp4'],
  ['mp4', ftyp('isom'), 'mp4'],
  ['mp4', bytes('\0\0\0\x08moov'), 'mp4'],
  ['mpeg', hex('ff fb 90 00'), 'mp3'],
  ['mpeg', hex('ff fd 90 00'), 'mp3'],
  ['mpeg', hex('ff e3 80 00'), 'mp3'],
  ['adts', hex('ff f1 50 80'), 'aac'],
  ['adts', hex('ff f9 50 80'), 'aac']
];
const images: [string, Uint8Array, string][] = [
  ['jpg', hex('ff d8 ff'), 'image/jpeg'],
  ['png', hex('89 50 4e 47 0d 0a 1a 0a'), 'image/png'],
  ['gif', bytes('GIF87a'), 'image/gif'],
  ['gif', bytes('GIF89a'), 'image/gif'],
  ['webp', bytes('RIFF\0\0\0\0WEBP'), 'image/webp'],
  ['bmp', bytes('BM'), 'image/bmp'],
  ['tif', hex('49 49 2a 00'), 'image/tiff'],
  ['tif', hex('4d 4d 00 2a'), 'image/tiff'],
  ...['avif', 'avis'].map(brand => ['avif', ftyp(brand), 'image/avif'] as [string, Uint8Array, string]),
  ...['avif', 'avis'].map(
    brand =>
      ['avif-compatible', Buffer.concat([ftyp('mif1'), bytes(`miaf${brand}`)]), 'image/avif'] as [
        string,
        Uint8Array,
        string
      ]
  )
];

const unsupportedImages: [string, Uint8Array, string][] = [
  ['ico', hex('00 00 01 00'), 'image/x-icon'],
  ['psd', bytes('8BPS'), 'image/vnd.adobe.photoshop'],
  ['jxl', hex('ff 0a'), 'image/jxl'],
  ['jxl', hex('00 00 00 0c 4a 58 4c 20 0d 0a 87 0a'), 'image/jxl'],
  ['jp2', hex('00 00 00 0c 6a 50 20 20 0d 0a 87 0a'), 'image/jp2'],
  ...['heic', 'heix'].map(brand => ['heic', ftyp(brand), 'image/heic'] as [string, Uint8Array, string]),
  ...['hevc', 'hevx'].map(brand => ['heic', ftyp(brand), 'image/heic-sequence'] as [string, Uint8Array, string]),
  ['heic', ftyp('mif1'), 'image/heif'],
  ['heic', ftyp('msf1'), 'image/heif-sequence']
];

describe('Local media signature detection', () => {
  it.each(media)('detects the %s parser from its signature', (parserType, data) => {
    expect(detectMediaSignature(data)).toBe(parserType);
    const wrapped = new Uint8Array(data.length + 7);
    wrapped.set(data, 3);
    expect(detectMediaSignature(wrapped.subarray(3, 3 + data.length))).toBe(parserType);
  });

  it.each(images)('detects %s cover art without copying data', async (_name, data, mime) => {
    expect(detectImageType(data)).toBe(mime);
    expect(detectMediaSignature(data)).toBeUndefined();
    const wrapped = new Uint8Array(data.length + 7);
    wrapped.set(data, 3);
    expect(detectImageType(wrapped.subarray(3, 3 + data.length))).toBe(mime);
    const metadata = new MetadataCollector({});
    await metadata.addTag('ID3v2.3', 'APIC', { data, format: '' });
    expect(metadata.common.picture?.[0]).toMatchObject({ format: mime });
    expect(metadata.common.picture?.[0].data).toBe(data);
  });

  it.each(unsupportedImages)(
    'does not auto-detect %s artwork or route it to a media writer',
    async (_ext, data, mime) => {
      expect(detectImageType(data)).toBeUndefined();
      expect(detectMediaSignature(data)).toBeUndefined();
      const source = await openSource(data);
      try {
        expect(await detectFormat(source)).toBe('unknown');
      } finally {
        await source.close();
      }
      const metadata = new MetadataCollector({});
      await metadata.addTag('ID3v2.3', 'APIC', { data, format: '' });
      expect(metadata.common.picture).toBeUndefined();
      // Explicit MIME types still preserve artwork; only automatic detection is narrowed.
      await metadata.addTag('ID3v2.3', 'APIC', { data, format: mime });
      expect(metadata.common.picture?.[0]).toMatchObject({ format: mime });
      expect(metadata.common.picture?.[0].data).toBe(data);
    }
  );

  it.each(media)('does not treat %s media as cover art', (_ext, data) => {
    expect(detectImageType(data)).toBeUndefined();
  });

  it('checks late AVIF compatible brands for writers and embedded artwork', async () => {
    const box = Buffer.concat([ftyp('isom'), bytes('isom'.repeat(1020)), bytes('avif')]);
    box.writeUInt32BE(box.length); // The compatible brand ends at byte 4100.
    expect(detectMediaSignature(box)).toBe('mp4'); // Reader dispatch uses the isom major brand.
    for (const input of [box, Buffer.concat([id3(), box])]) {
      expect(await detectFormat(await openSource(input))).toBe('unknown');
    }

    const artwork = Buffer.concat([box.subarray(0, -4), bytes('isomavif')]);
    artwork.writeUInt32BE(artwork.length);
    const metadata = new MetadataCollector({});
    await metadata.addTag('ID3v2.3', 'APIC', { data: artwork, format: '' });
    expect(metadata.common.picture?.[0].format).toBe('image/avif');
    expect(metadata.common.picture?.[0].data).toBe(artwork);
  });

  it('bounds writer lookahead by the probe limit and the remaining input', async () => {
    for (const length of [32, 8192]) {
      const box = Buffer.alloc(length);
      box.set(ftyp('isom'));
      box.writeUInt32BE(0xffffffff);
      const source = await openSource(box);
      const read = vi.spyOn(source, 'read');
      expect(await detectFormat(source)).toBe('mp4');
      expect(read.mock.calls).toEqual([
        [0, 16],
        [0, Math.min(length, 4100)]
      ]);
    }
  });

  it('bounds compatible brand detection by the declared box size and available bytes', () => {
    const data = Buffer.concat([ftyp('mif1'), bytes('miafavif')]);
    for (const boxSize of [8, 16, 20, 23, 24, 28, 0xffffffff]) {
      data.writeUInt32BE(boxSize, 0);
      for (let length = 8; length <= data.length; ++length) {
        expect(detectImageType(data.subarray(0, length))).toBe(
          boxSize >= 24 && length === 24 ? 'image/avif' : undefined
        );
      }
    }
  });

  it.each(['miafheic', 'xavifxxx'])('leaves mif1 without an AVIF compatible brand unsupported: %s', brands => {
    const data = Buffer.concat([ftyp('mif1'), bytes(brands)]);
    // A matching minor_version is not a compatible brand either.
    data.set(bytes('avif'), 12);
    expect(detectImageType(data)).toBeUndefined();
    expect(detectMediaSignature(data)).toBeUndefined();
  });

  it.each(['', 'RIFF', 'RIFF\0\0\0\0AVI ', 'FORM\0\0\0\0ILBM', 'FRM8', 'ftyp', 'unknown'])(
    'rejects unknown or incomplete input %j',
    value => {
      expect(detectMediaSignature(bytes(value))).toBeUndefined();
    }
  );

  it.each([
    'ff',
    'ff fb',
    'ff fb 90',
    'ff ff ff ff',
    'ff eb 90 00',
    'ff fb fc 00',
    'ff f1 34 00',
    'ff f1 38 00',
    'ff f1 3c 00'
  ])('rejects truncated or reserved frame headers %s', value => {
    expect(detectMediaSignature(hex(value))).toBeUndefined();
  });

  it('tolerates at most ten junk bytes before MPEG/ADTS frames', () => {
    for (const frame of [hex('ff fb 90 00'), hex('ff f1 50 80')]) {
      for (let offset = 0; offset <= 11; ++offset) {
        const data = new Uint8Array(offset + frame.length);
        data.set(frame, offset);
        expect(detectMediaSignature(data)).toEqual(offset <= 10 ? detectMediaSignature(frame) : undefined);
      }
    }
  });

  it('distinguishes leading metadata from audio containers', () => {
    expect(detectMediaSignature(bytes('ID3'))).toBe('id3v2');
    expect(detectMediaSignature(bytes('APETAGEX'))).toBe('ape-tag');
    expect(detectMediaSignature(bytes('MAC '))).toBe('apev2');
  });

  it('selects FLAC from its bytes with misleading filename and MIME type', async () => {
    const metadata = await parseBuffer(makeFlac(), { path: 'track.mp3', mimeType: 'audio/ogg' });
    expect(metadata.format.container).toBe('FLAC');
  });

  it('parses ID3-prefixed FLAC without MIME or filename hints', async () => {
    const input = makeFlac({ id3Prefix: id3() });
    expect((await parseBuffer(input)).format.container).toBe('FLAC');
    expect((await parseStream(Readable.from([input], { objectMode: false }))).format.container).toBe('FLAC');
  });

  it.each([11, 4097])('reads MPEG frames after %i undeclared zero bytes following ID3v2', async count => {
    const frame = Buffer.alloc(417);
    frame.set([0xff, 0xfb, 0x90, 0]);
    const prefix = Buffer.concat([id3(), Buffer.alloc(count)]);
    const audio = Buffer.concat([frame, frame, frame, frame]);
    expect((await parseBuffer(Buffer.concat([prefix, audio]))).format.container).toBe('MPEG');
    const stream = Readable.from([prefix, audio.subarray(0, 1), audio.subarray(1)], { objectMode: false });
    expect((await parseStream(stream)).format.container).toBe('MPEG');
  });

  it('peeks and skips the entire visible zero run in one ignore', async () => {
    const tokenizer = fromBuffer(Buffer.concat([Buffer.alloc(11), bytes('fLaC'), Buffer.alloc(8)]));
    const ignore = vi.spyOn(tokenizer, 'ignore');
    await skipPostId3Zeros(tokenizer);
    expect(ignore.mock.calls).toEqual([[11]]);
    expect(tokenizer.position).toBe(11);
  });

  it('uses a fixed 2 KiB probe for zero padding', async () => {
    const tokenizer = fromBuffer(Buffer.concat([Buffer.alloc(4097), bytes('fLaC')]));
    const peek = vi.spyOn(tokenizer, 'peekBuffer');
    const ignore = vi.spyOn(tokenizer, 'ignore');
    await skipPostId3Zeros(tokenizer);
    expect(Math.max(...peek.mock.calls.map(([buffer]) => buffer.length))).toBe(2048);
    expect(ignore.mock.calls).toEqual([[2048], [2048], [1]]);
    expect(tokenizer.position).toBe(4097);
  });

  it('reads through padding on streams with a smaller tokenizer lookahead limit', async () => {
    const data = makeFlac({ id3Prefix: Buffer.concat([id3(), Buffer.alloc(4097)]) });
    const stream = Readable.from([data], { objectMode: false });
    expect((await parseStream(stream, undefined, { maxMemoryAllocation: 128 })).format.container).toBe('FLAC');
  });

  it('returns metadata when only zero fill follows a standalone ID3v2 tag', async () => {
    const frame = Buffer.concat([bytes('TIT2'), Uint8Array.of(0, 0, 0, 6, 0, 0, 3), bytes('Title')]);
    const metadata = await parseBuffer(Buffer.concat([id3(frame.length), frame, Buffer.alloc(33)]));
    expect(metadata.common.title).toBe('Title');
    expect(metadata.format.container).toBeUndefined();
  });

  it('detects the audio after consecutive headers even with an MPEG hint', async () => {
    const input = makeFlac({ id3Prefix: Buffer.concat([id3(), Buffer.alloc(19), id3(), Buffer.alloc(24)]) });
    const metadata = await parseStream(Readable.from([input], { objectMode: false }), 'audio/mpeg');
    expect(metadata.format.container).toBe('FLAC');
  });

  it.each([2, 3, 4])('parses leading ID3v2.%i tags beyond the probe on buffers and streams', async major => {
    const first = id3(8192);
    first[3] = major;
    const input = makeFlac({ id3Prefix: Buffer.concat([first, new Uint8Array(8192), id3()]) });
    expect((await parseBuffer(input)).format.container).toBe('FLAC');
    expect((await parseBlob(new Blob([Uint8Array.from(input)]))).format.container).toBe('FLAC');
    const stream = Readable.from([input.subarray(0, 5), input.subarray(5, 4095), input.subarray(4095)], {
      objectMode: false
    });
    expect((await parseStream(stream)).format.container).toBe('FLAC');
  });

  it.each([200, 256])('recovers a plain v2.4 frame size of %i before probing FLAC', async size => {
    const body = Buffer.alloc(8192);
    body.write('TIT2');
    body.writeUInt32BE(size, 4);
    body.fill(0x74, 11, 10 + size);
    const input = makeFlac({ id3Prefix: Buffer.concat([id3(body.length), body]) });
    const metadata = await parseStream(Readable.from([input], { objectMode: false }));
    expect(metadata.format.container).toBe('FLAC');
    expect(metadata.common.title).toBe('t'.repeat(size - 1));
    expect(metadata.quality.warnings).toContainEqual({ message: expect.stringContaining('plain 32-bit integer') });
  });

  it('parses FLAC after an ID3v2.4 footer and another leading tag', async () => {
    const header = id3(0, true);
    const footer = Buffer.from(header);
    footer.write('3DI');
    const input = makeFlac({ id3Prefix: Buffer.concat([header, footer, id3()]) });
    expect((await parseStream(Readable.from([input], { objectMode: false }))).format.container).toBe('FLAC');
  });

  it.each([false, true])('parses leading APEv2 metadata with footer present = %s', async withFooter => {
    const item = Buffer.concat([Buffer.alloc(8), bytes('Title\0APE title')]);
    item.writeUInt32LE(9);
    const header = Buffer.alloc(32);
    header.write('APETAGEX');
    header.writeUInt32LE(2000, 8);
    header.writeUInt32LE(item.length + 32, 12);
    header.writeUInt32LE(1, 16);
    header.writeUInt32LE(withFooter ? 0xa0000000 : 0xe0000000, 20);
    const footer = Buffer.from(header);
    footer.writeUInt32LE(0x80000000, 20);
    const input = makeFlac({
      id3Prefix: Buffer.concat([id3(), header, item, withFooter ? footer : Buffer.alloc(0)])
    });
    const metadata = await parseStream(Readable.from([input], { objectMode: false }));
    expect(metadata.format.container).toBe('FLAC');
    expect(metadata.common.title).toBe('APE title');
  });
});

describe('Local writer container detection', () => {
  it.each(media)('routes %s to a supported writer only', async (_parserType, data, format) => {
    const source = await openSource(data);
    try {
      expect(await detectFormat(source)).toBe(format);
      expect(await source.read(0, data.length)).toEqual(data); // Detection must not close the source.
    } finally {
      await source.close();
    }
  });

  it.each(images)('rejects %s images rather than selecting a media writer', async (_ext, data) => {
    expect(await detectFormat(await openSource(data))).toBe('unknown');
  });

  it('skips large ID3 payloads with bounded reads and accounts for footers', async () => {
    const input = Buffer.concat([id3(10000, true), new Uint8Array(10010), id3(), bytes('fLaC')]);
    const source = await openSource(input);
    const read = vi.spyOn(source, 'read');
    expect(await detectFormat(source)).toBe('flac');
    expect(read.mock.calls.map(([offset]) => offset)).toEqual([0, 10020, 10030]);
    expect(read.mock.calls.every(([, length]) => length <= 64)).toBe(true);
  });

  it.each([
    bytes('ID3'),
    id3(),
    id3(100),
    Buffer.concat([hex('49 44 33 04 00 00 00 00 00 80'), bytes('fLaC')]),
    Buffer.concat([id3(), bytes('unknown')]),
    hex('49 44 33 05 00 00 00 00 00 00')
  ])('routes malformed ID3 to writer validation', async data => {
    expect(await detectFormat(await openSource(data))).toBe('id3');
  });

  it('handles empty sources and propagates read errors', async () => {
    const source = await openSource(new Uint8Array(0));
    expect(await detectFormat(source)).toBe('unknown');
    const broken = await openSource(bytes('fLaC'));
    vi.spyOn(broken, 'read').mockRejectedValue(new Error('read failed'));
    await expect(detectFormat(broken)).rejects.toThrow('read failed');
  });
});
