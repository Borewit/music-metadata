import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { assert, expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { EndOfStreamError, fromBuffer, fromStream } from 'strtok3';
import { DsdiffContentParseError } from '../lib/dsdiff/DsdiffParser.js';
import * as mm from '../lib/index.js';
import { UnexpectedFileContentError } from '../lib/ParseError.js';
import { dff, dffChunk } from './shared/dsdiff-util.js';
import { samplePath } from './shared/util.js';

use(chaiAsPromised);

describe('Parse Philips DSDIFF', () => {
  const dsdiffamplePath = path.join(samplePath, 'dsdiff');

  it('parse: DSD64.dff', async () => {
    const filePath = path.join(dsdiffamplePath, 'DSD64.dff');

    const { format, common } = await mm.parseFile(filePath, { duration: false });

    // format chunk information
    assert.strictEqual(format.container, 'DSDIFF/DSD');
    assert.deepEqual(format.lossless, true);
    assert.deepEqual(format.tagTypes, ['ID3v2.3']);
    assert.deepEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
    assert.deepEqual(format.bitsPerSample, 1, 'format.bitsPerSample');
    assert.deepEqual(format.sampleRate, 2822400, 'format.sampleRate [Hz]');
    assert.deepEqual(format.numberOfSamples, 300800, 'format.numberOfSamples');
    assert.deepEqual(format.duration, 300800 / 2822400, 'format.duration');
    assert.deepEqual(format.bitrate, 5644800, 'format.bitrate');
    assert.deepEqual(format.tagTypes, ['ID3v2.3'], 'TAG headers');

    // ID3v2 chunk information
    assert.strictEqual(common.artist, 'CANTUS (Tove Ramlo-Ystad) & Frode Fjellheim', 'common.artist');
    assert.strictEqual(common.title, 'Kyrie', 'common.title');
    assert.strictEqual(common.album, 'SPES', 'common.album');
    assert.deepEqual(common.genre, ['Choral'], 'common.genre');
    assert.deepEqual(common.track, { no: 4, of: 12 }, 'common.track');
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

    for (const streamed of [false, true]) {
      it(`leaves the source open after nested chunk traversal (stream=${streamed})`, async () => {
        const prop = Buffer.concat([Buffer.from('SND '), dffChunk('JUNK', 1n, Buffer.from([42, 0]))]);
        const sample = dff(dffChunk('PROP', BigInt(prop.length), prop));
        const data = Buffer.concat([sample, Buffer.from([99])]);
        const tokenizer = streamed ? await fromStream(Readable.from([data], { objectMode: false })) : fromBuffer(data);
        tokenizer.fileInfo.mimeType = 'audio/dsd';
        let closed = false;
        const close = tokenizer.close.bind(tokenizer);
        tokenizer.close = async () => {
          closed = true;
          await close();
        };
        try {
          await mm.parseFromTokenizer(tokenizer);
          assert.isFalse(closed);
          assert.equal(tokenizer.position, sample.length);
          const following = new Uint8Array(1);
          await tokenizer.readBuffer(following);
          assert.equal(following[0], 99);
        } finally {
          await tokenizer.close();
        }
      });
    }

    it('preserves tolerance of an incomplete final top-level header', async () => {
      const sample = dff(Buffer.alloc(2));
      await mm.parseBuffer(sample, 'audio/dsd');
    });

    it('handles odd-sized chunk padding before the next chunk', async () => {
      const sample = dff(
        Buffer.concat([dffChunk('JUNK', 1n, Buffer.from([1, 0])), dffChunk('FVER', 4n, Buffer.alloc(4))])
      );
      const metadata = await mm.parseBuffer(sample, 'audio/dsd');
      assert.strictEqual(metadata.format.container, 'DSDIFF/DSD');
    });
  });
});
