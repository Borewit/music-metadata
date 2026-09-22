import {assert, expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {Readable} from 'node:stream';
import {EndOfStreamError, fromBuffer, fromStream} from 'strtok3';

import {APEv2Parser, ApeContentError} from '../lib/apev2/APEv2Parser.js';
import {TagFooter} from '../lib/apev2/APEv2Token.js';
import {MetadataCollector} from '../lib/common/MetadataCollector.js';
import {parseBuffer} from '../lib/core.js';

use(chaiAsPromised);

function tagHeader(size: number, fields = 1): Buffer {
  const header = Buffer.alloc(32);
  header.write('APETAGEX');
  header.writeUInt32LE(2000, 8);
  header.writeUInt32LE(size, 12);
  header.writeUInt32LE(fields, 16);
  return header;
}

function item(size: number, type = 1, key = 'Cover Art (Front)\0', value = Buffer.alloc(0)): Buffer {
  const header = Buffer.alloc(8);
  header.writeUInt32LE(size);
  header.writeUInt32LE(type << 1, 4);
  return Buffer.concat([header, Buffer.from(key), value]);
}

describe('APEv2 item lengths (GHSA-53v6-4h7p-p4gj)', () => {
  const forgedSize = 0x08000000;

  it('rejects the 134-byte APE cover-art PoC with default options', async () => {
    const descriptor = Buffer.alloc(52);
    descriptor.write('MAC ');
    descriptor.writeUInt32LE(4000, 4);
    descriptor.writeUInt32LE(52, 8);
    descriptor.writeUInt32LE(24, 12);
    const audioHeader = Buffer.alloc(24);
    audioHeader.writeUInt32LE(1, 4);
    audioHeader.writeUInt32LE(1, 8);
    audioHeader.writeUInt32LE(1, 12);
    audioHeader.writeUInt16LE(16, 16);
    audioHeader.writeUInt16LE(1, 18);
    audioHeader.writeUInt32LE(44100, 20);
    const payload = item(forgedSize);
    const sample = Buffer.concat([descriptor, audioHeader, tagHeader(32 + payload.length + forgedSize), payload]);
    assert.lengthOf(sample, 134);
    await expect(parseBuffer(sample, {mimeType: 'audio/ape'}))
      .to.be.rejectedWith(ApeContentError, `Invalid tag item size: ${forgedSize}`);
  });

  for (const type of [0, 1, 2, 3]) {
    for (const skipCovers of [false, true]) {
      it(`rejects type ${type} beyond the file before reading its value (skipCovers=${skipCovers})`, async () => {
        const payload = item(forgedSize, type);
        const tokenizer = fromBuffer(payload);
        const parser = new APEv2Parser(new MetadataCollector({}), tokenizer, {skipCovers});
        await expect(parser.parseTags(TagFooter.get(tagHeader(32 + payload.length + forgedSize), 0)))
          .to.be.rejectedWith(ApeContentError, 'Invalid tag item size');
        assert.strictEqual(tokenizer.position, payload.length);
      });
    }
  }

  it('rejects an item exceeding the tag even when the file has enough bytes', async () => {
    const tokenizer = fromBuffer(item(16, 1, 'Art\0', Buffer.alloc(16)));
    const parser = new APEv2Parser(new MetadataCollector({}), tokenizer, {});
    await expect(parser.parseTags(TagFooter.get(tagHeader(32 + 8 + 16), 0)))
      .to.be.rejectedWith(ApeContentError, 'Invalid tag item size');
    assert.strictEqual(tokenizer.position, 8);
  });

  it('rejects a key without a terminator inside the tag boundary', async () => {
    const payload = item(0, 0, 'Title');
    const tokenizer = fromBuffer(Buffer.concat([payload, Buffer.from([0])]));
    const parser = new APEv2Parser(new MetadataCollector({}), tokenizer, {});
    await expect(parser.parseTags(TagFooter.get(tagHeader(32 + payload.length), 0)))
      .to.be.rejectedWith(ApeContentError, 'Unterminated tag item key');
    assert.strictEqual(tokenizer.position, 8);
  });

  for (const size of [undefined, forgedSize * 2]) {
    for (const type of [0, 1]) {
      it(`bounds reads of a truncated type ${type} stream (advertised size=${size})`, async () => {
        const payload = item(forgedSize, type);
        const tokenizer = await fromStream(Readable.from([payload], {objectMode: false}), {fileInfo: {size}});
        const readBuffer = tokenizer.readBuffer.bind(tokenizer);
        tokenizer.readBuffer = async (buffer, options) => {
          assert.isAtMost(buffer.length, 64 * 1024, 'must not allocate the declared value size');
          return readBuffer(buffer, options);
        };
        try {
          const parser = new APEv2Parser(new MetadataCollector({}), tokenizer, {});
          await expect(parser.parseTags(TagFooter.get(tagHeader(32 + payload.length + forgedSize), 0)))
            .to.be.rejectedWith(EndOfStreamError);
        } finally {
          await tokenizer.close();
        }
      });

      it(`preserves a multi-chunk type ${type} value and the next item (advertised size=${size})`, async () => {
        const value = Buffer.alloc(65539, 0x61);
        value.set([0xe2, 0x82, 0xac], 65535);
        if (type === 1) value[0] = 0; // Empty picture description.
        const payload = Buffer.concat([item(value.length, type, 'Title\0', value), item(0, 0, 'Artist\0')]);
        const tokenizer = await fromStream(Readable.from([payload], {objectMode: false}), {fileInfo: {size}});
        const metadata = new MetadataCollector({});
        try {
          await new APEv2Parser(metadata, tokenizer, {}).parseTags(TagFooter.get(tagHeader(32 + payload.length, 2), 0));
          const tags = metadata.toCommonMetadata().native.APEv2;
          assert.deepEqual(tags[0], {id: 'Title', value: type === 0 ? value.toString('utf8') : {
            description: '', data: new Uint8Array(value.subarray(1))
          }});
          assert.deepEqual(tags[1], {id: 'Artist', value: ''});
          assert.strictEqual(tokenizer.position, payload.length);
        } finally {
          await tokenizer.close();
        }
      });
    }
  }
});
