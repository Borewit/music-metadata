import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { assert } from 'chai';
import AsfGuid from '../lib/asf/AsfGuid.js';
import { AsfContentParseError, DataType, WmPictureToken } from '../lib/asf/AsfObject.js';
import * as mm from '../lib/index.js';
import { samplePath } from './util.js';

const image = readFileSync(path.join(samplePath, 'tinytrans.gif'));

function picture(mime: string, description: string, type = 3): Uint8Array {
  const header = Buffer.alloc(5);
  header[0] = type; // Front cover by default
  header.writeUInt32LE(image.length, 1);
  return Uint8Array.from(Buffer.concat([header, Buffer.from(`${mime}\0${description}\0`, 'utf16le'), image]));
}

function asfPictures(payloads: Uint8Array[], kind: 'extended' | 'metadata' | 'library' = 'extended'): Uint8Array {
  const name = Buffer.from('WM/Picture\0', 'utf16le');
  const records = payloads.map(payload => {
    if (kind !== 'extended') {
      const header = Buffer.alloc(12);
      header.writeUInt16LE(name.length, 4);
      header.writeUInt16LE(DataType.ByteArray, 6);
      header.writeUInt32LE(payload.length, 8);
      return Buffer.concat([header, name, payload]);
    }
    const nameLength = Buffer.alloc(2);
    nameLength.writeUInt16LE(name.length);
    const valueHeader = Buffer.alloc(4);
    valueHeader.writeUInt16LE(DataType.ByteArray);
    valueHeader.writeUInt16LE(payload.length, 2);
    return Buffer.concat([nameLength, name, valueHeader, payload]);
  });
  const count = Buffer.alloc(2);
  count.writeUInt16LE(records.length);
  const record = Buffer.concat([count, ...records]);
  const objectHeader = Buffer.alloc(24);
  objectHeader.set(
    (kind === 'extended'
      ? AsfGuid.ExtendedContentDescriptionObject
      : kind === 'metadata'
        ? AsfGuid.MetadataObject
        : AsfGuid.MetadataLibraryObject
    ).toBin()
  );
  objectHeader.writeBigUInt64LE(BigInt(24 + record.length), 16);
  let object = Buffer.concat([objectHeader, record]);
  if (kind !== 'extended') {
    const extension = Buffer.alloc(46);
    extension.set(AsfGuid.HeaderExtensionObject.toBin());
    extension.writeBigUInt64LE(BigInt(extension.length + object.length), 16);
    extension.writeUInt32LE(object.length, 42);
    object = Buffer.concat([extension, object]);
  }
  const header = Buffer.alloc(30);
  header.set(AsfGuid.HeaderObject.toBin());
  header.writeBigUInt64LE(BigInt(header.length + object.length), 16);
  header.writeUInt32LE(1, 24);
  header.set([1, 2], 28);
  return Uint8Array.from(Buffer.concat([header, object]));
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
        const data = asfPictures([picture(mime, 'Album cover 🎵')]);
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

describe('ASF picture order', () => {
  for (const kind of ['extended', 'metadata', 'library'] as const) {
    for (const source of ['buffer', 'stream', 'blob']) {
      it(`preserves ${kind} picture order when MIME detection is asynchronous (${source})`, async () => {
        // Type Other exercises selectCover's first-picture fallback, without front/back priorities.
        const data = asfPictures([picture('', 'First', 0), picture('image/gif', 'Second', 0)], kind);
        const metadata =
          source === 'buffer'
            ? await mm.parseBuffer(data, 'audio/x-ms-wma')
            : source === 'blob'
              ? await mm.parseBlob(new Blob([Uint8Array.from(data)], { type: 'audio/x-ms-wma' }))
              : await mm.parseStream(Readable.from([data], { objectMode: false }), 'audio/x-ms-wma');
        const native = metadata.native.asf.map(tag => (tag.value as mm.IPicture).description);
        assert.deepEqual(native, ['First', 'Second']);
        assert.deepEqual(
          metadata.common.picture!.map(value => value.description),
          native
        );
        assert.strictEqual(mm.selectCover(metadata.common.picture)!.description, 'First');
        assert.deepEqual(
          metadata.common.picture!.map(value => value.format),
          ['image/gif', 'image/gif']
        );
      });
    }
  }
});
