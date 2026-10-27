import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { assert } from 'chai';
import { EndOfStreamError, fromBuffer, fromStream } from 'strtok3';
import type { ICommonTagsResult, IFormat } from '../lib/index.js';
import * as mm from '../lib/index.js';
import { WavPackContentError } from '../lib/wavpack/WavPackParser.js';
import { BlockHeaderToken } from '../lib/wavpack/WavPackToken.js';
import { Parsers } from './shared/metadata-parsers.js';
import { samplePath } from './shared/util.js';

const wavpackSamplePath = path.join(samplePath, 'wavpack');

describe('Parse WavPack (audio/x-wavpack)', () => {
  describe('unknown sample counts', () => {
    it('derives duration from the optional sample-rate metadata', async () => {
      const file = Buffer.from(await readFile(path.join(wavpackSamplePath, 'unknown-count-zero.wv')));
      const rate = Buffer.from([0x67, 2, 0x44, 0xac, 0, 0]); // odd-sized ID_SAMPLE_RATE, 44100 Hz
      file.writeUInt32LE(file.readUInt32LE(4) + rate.length, 4);
      file.writeUInt32LE((file.readUInt32LE(24) | (15 << 23)) >>> 0, 24);
      const data = Buffer.concat([file.subarray(0, 32), rate, file.subarray(32)]);
      const { format } = await mm.parseBuffer(data, 'audio/x-wavpack');
      assert.strictEqual(format.sampleRate, 44100);
      assert.strictEqual(format.duration, 2);
    });
    it('rejects a stream with a missing odd-size metadata padding byte', async () => {
      const file = await readFile(path.join(wavpackSamplePath, 'unknown-count-zero.wv'));
      const header = Buffer.from(file.subarray(0, 32));
      header.writeUInt32LE(28, 4); // 24 header bytes plus a four-byte metadata sub-block
      const data = Buffer.concat([header, Buffer.from([0x40, 1, 0])]); // odd-sized ID_DUMMY without padding
      let rejection: unknown;
      try {
        await mm.parseStream(Readable.from([data], { objectMode: false }), 'audio/x-wavpack');
      } catch (error) {
        rejection = error;
      }
      assert.instanceOf(rejection, EndOfStreamError);
    });
    it('finishes a stream without a trailing APE tag', async () => {
      const file = await readFile(path.join(wavpackSamplePath, 'unknown-count-zero.wv'));
      const second = file.readUInt32LE(4) + 8;
      const end = second + file.readUInt32LE(second + 4) + 8;
      const { format } = await mm.parseStream(
        Readable.from([file.subarray(0, end)], { objectMode: false }),
        'audio/x-wavpack'
      );
      assert.strictEqual(format.duration, 2);
    });
    it('preserves caller-owned input and tokenizer lifetime', async () => {
      const file = await readFile(path.join(wavpackSamplePath, 'unknown-count-sentinel.wv'));
      const original = Buffer.from(file);
      const tokenizer = fromBuffer(file);
      const close = tokenizer.close.bind(tokenizer);
      tokenizer.close = async () => assert.fail('must not close caller-owned input');
      try {
        const result = await mm.parseFromTokenizer(tokenizer);
        assert.strictEqual(result.format.duration, 2);
        assert.deepEqual(file, original);
      } finally {
        await close();
      }
    });
    for (const [filename, samples] of [
      ['unknown-count-zero.wv', 88200],
      ['unknown-count-sentinel.wv', 88200],
      ['unknown-count-multichannel.wv', 8820]
    ] as const) {
      for (const parser of Parsers) {
        it(`derives a complete extent for ${filename} (${parser.description})`, async function () {
          const { format } = await parser.parse(
            () => this.skip(),
            path.join(wavpackSamplePath, filename),
            'audio/x-wavpack'
          );
          assert.strictEqual(format.numberOfSamples, samples);
          assert.strictEqual(format.duration, samples / 44100);
        });
      }
    }
    for (const source of ['buffer', 'stream']) {
      for (const defect of ['gap', 'incomplete group', 'truncated block']) {
        it(`does not invent a total from a ${defect} (${source})`, async () => {
          const file = await readFile(path.join(wavpackSamplePath, 'unknown-count-zero.wv'));
          const data = Buffer.from(file);
          const nextBlock = data.readUInt32LE(4) + 8;
          if (defect === 'gap') {
            data.writeUInt32LE(44101, nextBlock + 16);
          }
          if (defect === 'incomplete group') {
            data.writeUInt32LE(data.readUInt32LE(nextBlock + 24) & ~0x1000, nextBlock + 24);
          }
          const input = defect === 'truncated block' ? data.subarray(0, nextBlock + 40) : data;
          const parse =
            source === 'buffer'
              ? mm.parseBuffer(input, 'audio/x-wavpack')
              : mm.parseStream(Readable.from([input], { objectMode: false }), 'audio/x-wavpack');
          if (defect === 'truncated block') {
            let rejected = false;
            try {
              await parse;
            } catch {
              rejected = true;
            }
            assert.isTrue(rejected);
          } else {
            assert.isUndefined((await parse).format.duration);
          }
        });
      }
    }

    function insertSubBlock(file: Buffer, subBlock: Buffer): Buffer {
      file.writeUInt32LE(file.readUInt32LE(4) + subBlock.length, 4);
      return Buffer.concat([file.subarray(0, 32), subBlock, file.subarray(32)]);
    }

    it('rejects a truncated DSD metadata sub-block', async () => {
      const file = Buffer.from(await readFile(path.join(wavpackSamplePath, 'unknown-count-zero.wv')));
      const data = insertSubBlock(file, Buffer.from([0x0e, 0])); // ID_DSD_BLOCK with an empty payload
      let rejection: unknown;
      try {
        await mm.parseBuffer(data, 'audio/x-wavpack');
      } catch (error) {
        rejection = error;
      }
      assert.instanceOf(rejection, WavPackContentError);
      assert.strictEqual((rejection as Error).message, 'Truncated WavPack DSD metadata');
    });

    it('rejects a truncated sample-rate metadata sub-block', async () => {
      const file = Buffer.from(await readFile(path.join(wavpackSamplePath, 'unknown-count-zero.wv')));
      const data = insertSubBlock(file, Buffer.from([0x27, 1, 0, 0])); // ID_SAMPLE_RATE with two of three bytes
      let rejection: unknown;
      try {
        await mm.parseBuffer(data, 'audio/x-wavpack');
      } catch (error) {
        rejection = error;
      }
      assert.instanceOf(rejection, WavPackContentError);
      assert.strictEqual((rejection as Error).message, 'Truncated WavPack sample rate');
    });

    it('rejects a stream when skipping a non-initial block ends early', async () => {
      const file = await readFile(path.join(wavpackSamplePath, 'unknown-count-zero.wv'));
      const secondBlock = file.readUInt32LE(4) + 8;
      const tokenizer = await fromStream(Readable.from([file], { objectMode: false }));
      const ignore = tokenizer.ignore.bind(tokenizer);
      tokenizer.ignore = async length => (tokenizer.position < secondBlock ? ignore(length) : 0);
      const close = tokenizer.close.bind(tokenizer);
      let rejection: unknown;
      try {
        await mm.parseFromTokenizer(tokenizer);
      } catch (error) {
        rejection = error;
      } finally {
        await close();
      }
      assert.instanceOf(rejection, EndOfStreamError);
    });

    for (const filename of ['DSD128.wv', 'DSD128 high compression.wv']) {
      it(`derives DSD bit-sample totals for ${filename}`, async () => {
        const data = Buffer.from(await readFile(path.join(wavpackSamplePath, filename)));
        for (let offset = 0; offset + 32 <= data.length && data.toString('ascii', offset, offset + 4) === 'wvpk'; ) {
          data.writeUInt32LE(0xffffffff, offset + 12);
          offset += data.readUInt32LE(offset + 4) + 8;
        }
        const { format } = await mm.parseBuffer(data, 'audio/x-wavpack');
        assert.strictEqual(format.numberOfSamples, 564480);
        assert.strictEqual(format.duration, 0.1);
      });
    }
    it('reads 40-bit counts/indexes without shifts truncating the high byte', () => {
      const data = Buffer.alloc(32);
      data.write('wvpk');
      data[10] = 1;
      data[11] = 2;
      data.writeUInt32LE(123, 12);
      data.writeUInt32LE(456, 16);
      const header = BlockHeaderToken.get(data, 0);
      assert.strictEqual(header.totalSamples, 2 * 0xffffffff + 123);
      assert.strictEqual(header.blockIndex, 0x100000000 + 456);
      data.writeUInt32LE(0xffffffff, 12);
      assert.strictEqual(BlockHeaderToken.get(data, 0).totalSamples, -1);
    });
  });
  describe('codec: WavPack', () => {
    function checkFormat(format: IFormat) {
      assert.strictEqual(format.container, 'WavPack', 'format.container');
      assert.deepEqual(format.tagTypes, ['APEv2'], 'format.tagTypes');
      assert.approximately(format.duration!, 2.123, 1 / 1000, 'format.duration');
      assert.strictEqual(format.codec, 'PCM', 'format.codecProfile');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasAudio');
    }

    function checkCommon(common: ICommonTagsResult) {
      assert.strictEqual(common.title, "Sinner's Prayer", 'common.title');
      assert.deepEqual(common.artists, ['Beth Hart', 'Joe Bonamassa'], 'common.artist');
    }

    const wv1 = path.join(wavpackSamplePath, "MusicBrainz - Beth Hart - Sinner's Prayer.wv");

    Parsers.forEach(parser => {
      it(parser.description, async function () {
        const { format, common } = await parser.parse(() => this.skip(), wv1, 'audio/x-wavpack');
        checkFormat(format);
        checkCommon(common);
      });
    });
  });

  describe('codec: DSD128', () => {
    function checkFormat(format: IFormat) {
      assert.strictEqual(format.container, 'WavPack', 'format.container');
      assert.strictEqual(format.codec, 'DSD', 'format.codecProfile');
      assert.deepEqual(format.numberOfSamples, 564480, 'format.numberOfSamples');
      assert.strictEqual(format.sampleRate, 5644800, 'format.sampleRate');
      assert.strictEqual(format.duration, 0.1, 'format.duration');
      assert.deepEqual(format.tagTypes, [], 'format.tagTypes');
    }

    const wv1 = path.join(wavpackSamplePath, 'DSD128.wv');

    Parsers.forEach(parser => {
      it(parser.description, async function () {
        const { format } = await parser.parse(() => this.skip(), wv1, 'audio/x-wavpack');
        checkFormat(format);
      });
    });
  });

  describe('codec: DSD128 compressed', () => {
    function checkFormat(format: IFormat) {
      assert.strictEqual(format.container, 'WavPack', 'format.container');
      assert.strictEqual(format.codec, 'DSD', 'format.codecProfile');
      assert.deepEqual(format.numberOfSamples, 564480, 'format.numberOfSamples');
      assert.strictEqual(format.sampleRate, 5644800, 'format.sampleRate');
      assert.strictEqual(format.duration, 0.1, 'format.duration');
      assert.deepEqual(format.tagTypes, [], 'format.tagTypes');
      assert.approximately(format.bitrate!, 4810400, 1);
    }

    const wv1 = path.join(wavpackSamplePath, 'DSD128 high compression.wv');

    Parsers.forEach(parser => {
      it(parser.description, async function () {
        const { format } = await parser.parse(() => this.skip(), wv1, 'audio/x-wavpack');
        checkFormat(format);
      });
    });
  });
});
