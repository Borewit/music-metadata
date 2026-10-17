import { assert } from 'chai';
import { fromBuffer } from 'strtok3';
import { MetadataCollector } from '../lib/common/MetadataCollector.js';
import { ID3v2Parser } from '../lib/id3v2/ID3v2Parser.js';
import type { ID3v2MajorVersion } from '../lib/id3v2/ID3v2Token.js';

function synchSafe(size: number): Buffer {
  return Buffer.from([(size >>> 21) & 0x7f, (size >>> 14) & 0x7f, (size >>> 7) & 0x7f, size & 0x7f]);
}

// Synthetic tag: one title frame followed by caller-supplied trailing bytes.
function paddingFixture(major: ID3v2MajorVersion, trailing: Uint8Array): Buffer {
  const title = Buffer.from('\x00Synthetic title\x00', 'latin1');
  const frameHeader = Buffer.alloc(major === 2 ? 6 : 10);
  frameHeader.write(major === 2 ? 'TT2' : 'TIT2', 'ascii');
  if (major === 2) {
    frameHeader.writeUIntBE(title.length, 3, 3);
  } else if (major === 3) {
    frameHeader.writeUInt32BE(title.length, 4);
  } else {
    frameHeader.set(synchSafe(title.length), 4);
  }
  const payload = Buffer.concat([frameHeader, title, trailing]);
  return Buffer.concat([Buffer.from([0x49, 0x44, 0x33, major, 0, 0]), synchSafe(payload.length), payload]);
}

async function parseFixture(major: ID3v2MajorVersion, trailing: Uint8Array): Promise<MetadataCollector> {
  const metadata = new MetadataCollector({});
  const tokenizer = fromBuffer(paddingFixture(major, trailing));
  try {
    await new ID3v2Parser().parse(metadata, tokenizer, {});
    assert.strictEqual(tokenizer.position, tokenizer.fileInfo.size, 'the entire tag is consumed');
    assert.strictEqual(metadata.common.title, 'Synthetic title');
    assert.deepEqual(metadata.native[`ID3v2.${major}`], [
      { id: major === 2 ? 'TT2' : 'TIT2', value: 'Synthetic title' }
    ]);
    return metadata;
  } finally {
    await tokenizer.close();
  }
}

describe('ID3v2 padding', () => {
  for (const major of [2, 3, 4] as const) {
    describe(`ID3v2.${major}`, () => {
      // 2,166 bytes reproduces the padding in the reported MP3: previously
      // ID3v2.4 emitted 216 invalid-ID warnings, 216 empty-frame warnings,
      // and one illegal-length warning for the final six bytes.
      for (const length of [0, 1, 5, 6, 9, 10, 12, 2166]) {
        it(`accepts ${length} bytes of zero padding without warnings`, async () => {
          const metadata = await parseFixture(major, Buffer.alloc(length));
          assert.isEmpty(metadata.quality.warnings);
        });
      }

      it('still warns about a truncated non-padding frame header', async () => {
        const metadata = await parseFixture(major, Buffer.from('T'));
        assert.deepEqual(metadata.quality.warnings, [{ message: 'Illegal ID3v2 tag length' }]);
      });

      it('warns about non-zero bytes after padding begins', async () => {
        const trailing = Buffer.alloc(2166);
        trailing[trailing.length - 1] = 1;
        const metadata = await parseFixture(major, trailing);
        assert.deepEqual(metadata.quality.warnings, [{ message: 'Non-zero bytes found in ID3v2 padding' }]);
      });
    });
  }
});
