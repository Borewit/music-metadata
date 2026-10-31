import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PassThrough, Readable } from 'node:stream';
import { assert, expect } from 'chai';
import { fromBuffer, fromStream } from 'strtok3';
import { MetadataCollector } from '../lib/common/MetadataCollector.js';
import type { IFormat } from '../lib/index.js';
import * as mm from '../lib/index.js';
import { AdtsFrameHeader } from '../lib/mpeg/AdtsFrameHeader.js';
import { MpegParser } from '../lib/mpeg/MpegParser.js';
import { Parsers } from './shared/metadata-parsers.js';
import { samplePath } from './shared/util.js';

const aacSamplePath = path.join(samplePath, 'aac');

describe('Parse ADTS/AAC', () => {
  it('returns live ADTS metadata without waiting for duration or EOF', async () => {
    const data = await readFile(path.join(aacSamplePath, 'short-final-frame.aac'));
    const stream = new PassThrough();
    stream.write(data);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const { format } = await Promise.race([
        mm.parseStream(stream, 'audio/aac', { duration: false, skipPostHeaders: true }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Parser waited for live audio EOF')), 1000);
        })
      ]);
      assert.strictEqual(format.codec, 'AAC');
      assert.strictEqual(format.sampleRate, 44100);
      assert.isUndefined(format.duration);
      assert.isFalse(stream.readableEnded);
    } finally {
      clearTimeout(timer);
      stream.destroy();
    }
  });

  describe('complete final frames', () => {
    const filename = path.join(aacSamplePath, 'short-final-frame.aac');
    for (const parser of Parsers) {
      it(`counts the 12-byte final frame (${parser.description})`, async function () {
        const { format, common } = await parser.parse(() => this.skip(), filename, 'audio/aac', { duration: true });
        assert.strictEqual(common.title, 'ADTS short final frame');
        assert.strictEqual(format.numberOfSamples, 88 * 1024);
        assert.strictEqual(format.duration, (88 * 1024) / 44100);
      });
    }
    for (const source of ['buffer', 'stream', 'advertised stream']) {
      for (let missing = 1; missing <= 12; ++missing) {
        it(`excludes an incomplete or absent final frame, missing ${missing} bytes (${source})`, async () => {
          const file = await readFile(filename);
          const data = file.subarray(0, file.length - missing);
          const { format } =
            source === 'buffer'
              ? await mm.parseBuffer(data, 'audio/aac', { duration: true })
              : await mm.parseStream(
                  Readable.from([data], { objectMode: false }),
                  {
                    mimeType: 'audio/aac',
                    size: source === 'advertised stream' ? file.length : undefined
                  },
                  { duration: true }
                );
          assert.strictEqual(format.numberOfSamples, 87 * 1024);
          assert.strictEqual(format.duration, (87 * 1024) / 44100);
        });
      }
    }
    it('keeps the complete-frame sample rate for a differing partial final frame', async () => {
      const file = await readFile(filename);
      const data = Buffer.from(file.subarray(0, file.length - 1));
      const partialFrame = data.length - 11;
      // Move the truncated final frame to 48 kHz; only complete frames may set the rate.
      data[partialFrame + 2] = (data[partialFrame + 2] & 0xc3) | (3 << 2);
      const { format } = await mm.parseBuffer(data, 'audio/aac', { duration: true });
      assert.strictEqual(format.sampleRate, 44100);
      assert.strictEqual(format.numberOfSamples, 87 * 1024);
      assert.strictEqual(format.duration, (87 * 1024) / 44100);
    });
    it('retains the default three-frame fast path', async () => {
      const { format } = await mm.parseFile(filename);
      assert.isUndefined(format.duration);
      assert.strictEqual(format.codecProfile, 'AAC LC');
    });
    for (const frames of [1, 2, 3]) {
      it(`provides duration for a short ${frames}-frame clip`, async () => {
        const file = await readFile(filename);
        const tagEnd = 10 + file[9];
        let end = tagEnd;
        for (let i = 0; i < frames; i++) {
          end += ((file[end + 3] & 3) << 11) | (file[end + 4] << 3) | (file[end + 5] >> 5);
        }
        const { format } = await mm.parseBuffer(file.subarray(0, end), 'audio/aac', { duration: true });
        assert.strictEqual(format.numberOfSamples, frames * 1024);
        assert.strictEqual(format.duration, (frames * 1024) / 44100);
      });
    }
    it('retains an ADTS sync byte across the lookahead boundary', async () => {
      const file = await readFile(filename);
      const tagEnd = 10 + file[9];
      const data = Buffer.concat([file.subarray(0, tagEnd), Buffer.alloc(1023), file.subarray(tagEnd)]);
      const { format } = await mm.parseBuffer(data, 'audio/aac', { duration: true });
      assert.strictEqual(format.numberOfSamples, 88 * 1024);
    });
    for (const source of ['buffer', 'stream']) {
      it(`excludes a partial frame reported by a custom ${source} tokenizer`, async () => {
        const file = await readFile(filename);
        const data = file.subarray(10 + file[9], file.length - 1);
        const tokenizer =
          source === 'buffer' ? fromBuffer(data) : await fromStream(Readable.from([data], { objectMode: false }));
        if (source === 'buffer') {
          tokenizer.fileInfo.size = data.length + 1;
          const read = tokenizer.readBuffer.bind(tokenizer);
          tokenizer.readBuffer = async (buffer, options) =>
            options?.position === data.length ? 0 : read(buffer, options);
        } else {
          const ignore = tokenizer.ignore.bind(tokenizer);
          tokenizer.ignore = async length => (tokenizer.position + length > data.length ? 0 : ignore(length));
        }
        const close = tokenizer.close.bind(tokenizer);
        tokenizer.close = async () => assert.fail('parser must not close a caller-owned tokenizer');
        try {
          const metadata = new MetadataCollector();
          await new MpegParser(metadata, tokenizer, { duration: true }).postId3v2Parse();
          assert.strictEqual(metadata.format.numberOfSamples, 87 * 1024);
        } finally {
          await close();
        }
      });
    }
    for (const [length, crc] of [
      [0, false],
      [6, false],
      [7, false],
      [8, true],
      [9, true]
    ] as const) {
      it(`rejects frame length ${length} smaller than its ${crc ? 'CRC' : 'unprotected'} header`, async () => {
        const file = await readFile(filename);
        const data = Buffer.from(file);
        const offset = 10 + data[9];
        data[offset + 1] = crc ? 0xf0 : 0xf1;
        data[offset + 3] &= 0xfc;
        data[offset + 4] = length >> 3;
        data[offset + 5] = (data[offset + 5] & 31) | ((length & 7) << 5);
        await expect(mm.parseBuffer(data, 'audio/aac', { duration: true })).to.be.rejectedWith(
          `Invalid ADTS frame length: ${length}`
        );
      });
    }
  });
  it('should treat reserved sampling-frequency indices as unknown', () => {
    for (const thirdByte of [0x74, 0x78, 0x7c]) {
      const header = new AdtsFrameHeader(Uint8Array.of(0xff, 0xf1, thirdByte, 0x80));
      assert.isNull(header.samplingRate);
    }
  });

  function checkFormat(
    format: IFormat,
    dataFormat: string,
    codec: string,
    codecProfile: string,
    sampleRate: number,
    channels: number,
    bitrate: number,
    samples: number
  ) {
    assert.strictEqual(format.container, dataFormat, 'format.container');
    assert.strictEqual(format.codec, codec, 'format.codec');
    assert.strictEqual(format.codecProfile!, codecProfile, 'format.codecProfile');
    assert.strictEqual(format.lossless, false, 'format.lossless');
    assert.strictEqual(format.sampleRate, sampleRate, 'format.sampleRate');
    assert.strictEqual(format.numberOfChannels, channels, 'format.numberOfChannels');
    assert.approximately(format.bitrate!, bitrate, 500, 'format.bitrate');
    assert.strictEqual(format.numberOfSamples, samples, `format.numberOfSamples = ${samples} samples`);
    assert.approximately(format.duration!, samples / sampleRate, 0.1, 'format.duration');
    assert.isTrue(format.hasAudio, 'format.hasAudio');
    assert.isFalse(format.hasVideo, 'format.hasAudio');
  }

  describe('parse: adts-mpeg4.aac AAC-LC, 16.0 kHz, 2 channels, 3 kBit', () => {
    Parsers.forEach(parser => {
      it(parser.description, async function () {
        const { format } = await parser.parse(
          () => this.skip(),
          path.join(aacSamplePath, 'adts-mpeg4.aac'),
          'audio/aac',
          {
            duration: true
          }
        );
        checkFormat(format, 'ADTS/MPEG-4', 'AAC', 'AAC LC', 16000, 1, 20399, 257024);
      });
    });
  });

  describe('parse: adts-mpeg4-2.aac: AAC-LC, 44.1 kHz, 2 channels', () => {
    Parsers.forEach(parser => {
      it(parser.description, async function () {
        const { format } = await parser.parse(
          () => this.skip(),
          path.join(aacSamplePath, 'adts-mpeg4-2.aac'),
          'audio/aac',
          {
            duration: true
          }
        );
        checkFormat(format, 'ADTS/MPEG-4', 'AAC', 'AAC LC', 44100, 2, 128000, 14336);
      });
    });
  });

  describe('parse: adts-sf-escape.aac: explicit sampling-frequency index (15)', () => {
    // When the ADTS sampling-frequency index is the escape value (15), the rate is
    // not encoded in the fixed header and cannot be derived from the lookup table.
    // It must surface as an unknown rate, never as a bogus negative value that
    // propagates into a negative bitrate (issue #2644).
    Parsers.forEach(parser => {
      it(parser.description, async function () {
        const { format } = await parser.parse(
          () => this.skip(),
          path.join(aacSamplePath, 'adts-sf-escape.aac'),
          'audio/aac',
          {
            duration: true
          }
        );
        assert.strictEqual(format.container, 'ADTS/MPEG-4', 'format.container');
        assert.strictEqual(format.codec, 'AAC', 'format.codec');
        assert.isUndefined(format.sampleRate, 'format.sampleRate should be unknown');
        assert.isUndefined(format.bitrate, 'format.bitrate cannot be calculated without a sampling rate');
      });
    });
  });
});
