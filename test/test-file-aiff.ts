import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { assert, expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { fromBuffer } from 'strtok3';
import { AiffContentError } from '../lib/aiff/AiffToken.js';
import * as mm from '../lib/index.js';
import { UnexpectedFileContentError } from '../lib/index.js';
import { Parsers } from './shared/metadata-parsers.js';
import { samplePath } from './shared/util.js';

use(chaiAsPromised);

describe('Parse AIFF (Audio Interchange File Format)', () => {
  const aiffSamplePath = path.join(samplePath, 'aiff');

  const ULAW = 'ITU-T G.711 mu-law';

  for (const chunkId of ['ID3 ', 'NAME']) {
    it(`rejects a forged ${chunkId} chunk size before allocating`, async () => {
      const file = Buffer.alloc(20);
      file.write('FORM');
      file.writeUInt32BE(12, 4);
      file.write('AIFF', 8);
      file.write(chunkId, 12);
      file.writeUInt32BE(0xffffffff, 16);
      await expect(mm.parseBuffer(file, 'audio/aiff')).to.be.rejectedWith(
        AiffContentError,
        `Chunk ${chunkId} size 4294967295 exceeds remaining FORM data`
      );
    });
  }

  it('rejects a FORM size smaller than its type field', async () => {
    const file = Buffer.alloc(12);
    file.write('FORM');
    file.writeUInt32BE(3, 4);
    file.write('AIFF', 8);
    await expect(mm.parseBuffer(file, 'audio/aiff')).to.be.rejectedWith(AiffContentError, 'Invalid FORM chunk size: 3');
  });

  function checkFormat(
    format: mm.IFormat,
    compressionType: string,
    sampleRate: number,
    channels: number,
    bitsPerSample: number,
    samples: number
  ) {
    const lossless = compressionType === 'PCM';
    const dataFormat = lossless ? 'AIFF' : 'AIFF-C';
    assert.isDefined(format.sampleRate, 'format.sampleRate should be defined');
    const duration = samples / format.sampleRate;
    assert.strictEqual(format.container, dataFormat, `format.container = '${dataFormat}'`);
    assert.strictEqual(format.lossless, lossless, `format.lossless = ${lossless}`);
    assert.strictEqual(format.sampleRate, sampleRate, `format.sampleRate = ${sampleRate} kHz`);
    assert.strictEqual(format.bitsPerSample, bitsPerSample, `format.bitsPerSample = ${bitsPerSample} bit`);
    assert.strictEqual(format.numberOfChannels, channels, `format.numberOfChannels = ${channels} channels`);
    assert.strictEqual(format.numberOfSamples, samples, `format.numberOfSamples = ${samples} samples`);
    assert.strictEqual(format.duration, duration, `format.duration = ${duration} sec.`);
    assert.strictEqual(format.codec, compressionType, `format.codec = ${compressionType}`);
    assert.isTrue(format.hasAudio, 'format.hasAudio');
    assert.isFalse(format.hasVideo, 'format.hasAudio');
  }

  describe('Parse AIFF', () => {
    Parsers.forEach(parser => {
      it(parser.description, async function () {
        // AIFF file, AIFF file, stereo 8-bit data
        // Source: http://www-mmsp.ece.mcgill.ca/Documents/AudioFormats/AIFF/Samples.html
        const { format } = await parser.parse(
          () => this.skip(),
          path.join(aiffSamplePath, 'M1F1-int8-AFsp.aif'),
          'audio/aiff'
        );
        checkFormat(format, 'PCM', 8000, 2, 8, 23493);
        assert.approximately(format.bitrate!, 128000, 1e-6);
      });
    });
  });

  describe('Parse AIFF-C', () => {
    Parsers.forEach(parser => {
      it(parser.description, async function () {
        // AIFF-C file, stereo A-law data (compression type: alaw)
        // Source: http://www-mmsp.ece.mcgill.ca/Documents/AudioFormats/AIFF/Samples.html
        const { format } = await parser.parse(
          () => this.skip(),
          path.join(aiffSamplePath, 'M1F1-AlawC-AFsp.aif'),
          'audio/aiff'
        );
        checkFormat(format, 'Alaw 2:1', 8000, 2, 16, 23493);
        assert.approximately(format.bitrate!, 128000, 1e-6);
      });
    });

    // Issue: https://github.com/Borewit/music-metadata/issues/1211
    it('Uncompressed AIFC', async () => {
      const filePath = path.join(aiffSamplePath, 'hit-broken.aif');

      const { format } = await mm.parseFile(filePath);

      assert.strictEqual(format.container, 'AIFF-C', 'format.container');
      assert.strictEqual(format.codec, '32-bit floating point IEEE 32-bit float', 'format.codec');
      assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
    });
  });

  describe('Parse perverse Files', () => {
    describe('AIFF-C file (9 samples) with an odd length intermediate chunk', () => {
      Parsers.forEach(parser => {
        it(parser.description, async function () {
          const { format } = await parser.parse(
            () => this.skip(),
            path.join(aiffSamplePath, 'Pmiscck.aif'),
            'audio/aiff'
          );
          checkFormat(format, ULAW, 8000, 1, 16, 9);
        });
      });
    });

    describe('AIFF-C file with 0 samples (no SSND chunk)', () => {
      Parsers.forEach(parser => {
        it(parser.description, async function () {
          const { format } = await parser.parse(
            () => this.skip(),
            path.join(aiffSamplePath, 'Pnossnd.aif'),
            'audio/aiff'
          );
          checkFormat(format, ULAW, 8000, 1, 16, 0);
        });
      });
    });

    describe('AIFF-C file (9 samples), SSND chunk has a 5 byte offset to the data and trailing junk in the SSND chunk', () => {
      Parsers.forEach(parser => {
        it(parser.description, async function () {
          const { format } = await parser.parse(
            () => this.skip(),
            path.join(aiffSamplePath, 'Poffset.aif'),
            'audio/aiff'
          );
          checkFormat(format, ULAW, 8000, 1, 16, 9);
        });
      });
    });

    describe('AIFF-C file (9 samples) with SSND chunk ahead of the COMM chunk', () => {
      Parsers.forEach(parser => {
        it(parser.description, async function () {
          const { format } = await parser.parse(
            () => this.skip(),
            path.join(aiffSamplePath, 'Porder.aif'),
            'audio/aiff'
          );
          checkFormat(format, ULAW, 8000, 1, 16, 9);
        });
      });
    });

    describe('AIFF-C file (9 samples) with trailing junk after the FORM chunk', () => {
      Parsers.forEach(parser => {
        it(parser.description, async function () {
          const { format } = await parser.parse(
            () => this.skip(),
            path.join(aiffSamplePath, 'Ptjunk.aif'),
            'audio/aiff'
          );
          checkFormat(format, ULAW, 8000, 1, 16, 9);
        });
      });
    });

    describe('AIFF-C file (9 samples) with COMM chunk declaring 92 bytes (1 byte longer than actual file length), SSND with 9 bytes, missing trailing fill byte', () => {
      Parsers.forEach(parser => {
        it(parser.description, async function () {
          const { format } = await parser.parse(
            () => this.skip(),
            path.join(aiffSamplePath, 'Fnonull.aif'),
            'audio/aiff'
          );
          checkFormat(format, ULAW, 8000, 1, 16, 9);
        });
      });
    });
  });

  // Issue: https://github.com/Borewit/music-metadata/issues/643
  it('Parse tag "(c) "', async () => {
    const filePath = path.join(aiffSamplePath, 'No Sanctuary Here.aiff');

    const { format, common } = await mm.parseFile(filePath);

    assert.strictEqual(format.container, 'AIFF', 'format.container');
    assert.strictEqual(format.codec, 'PCM', 'format.codec');

    assert.strictEqual(common.album, 'Hdtracks 2020 Hi-Res Sampler', 'common.album');
    assert.deepStrictEqual(common.artists, ['Chris Jones'], 'common.artists');
    assert.strictEqual(common.encodersettings, 'Lavf58.29.100', 'common.encodersettings');
    assert.strictEqual(common.year, 2020, 'common.year');
  });

  it('text chunks', async () => {
    const filePath = path.join(aiffSamplePath, 'M1F1-AlawC-AFsp.aif');

    const { format, common } = await mm.parseFile(filePath);

    assert.strictEqual(format.container, 'AIFF-C', 'format.container');
    assert.strictEqual(format.codec, 'Alaw 2:1', 'format.codec');

    assert.deepStrictEqual(
      common.comment,
      [{ text: 'AFspdate: 2003-01-30 03:28:34 UTC' }, { text: 'user: kabal@CAPELLA' }, { text: 'program: CopyAudio' }],
      'common.comment'
    );
  });

  it('Protect against CWE-835 with 0 chunk length', async () => {
    const filePath = path.join(aiffSamplePath, 'CWE-835-01.aiff');

    await expect(mm.parseFile(filePath)).to.be.rejectedWith(
      UnexpectedFileContentError,
      /COMMON CHUNK size should always be at least 22/
    );
  });
});

describe('AIFF sound-data bitrate', () => {
  function chunk(id: string, payload: Buffer): Buffer {
    const header = Buffer.alloc(8);
    header.write(id);
    header.writeUInt32BE(payload.length, 4);
    return Buffer.concat([header, payload, Buffer.alloc(payload.length & 1)]);
  }

  function sample({ soundFirst = false, offset = 0, frames = 8, soundBytes = 16 } = {}): Buffer {
    const common = Buffer.alloc(18);
    common.writeUInt16BE(1); // Mono
    common.writeUInt32BE(frames, 2);
    common.writeUInt16BE(16, 6);
    common.set([0x40, 0x0b, 0xfa, 0x00], 8); // 8000 Hz, 80-bit extended
    const sound = Buffer.alloc(8 + offset + soundBytes);
    sound.writeUInt32BE(offset);
    const chunks = [chunk('COMM', common), chunk('SSND', sound)];
    if (soundFirst) {
      chunks.reverse();
    }
    return chunk('FORM', Buffer.concat([Buffer.from('AIFF'), ...chunks, chunk('NAME', Buffer.from('Title'))]));
  }

  it('rejects text chunks that exceed the decoded-value allocation limit', async () => {
    const file = chunk('FORM', Buffer.concat([Buffer.from('AIFF'), chunk('NAME', Buffer.from([0, 0]))]));
    await expect(mm.parseBuffer(file, { mimeType: 'audio/aiff' }, { maxMetadataEntries: 1 })).to.be.rejectedWith(
      AiffContentError,
      'Text value count 3 exceeds entry limit 1'
    );
  });

  for (const source of ['buffer', 'stream', 'blob']) {
    async function parse(data: Buffer) {
      return source === 'buffer'
        ? mm.parseBuffer(data, 'audio/aiff')
        : source === 'blob'
          ? mm.parseBlob(new Blob([Uint8Array.from(data)], { type: 'audio/aiff' }))
          : mm.parseStream(Readable.from([data], { objectMode: false }), 'audio/aiff');
    }

    for (const soundFirst of [false, true]) {
      for (const offset of [0, 5]) {
        it(`excludes the SSND header and ${offset} alignment bytes, soundFirst=${soundFirst} (${source})`, async () => {
          const { format, common } = await parse(sample({ soundFirst, offset }));
          assert.strictEqual(format.bitrate, 128000);
          assert.strictEqual(format.duration, 0.001);
          assert.strictEqual(format.numberOfSamples, 8);
          assert.strictEqual(common.title, 'Title', 'the following chunk remains aligned');
        });
      }
    }

    it(`does not derive a bitrate from zero-duration audio (${source})`, async () => {
      const { format } = await parse(sample({ frames: 0, soundBytes: 0 }));
      assert.strictEqual(format.duration, 0);
      assert.isUndefined(format.bitrate);
    });

    it(`rejects an alignment offset beyond the sound-data chunk (${source})`, async () => {
      const data = sample();
      const start = data.indexOf('SSND') + 8;
      data.writeUInt32BE(17, start);
      await expect(parse(data)).to.be.rejectedWith(AiffContentError, 'offset exceeds');
    });

    it(`rejects an SSND chunk too short to contain its header (${source})`, async () => {
      const data = chunk('FORM', Buffer.concat([Buffer.from('AIFF'), chunk('SSND', Buffer.alloc(4))]));
      await expect(parse(data)).to.be.rejectedWith(AiffContentError, 'SSND chunk is too small');
    });
  }
});

describe('AIFC duration regression', () => {
  const samples = [
    { name: 'openclaw-ima4-mono.aifc', frames: 28224, channels: 1, bytes: 14994 },
    { name: 'openclaw-ima4-stereo.aifc', frames: 28224, channels: 2, bytes: 29988 },
    { name: 'openclaw-ima4-decoded-frames.aifc', frames: 28224, channels: 1, bytes: 14994 },
    { name: 'openclaw-ima4-malformed-packets.aifc', frames: 441, channels: 1, bytes: 14995 },
    {
      name: 'openclaw-alaw.aifc',
      frames: 441,
      channels: 1,
      bytes: 441,
      codec: 'ALaw 2:1\t8-bit ITU-T G.711 A-law'
    },
    {
      name: 'openclaw-ulaw.aifc',
      frames: 441,
      channels: 1,
      bytes: 441,
      codec: 'µLaw 2:1\t8-bit ITU-T G.711 µ-law\tApple Computer'
    },
    { name: 'ima4-sound-first-offset.aifc', frames: 28224, channels: 1, bytes: 14994 }
  ];

  for (const sample of samples) {
    for (const parser of Parsers) {
      it(`${sample.name} (${parser.description})`, async function () {
        const { format } = await parser.parse(
          () => this.skip(),
          path.join(samplePath, 'aiff', sample.name),
          'audio/aiff',
          { duration: true }
        );
        assert.strictEqual(format.codec, sample.codec ?? 'IMA4 ADPCM');
        assert.strictEqual(format.numberOfChannels, sample.channels);
        assert.strictEqual(format.numberOfSamples, sample.frames);
        assert.strictEqual(format.duration, sample.frames / 44100);
        assert.strictEqual(format.bitrate, (8 * sample.bytes) / (sample.frames / 44100));
      });
    }
  }

  let data: Buffer;
  before(async () => {
    data = await readFile(path.join(samplePath, 'aiff', 'openclaw-ima4-mono.aifc'));
  });

  for (const field of ['channels', 'frames', 'sample rate', 'packet count']) {
    it(`does not expand an invalid or uncorroborated ${field}`, async () => {
      const input = Buffer.from(data);
      const common = input.indexOf('COMM') + 8;
      if (field === 'channels') {
        input.writeUInt16BE(0, common);
      }
      if (field === 'frames') {
        input.writeUInt32BE(0, common + 2);
      }
      if (field === 'sample rate') {
        input.fill(0, common + 8, common + 18);
      }
      if (field === 'packet count') {
        input.writeUInt32BE(442, common + 2);
      }
      const { format } = await mm.parseBuffer(input, 'audio/aiff');
      assert.strictEqual(format.numberOfSamples, field === 'frames' ? 0 : field === 'packet count' ? 442 : 441);
    });
  }

  it('does not expand counts without SSND', async () => {
    const input = Buffer.from(data);
    input.write('JUNK', input.indexOf('SSND'));
    const { format } = await mm.parseBuffer(input, 'audio/aiff');
    assert.strictEqual(format.numberOfSamples, 441);
    assert.strictEqual(format.duration, 0.01);
  });

  it('does not expand a physically truncated unknown-size stream', async () => {
    const sound = data.indexOf('SSND') + 8;
    const { format } = await mm.parseStream(
      Readable.from([data.subarray(0, sound + 8 + 34)], { objectMode: false }),
      'audio/aiff'
    );
    assert.strictEqual(format.numberOfSamples, 441);
    assert.strictEqual(format.duration, 0.01);
  });

  it('preserves caller-owned tokenizer position and lifetime', async () => {
    const input = Buffer.concat([data, Buffer.from('trailing')]);
    const tokenizer = fromBuffer(input, { fileInfo: { mimeType: 'audio/aiff' } });
    try {
      const { format } = await mm.parseFromTokenizer(tokenizer);
      assert.strictEqual(format.numberOfSamples, 28224);
      assert.strictEqual(format.duration, 0.64);
      assert.strictEqual(tokenizer.position, data.length);
      const tail = Buffer.alloc(8);
      await tokenizer.readBuffer(tail);
      assert.strictEqual(tail.toString(), 'trailing');
    } finally {
      await tokenizer.close();
    }
  });
});
