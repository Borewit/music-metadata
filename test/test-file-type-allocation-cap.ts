import { assert, expect } from 'chai';
import { BufferSizeError, fromBuffer } from 'strtok3';
import { MetadataCollector } from '../lib/common/MetadataCollector.js';
import { parseFromTokenizer } from '../lib/core.js';
import { UnsupportedFileTypeError } from '../lib/ParseError.js';

describe('file-type allocation cap', () => {
  // PNG signature, IHDR with 13 bytes of data and a CRC, then an empty IDAT header.
  const png = new Uint8Array(41);
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  png.set([0, 0, 0, 0, 0x49, 0x44, 0x41, 0x54], 33);

  it('caps media format detection independently of a caller-supplied tokenizer', async () => {
    // Leave the outer tokenizer uncapped to exercise file-type's own tokenizer.
    await expect(parseFromTokenizer(fromBuffer(png), { maxMemoryAllocation: 2 })).to.be.rejectedWith(
      BufferSizeError,
      'maxBufferSize 2'
    );
    // Raising the cap permits detection; PNG is recognized but is not a supported media format.
    await expect(parseFromTokenizer(fromBuffer(png), { maxMemoryAllocation: 4 })).to.be.rejectedWith(
      UnsupportedFileTypeError,
      'image/png'
    );
  });

  it('caps cover art detection and allows callers to raise the limit', async () => {
    const limited = new MetadataCollector({ maxMemoryAllocation: 2 });
    await expect(limited.addTag('ID3v2.3', 'APIC', { data: png, format: '' })).to.be.rejectedWith(
      BufferSizeError,
      'maxBufferSize 2'
    );
    for (const options of [undefined, { maxMemoryAllocation: 4 }]) {
      const metadata = new MetadataCollector(options);
      await metadata.addTag('ID3v2.3', 'APIC', { data: png, format: '' });
      assert.strictEqual(metadata.common.picture?.[0].format, 'image/png');
    }
  });
});
