import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { assert } from 'chai';
import AsfGuid from '../lib/asf/AsfGuid.js';
import { AsfContentParseError, DataType, WmPictureToken } from '../lib/asf/AsfObject.js';
import * as mm from '../lib/index.js';
import { samplePath } from './util.js';

const image = readFileSync(path.join(samplePath, 'tinytrans.gif'));

function picture(mime: string, description: string): Uint8Array {
  const header = Buffer.alloc(5);
  header[0] = 3; // Front cover
  header.writeUInt32LE(image.length, 1);
  return Uint8Array.from(Buffer.concat([header, Buffer.from(`${mime}\0${description}\0`, 'utf16le'), image]));
}

function asfPicture(payload: Uint8Array): Uint8Array {
  const name = Buffer.from('WM/Picture\0', 'utf16le');
  const nameLength = Buffer.alloc(2);
  nameLength.writeUInt16LE(name.length);
  const valueHeader = Buffer.alloc(4);
  valueHeader.writeUInt16LE(DataType.ByteArray);
  valueHeader.writeUInt16LE(payload.length, 2);
  const record = Buffer.concat([Buffer.from([1, 0]), nameLength, name, valueHeader, payload]);
  const header = Buffer.alloc(30);
  header.set(AsfGuid.HeaderObject.toBin());
  header.writeBigUInt64LE(BigInt(30 + 24 + record.length), 16);
  header.writeUInt32LE(1, 24);
  header.set([1, 2], 28);
  const objectHeader = Buffer.alloc(24);
  objectHeader.set(AsfGuid.ExtendedContentDescriptionObject.toBin());
  objectHeader.writeBigUInt64LE(BigInt(24 + record.length), 16);
  return Uint8Array.from(Buffer.concat([header, objectHeader, record]));
}

describe('ASF picture decoding', () => {
  for (const description of ['', 'Front cover — 東京 🎵']) {
    for (const viewOffset of [0, 7]) {
      for (const tokenOffset of [0, 5]) {
        it(`decodes ${description ? 'Unicode' : 'empty'} description (view=${viewOffset}, token=${tokenOffset})`, () => {
          const payload = picture('image/gif', description);
          const backing = new Uint8Array(viewOffset + tokenOffset + payload.length + 6).fill(0xa5);
          backing.set(payload, viewOffset + tokenOffset);
          const view = backing.subarray(viewOffset);
          const decoded = new WmPictureToken(payload.length).get(view, tokenOffset);
          assert.strictEqual(decoded.format, 'image/gif');
          assert.strictEqual(decoded.description, description);
          assert.strictEqual(decoded.type, 'Cover (front)');
          assert.strictEqual(decoded.size, image.length);
          assert.deepEqual(decoded.data, new Uint8Array(image));
        });
      }
    }
  }

  for (const mime of ['', 'image/gif']) {
    for (const source of ['buffer', 'stream', 'blob']) {
      it(`preserves picture fields and image bytes through ${source} with ${mime || 'inferred MIME type'}`, async () => {
        const data = asfPicture(picture(mime, 'Album cover 🎵'));
        const metadata =
          source === 'buffer'
            ? await mm.parseBuffer(data, 'audio/x-ms-wma')
            : source === 'blob'
              ? await mm.parseBlob(new Blob([Uint8Array.from(data)], { type: 'audio/x-ms-wma' }))
              : await mm.parseStream(Readable.from([data], { objectMode: false }), 'audio/x-ms-wma');
        const native = metadata.native.asf.find(tag => tag.id === 'WM/Picture')!.value as mm.IPicture;
        for (const decoded of [native, metadata.common.picture![0]]) {
          assert.strictEqual(decoded.format, 'image/gif');
          assert.strictEqual(decoded.description, 'Album cover 🎵');
          assert.strictEqual(decoded.type, 'Cover (front)');
          assert.deepEqual(decoded.data, new Uint8Array(image));
        }
        assert.strictEqual(mm.selectCover(metadata.common.picture), metadata.common.picture![0]);
      });
    }
  }

  for (const [field, payload] of [
    ['MIME type', Uint8Array.from([3, 0, 0, 0, 0, 0x61, 0])],
    ['description', Uint8Array.from([3, 0, 0, 0, 0, 0, 0, 0x61, 0])]
  ] as const) {
    it(`does not find an unterminated ${field} outside the token`, () => {
      const backing = new Uint8Array(payload.length + 4);
      backing.set(payload);
      assert.throws(() => new WmPictureToken(payload.length).get(backing, 0), AsfContentParseError, field);
    });
  }

  for (const length of [0, 1, 2, 3, 4]) {
    it(`rejects a ${length}-byte picture header without reading the backing buffer`, () => {
      assert.throws(
        () => new WmPictureToken(length).get(new Uint8Array(16), 0),
        AsfContentParseError,
        'Truncated ASF picture header'
      );
    });
  }

  for (const size of [0, image.length + 1, 0x80000000]) {
    it(`preserves available image bytes when the declared DWORD size is ${size}`, () => {
      const payload = picture('image/gif', 'Cover');
      new DataView(payload.buffer).setUint32(1, size, true);
      const decoded = WmPictureToken.fromBuffer(payload);
      assert.strictEqual(decoded.size, size);
      assert.deepEqual(decoded.data, new Uint8Array(image));
    });
  }
});
