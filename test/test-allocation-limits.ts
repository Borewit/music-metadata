import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { assert, expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { EndOfStreamError, fromBuffer, fromStream } from 'strtok3';
import * as Token from 'token-types';
import { readBuffer, readToken, validateAllocation } from '../lib/common/Allocation.js';
import { MetadataCollector } from '../lib/common/MetadataCollector.js';
import { DsdiffContentParseError } from '../lib/dsdiff/DsdiffParser.js';
import * as mm from '../lib/index.js';
import type { IPageHeader } from '../lib/ogg/OggToken.js';
import { VorbisStream } from '../lib/ogg/vorbis/VorbisStream.js';
import { UnexpectedFileContentError } from '../lib/ParseError.js';

use(chaiAsPromised);

function dffChunk(id: string, size: bigint, payload = Buffer.alloc(0)): Buffer {
  const header = Buffer.alloc(12);
  header.write(id);
  header.writeBigInt64BE(size, 4);
  return Buffer.concat([header, payload]);
}

function dff(payload: Buffer, declaredSize = BigInt(4 + payload.length)): Buffer {
  return dffChunk('FRM8', declaredSize, Buffer.concat([Buffer.from('DSD '), payload]));
}

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
});

describe('DSDIFF chunk lengths (GHSA-5pwx-m48f-hw27)', () => {
  const poc = dff(dffChunk('ID3 ', 0x7fffffffffffffffn), 256n);

  it('rejects the exact 28-byte advisory PoC through all public input APIs', async () => {
    assert.lengthOf(poc, 28);
    const directory = await mkdtemp(path.join(tmpdir(), 'music-metadata-dsdiff-'));
    const filePath = path.join(directory, 'poc.dff');
    try {
      await writeFile(filePath, poc);
      for (const parse of [
        () => mm.parseBuffer(poc, 'audio/dsd'),
        () => mm.parseFile(filePath),
        () => mm.parseStream(Readable.from([poc], { objectMode: false }), 'audio/dsd'),
        () => mm.parseWebStream(new Blob([Uint8Array.from(poc)]).stream(), 'audio/dsd'),
        () => mm.parseBlob(new Blob([Uint8Array.from(poc)], { type: 'audio/dsd' }))
      ]) {
        await expect(parse()).to.be.rejectedWith(DsdiffContentParseError);
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  for (const chunkID of ['ID3 ', 'PROP', 'DSD ', 'JUNK']) {
    for (const size of [-1n, 0x20000000000000n, 0x7fffffffffffffffn]) {
      it(`validates the signed 64-bit ${chunkID} size ${size} on unknown-size streams`, async () => {
        const sample = dff(dffChunk(chunkID, size), 256n);
        await expect(mm.parseStream(Readable.from([sample], { objectMode: false }), 'audio/dsd')).to.be.rejectedWith(
          DsdiffContentParseError,
          'Invalid chunk size'
        );
      });
    }
  }

  for (const size of [2n * 1024n ** 3n, 4n * 1024n ** 3n]) {
    it(`rejects an ID3 payload of ${size} bytes inside a matching declared container before allocation`, async () => {
      const sample = dff(dffChunk('ID3 ', size), size + 16n);
      const tokenizer = await fromStream(Readable.from([sample], { objectMode: false }), {
        fileInfo: { mimeType: 'audio/dsd' }
      });
      const originalReadToken = tokenizer.readToken.bind(tokenizer);
      tokenizer.readToken = (token, position) => {
        assert.isAtMost(token.len, 64 * 1024, 'reject attacker-sized tokens before the tokenizer allocates');
        return originalReadToken(token, position);
      };
      const originalReadBuffer = tokenizer.readBuffer.bind(tokenizer);
      tokenizer.readBuffer = (buffer, options) => {
        assert.isAtMost(buffer.length, 64 * 1024);
        return originalReadBuffer(buffer, options);
      };
      try {
        await expect(mm.parseFromTokenizer(tokenizer)).to.be.rejectedWith(
          UnexpectedFileContentError,
          'allocation limit'
        );
      } finally {
        await tokenizer.close();
      }
    });
  }

  it('checks a nested sound-property chunk against its PROP boundary', async () => {
    const prop = dffChunk('PROP', 16n, Buffer.concat([Buffer.from('SND '), dffChunk('CHNL', 1024n)]));
    await expect(mm.parseBuffer(dff(prop), 'audio/dsd')).to.be.rejectedWith(
      DsdiffContentParseError,
      'exceeds its enclosing chunk'
    );
  });

  it('rejects a short fixed-field chunk even when bytes follow it', async () => {
    const prop = dffChunk('PROP', 16n, Buffer.concat([Buffer.from('SND '), dffChunk('FS  ', 0n)]));
    await expect(mm.parseBuffer(dff(prop), 'audio/dsd')).to.be.rejectedWith(DsdiffContentParseError, 'too small');
  });

  for (const [id, payload] of [
    ['ABSS', Buffer.alloc(7)],
    ['LSCO', Buffer.alloc(1)],
    ['CMPR', Buffer.from('DSD ')],
    ['CMPR', Buffer.from([0x44, 0x53, 0x44, 0x20, 3, 0x61])]
  ] as const) {
    it(`rejects a ${payload.length}-byte ${id} sound property before reading past its boundary`, async () => {
      const soundProperty = dffChunk(id, BigInt(payload.length), payload);
      const propPayload = Buffer.concat([
        Buffer.from('SND '),
        soundProperty,
        Buffer.alloc(payload.length & 1),
        dffChunk('FS  ', 4n, Buffer.alloc(4))
      ]);
      await expect(
        mm.parseBuffer(dff(dffChunk('PROP', BigInt(propPayload.length), propPayload)), 'audio/dsd')
      ).to.be.rejectedWith(DsdiffContentParseError, `Chunk ${id} is too small`);
    });
  }

  it('preserves alignment after optional, padded and unknown sound properties', async () => {
    const sampleRate = Buffer.alloc(4);
    sampleRate.writeUInt32BE(2822400);
    const propPayload = Buffer.concat([
      Buffer.from('SND '),
      dffChunk('ABSS', 10n, Buffer.from([0, 1, 2, 3, 0, 0, 0, 4, 0xff, 0xff])),
      dffChunk('LSCO', 2n, Buffer.from([0, 1])),
      dffChunk('JUNK', 3n, Buffer.from([42, 43, 44, 0])),
      dffChunk('CHNL', 6n, Buffer.concat([Buffer.from([0, 1]), Buffer.from('C   ')])),
      dffChunk('CMPR', 8n, Buffer.concat([Buffer.from('DSD '), Buffer.from([3]), Buffer.from('raw')])),
      dffChunk('FS  ', 4n, sampleRate)
    ]);
    const sample = dff(
      Buffer.concat([
        dffChunk('PROP', BigInt(propPayload.length), propPayload),
        dffChunk('DSD ', 16n, Buffer.alloc(16))
      ])
    );
    const metadata = await mm.parseBuffer(sample, 'audio/dsd');
    assert.strictEqual(metadata.format.sampleRate, 2822400);
    assert.strictEqual(metadata.format.numberOfChannels, 1);
    assert.strictEqual(metadata.format.bitsPerSample, 1);
    assert.strictEqual(metadata.format.codec, 'DSD (raw)');
    assert.strictEqual(metadata.format.numberOfSamples, 128);
    assert.strictEqual(metadata.format.duration, 128 / 2822400);
    assert.strictEqual(metadata.format.bitrate, 2822400);
  });

  it('rejects an incomplete sound-property header', async () => {
    const prop = dffChunk('PROP', 5n, Buffer.concat([Buffer.from('SND '), Buffer.from([0, 0])]));
    await expect(mm.parseBuffer(dff(prop), 'audio/dsd')).to.be.rejectedWith(
      DsdiffContentParseError,
      'Incomplete sound-property chunk header'
    );
  });

  for (const [name, sample] of [
    ['audio payload', dff(dffChunk('DSD ', 4n, Buffer.from([42])), 20n)],
    ['padding byte', dff(dffChunk('JUNK', 1n, Buffer.from([42])), 18n)]
  ] as const) {
    it(`rejects a truncated skipped ${name} on an unknown-size stream`, async () => {
      await expect(mm.parseStream(Readable.from([sample], { objectMode: false }), 'audio/dsd')).to.be.rejectedWith(
        EndOfStreamError
      );
    });

    it(`rejects a short ${name} skip returned by a custom tokenizer`, async () => {
      const tokenizer = await fromStream(Readable.from([sample], { objectMode: false }), {
        fileInfo: { mimeType: 'audio/dsd' }
      });
      tokenizer.ignore = length => tokenizer.readBuffer(new Uint8Array(length), { mayBeLess: true });
      try {
        await expect(mm.parseFromTokenizer(tokenizer)).to.be.rejectedWith(
          DsdiffContentParseError,
          'Unexpected end of chunk'
        );
      } finally {
        await tokenizer.close();
      }
    });
  }

  it('does not apply the metadata cap to skipped audio payloads', async () => {
    const sample = dff(dffChunk('DSD ', 128n, Buffer.alloc(128)));
    const metadata = await mm.parseBuffer(sample, 'audio/dsd', { maxMemoryAllocation: 64 });
    assert.strictEqual(metadata.format.container, 'DSDIFF/DSD');
  });

  it('handles odd-sized chunk padding before the next chunk', async () => {
    const sample = dff(
      Buffer.concat([dffChunk('JUNK', 1n, Buffer.from([1, 0])), dffChunk('FVER', 4n, Buffer.alloc(4))])
    );
    const metadata = await mm.parseBuffer(sample, 'audio/dsd');
    assert.strictEqual(metadata.format.container, 'DSDIFF/DSD');
  });
});
