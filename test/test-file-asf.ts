import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { assert, expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { fromBuffer } from 'strtok3';
import AsfGuid from '../lib/asf/AsfGuid.js';
import {
  AsfContentParseError,
  ContentDescriptionObjectState,
  DataType,
  ExtendedContentDescriptionObjectState,
  ExtendedStreamPropertiesObjectState,
  FilePropertiesObject,
  HeaderExtensionObject,
  HeaderObjectToken,
  MetadataLibraryObjectState,
  MetadataObjectState,
  readCodecEntries,
  StreamPropertiesObject,
  TopLevelHeaderObjectToken,
  WmPictureToken
} from '../lib/asf/AsfObject.js';
import { AsfTagMapper } from '../lib/asf/AsfTagMapper.js';
import { getParserForAttr } from '../lib/asf/AsfUtil.js';
import type { IWarningCollector } from '../lib/common/MetadataCollector.js';
import type { IPicture } from '../lib/index.js';
import * as mm from '../lib/index.js';
import { TrackType } from '../lib/type.js';
import { Parsers } from './metadata-parsers.js';
import { samplePath } from './util.js';

use(chaiAsPromised);

const asfFilePath = path.join(samplePath, 'asf');
const asfMimeType = { mimeType: 'audio/ms-wma' };

function writeObjectHeader(data: Uint8Array, offset: number, objectId: AsfGuid, objectSize: number): void {
  data.set(objectId.toBin(), offset);
  new DataView(data.buffer, data.byteOffset, data.byteLength).setBigUint64(offset + 16, BigInt(objectSize), true);
}

function writeTopLevelHeader(data: Uint8Array, objectSize: number, childCount: number): void {
  writeObjectHeader(data, 0, AsfGuid.HeaderObject, objectSize);
  new DataView(data.buffer, data.byteOffset, data.byteLength).setUint32(24, childCount, true);
}

function createSingleObjectAsf(
  objectId: AsfGuid,
  objectSize: number,
  actualObjectSize = HeaderObjectToken.len,
  topLevelPayloadSize = objectSize
): Uint8Array {
  const data = new Uint8Array(TopLevelHeaderObjectToken.len + actualObjectSize);
  writeTopLevelHeader(data, TopLevelHeaderObjectToken.len + topLevelPayloadSize, 1);
  writeObjectHeader(data, TopLevelHeaderObjectToken.len, objectId, objectSize);
  return data;
}

function createHeaderExtensionAsf(extensionDataSize: number, enclosingDataSize: number): Uint8Array {
  const extensionHeaderSize = new HeaderExtensionObject().len;
  const extensionObjectSize = HeaderObjectToken.len + extensionHeaderSize + enclosingDataSize;
  const data = createSingleObjectAsf(HeaderExtensionObject.guid, extensionObjectSize, extensionObjectSize);
  new DataView(data.buffer).setUint32(
    TopLevelHeaderObjectToken.len + HeaderObjectToken.len + 18,
    extensionDataSize,
    true
  );
  return data;
}

function createUnknownSizeStream(data: Uint8Array): Readable {
  return Readable.from([Buffer.from(data)], { objectMode: false });
}

describe('Parse ASF', () => {
  describe('metadata object boundaries', () => {
    for (const [Token, extended] of [
      [ExtendedContentDescriptionObjectState, true],
      [MetadataObjectState, false],
      [MetadataLibraryObjectState, false]
    ] as const) {
      const tags = [
        { id: 'Title', value: 'Chapter α' },
        { id: 'Author', value: 'Writer' }
      ];
      function payload(records = tags): Buffer {
        const count = Buffer.alloc(2);
        count.writeUInt16LE(records.length);
        const parts = records.map(({ id, value }) => {
          const name = Buffer.from(`${id}\0`, 'utf16le');
          const text = Buffer.from(`${value}\0`, 'utf16le');
          if (extended) {
            const nameLength = Buffer.alloc(2);
            nameLength.writeUInt16LE(name.length);
            const fields = Buffer.alloc(4);
            fields.writeUInt16LE(text.length, 2);
            return Buffer.concat([nameLength, name, fields, text]);
          }
          const fields = Buffer.alloc(12);
          fields.writeUInt16LE(name.length, 4);
          fields.writeUInt32LE(text.length, 8);
          return Buffer.concat([fields, name, text]);
        });
        return Buffer.concat([count, ...parts]);
      }
      function token(length: number) {
        return new Token({ objectId: Token.guid, objectSize: HeaderObjectToken.len + length });
      }
      function decode(body: Uint8Array, viewOffset = 0, tokenOffset = 0) {
        const data = new Uint8Array(viewOffset + tokenOffset + body.length + 16).fill(0xa5);
        data.set(body, viewOffset + tokenOffset);
        return token(body.length).get(data.subarray(viewOffset), tokenOffset);
      }
      describe(Token.name, () => {
        for (const viewOffset of [0, 7]) {
          for (const tokenOffset of [0, 5]) {
            it(`reads ordered Unicode fields at view ${viewOffset}, token ${tokenOffset}`, () => {
              assert.deepEqual(decode(payload(), viewOffset, tokenOffset), tags);
            });
          }
        }
        for (const length of [0, 1]) {
          it(`rejects a ${length}-byte count header despite following bytes`, () => {
            assert.throws(() => decode(new Uint8Array(length)), AsfContentParseError, /Truncated|exceeds/);
          });
        }
        it('rejects a partial record header', () => {
          assert.throws(
            () => decode(payload().subarray(0, extended ? 7 : 13)),
            AsfContentParseError,
            /Truncated|exceeds/
          );
        });
        it('rejects a missing later record header after a complete record', () => {
          const body = payload([{ id: 'Title', value: 'A complete record with enough bytes for the count check' }]);
          body.writeUInt16LE(2);
          assert.throws(() => decode(body), AsfContentParseError, 'Truncated');
        });
        it('rejects a name extending beyond the token', () => {
          const body = payload([{ id: 'Title', value: 'Example' }]);
          body.writeUInt16LE(0xffff, extended ? 2 : 6);
          assert.throws(() => decode(body), AsfContentParseError, /Truncated|exceeds/);
        });
        it('rejects a value extending into following bytes', () => {
          const body = payload([{ id: 'Title', value: 'Example' }]);
          if (extended) {
            body.writeUInt16LE(18, 6 + Buffer.byteLength('Title\0', 'utf16le'));
          } else {
            body.writeUInt32LE(18, 10);
          }
          assert.throws(() => decode(body), AsfContentParseError, /Truncated|exceeds/);
        });
        it('rejects an impossible record count', () => {
          const body = payload();
          body.writeUInt16LE(0xffff);
          assert.throws(() => decode(body), AsfContentParseError, /Truncated|exceeds/);
        });
        it('rejects a token extending beyond the supplied view', () => {
          const body = Uint8Array.from(payload());
          assert.throws(
            () => token(body.length).get(body.subarray(0, body.length - 1), 0),
            AsfContentParseError,
            /Truncated|exceeds/
          );
        });
        it('accepts no records', () => {
          assert.deepEqual(decode(Buffer.alloc(2)), []);
        });
        it('retains rejection of unsupported value types', () => {
          const body = payload([{ id: 'Title', value: 'Example' }]);
          body.writeUInt16LE(0xffff, extended ? 4 + Buffer.byteLength('Title\0', 'utf16le') : 8);
          assert.throws(() => decode(body), AsfContentParseError, 'unexpected value headerType');
        });
        for (const [type, length, expected] of [
          [DataType.Bool, 2, true],
          [DataType.Word, 2, 1],
          [DataType.DWord, 4, 1],
          [DataType.QWord, 8, 1n]
        ] as const) {
          function numericBody(valueLength: number): Buffer {
            const body = payload([{ id: 'Count', value: 'Example' }]);
            const nameLength = Buffer.byteLength('Count\0', 'utf16le');
            const typeOffset = extended ? 4 + nameLength : 8;
            const lengthOffset = extended ? typeOffset + 2 : 10;
            const valueOffset = extended ? lengthOffset + 2 : 14 + nameLength;
            body.writeUInt16LE(type, typeOffset);
            if (extended) {
              body.writeUInt16LE(valueLength, lengthOffset);
            } else {
              body.writeUInt32LE(valueLength, lengthOffset);
            }
            const value = Buffer.alloc(valueLength);
            if (valueLength > 0) {
              value[0] = 1;
            }
            return Buffer.concat([body.subarray(0, valueOffset), value]);
          }
          it(`rejects a truncated numeric value of type ${type} despite following bytes`, () => {
            assert.throws(() => decode(numericBody(length - 1)), AsfContentParseError, 'Truncated ASF attribute');
          });
          it(`preserves a complete numeric value of type ${type}`, () => {
            assert.deepEqual(decode(numericBody(length)), [{ id: 'Count', value: expected }]);
          });
        }
        for (const source of ['buffer', 'stream', 'blob'] as const) {
          function parse(body: Uint8Array): Promise<mm.IAudioMetadata> {
            const size = HeaderObjectToken.len + body.length;
            const data = extended
              ? createSingleObjectAsf(Token.guid, size, size)
              : createHeaderExtensionAsf(size, size);
            const objectOffset = extended
              ? TopLevelHeaderObjectToken.len
              : TopLevelHeaderObjectToken.len + HeaderObjectToken.len + new HeaderExtensionObject().len;
            writeObjectHeader(data, objectOffset, Token.guid, size);
            data.set(body, objectOffset + HeaderObjectToken.len);
            return source === 'buffer'
              ? mm.parseBuffer(data, asfMimeType)
              : source === 'stream'
                ? mm.parseStream(Readable.from([data], { objectMode: false }), asfMimeType)
                : mm.parseBlob(new Blob([Uint8Array.from(data)], { type: asfMimeType.mimeType }));
          }
          it(`preserves native fields through ${source}`, async () => {
            assert.deepEqual((await parse(payload())).native.asf, tags);
          });
          it(`rejects a truncated string through ${source}`, async () => {
            await expect(parse(payload().subarray(0, -2))).to.be.rejectedWith(AsfContentParseError);
          });
        }
      });
    }
    describe('Header Extension view', () => {
      for (const viewOffset of [0, 7]) {
        for (const tokenOffset of [0, 5]) {
          it(`reads fields at view ${viewOffset}, token ${tokenOffset}`, () => {
            const token = new HeaderExtensionObject();
            const data = new Uint8Array(viewOffset + tokenOffset + token.len);
            const offset = viewOffset + tokenOffset;
            const view = new DataView(data.buffer);
            view.setUint16(offset + 16, 6, true);
            view.setUint32(offset + 18, 1234, true);
            const result = token.get(data.subarray(viewOffset), tokenOffset);
            assert.strictEqual(result.reserved2, 6);
            assert.strictEqual(result.extensionDataSize, 1234);
          });
        }
      }
      it('rejects a short header with an ASF content error', () => {
        const token = new HeaderExtensionObject();
        assert.throws(() => token.get(new Uint8Array(token.len - 1), 0), AsfContentParseError);
      });
    });
  });

  describe('Content Description boundaries', () => {
    const values = ['Chapter α', 'Artist', 'Copyright', 'Description', 'Rating'];
    function payload(): Buffer {
      const strings = values.map(value => Buffer.from(`${value}\0`, 'utf16le'));
      const lengths = Buffer.alloc(10);
      strings.forEach((value, index) => {
        lengths.writeUInt16LE(value.length, index * 2);
      });
      return Buffer.concat([lengths, ...strings]);
    }

    function token(length: number): ContentDescriptionObjectState {
      return new ContentDescriptionObjectState({
        objectId: ContentDescriptionObjectState.guid,
        objectSize: HeaderObjectToken.len + length
      });
    }

    const expected = ['Title', 'Author', 'Copyright', 'Description', 'Rating'].map((id, index) => ({
      id,
      value: values[index]
    }));

    for (const viewOffset of [0, 7]) {
      for (const tokenOffset of [0, 5]) {
        it(`decodes fields at view offset ${viewOffset} and token offset ${tokenOffset}`, () => {
          const body = payload();
          const backing = Buffer.alloc(viewOffset + tokenOffset + body.length + 20, 0xa5);
          backing.set(body, viewOffset + tokenOffset);
          const view = backing.subarray(viewOffset);
          assert.deepEqual(token(body.length).get(view, tokenOffset), expected);
        });
      }
    }

    for (const length of [0, 1, 9]) {
      it(`rejects a ${length}-byte fixed header without reading surrounding bytes`, () => {
        assert.throws(
          () => token(length).get(Buffer.alloc(32), 3),
          AsfContentParseError,
          'Truncated Content Description Object'
        );
      });
    }

    it('rejects a token extending beyond the supplied view', () => {
      const body = payload();
      assert.throws(
        () => token(body.length).get(body.subarray(0, body.length - 1), 0),
        AsfContentParseError,
        'Truncated Content Description Object'
      );
    });

    for (const field of [0, 4]) {
      it(`rejects field ${field} extending past the token despite following bytes`, () => {
        const body = payload();
        body.writeUInt16LE(body.readUInt16LE(field * 2) + 2, field * 2);
        const data = Buffer.concat([body, Buffer.from([0x58, 0])]);
        assert.throws(
          () => token(body.length).get(data, 0),
          AsfContentParseError,
          'exceeds Content Description payload'
        );
      });
    }

    for (const source of ['buffer', 'stream', 'blob'] as const) {
      async function parseBody(body: Uint8Array): Promise<mm.IAudioMetadata> {
        const data = createSingleObjectAsf(
          ContentDescriptionObjectState.guid,
          HeaderObjectToken.len + body.length,
          HeaderObjectToken.len + body.length
        );
        data.set(body, TopLevelHeaderObjectToken.len + HeaderObjectToken.len);
        const padded = Buffer.concat([Buffer.alloc(7, 0xa5), data, Buffer.alloc(7, 0xa5)]);
        const input = padded.subarray(7, 7 + data.length);
        return source === 'buffer'
          ? mm.parseBuffer(input, asfMimeType)
          : source === 'stream'
            ? mm.parseStream(Readable.from([input], { objectMode: false }), asfMimeType)
            : mm.parseBlob(new Blob([input], { type: asfMimeType.mimeType }));
      }

      it(`preserves native fields through the public ${source} parser`, async () => {
        const metadata = await parseBody(payload());
        assert.deepEqual(metadata.native.asf, expected);
        assert.strictEqual(metadata.common.title, values[0]);
        assert.strictEqual(metadata.common.artist, values[1]);
      });

      it(`rejects a short fixed header through the public ${source} parser`, async () => {
        await expect(parseBody(Buffer.alloc(9))).to.be.rejectedWith(
          AsfContentParseError,
          'Truncated Content Description Object'
        );
      });

      it(`rejects an overlong string through the public ${source} parser`, async () => {
        await expect(parseBody(payload().subarray(0, -2))).to.be.rejectedWith(
          AsfContentParseError,
          'exceeds Content Description payload'
        );
      });
    }
  });

  describe('ASF File Properties flags', () => {
    for (const [flags, broadcast, seekable] of [
      [0, false, false],
      [1, true, false],
      [2, false, true],
      [3, true, true],
      [0x80000000, false, false],
      [0x80000003, true, true]
    ] as const) {
      it(`reads broadcast and seekable flags from DWORD 0x${flags.toString(16)}`, () => {
        const data = new Uint8Array(85);
        new DataView(data.buffer).setUint32(5 + 64, flags, true);
        const token = new FilePropertiesObject({ objectId: AsfGuid.FilePropertiesObject, objectSize: 104 });
        assert.deepEqual(token.get(data, 5).flags, { broadcast, seekable });
      });
    }
  });

  describe('ASF track properties', () => {
    function asf(...objects: Uint8Array[]): Uint8Array {
      const data = new Uint8Array(
        TopLevelHeaderObjectToken.len + objects.reduce((sum, object) => sum + object.length, 0)
      );
      writeTopLevelHeader(data, data.length, objects.length);
      let offset = TopLevelHeaderObjectToken.len;
      for (const object of objects) {
        data.set(object, offset);
        offset += object.length;
      }
      return data;
    }

    function object(guid: AsfGuid, payload: Uint8Array): Uint8Array {
      const result = new Uint8Array(HeaderObjectToken.len + payload.length);
      writeObjectHeader(result, 0, guid, result.length);
      result.set(payload, HeaderObjectToken.len);
      return result;
    }

    function audioStream(id: number): Uint8Array {
      const payload = new Uint8Array(54 + 18);
      const view = new DataView(payload.buffer);
      payload.set(AsfGuid.AudioMedia.toBin());
      payload.set(AsfGuid.ErrorCorrectionObject.toBin(), 16);
      view.setUint32(40, 18, true);
      view.setUint16(48, id, true);
      view.setUint16(54, 0x0161, true);
      view.setUint16(56, 2, true);
      view.setUint32(58, 44100, true);
      view.setUint32(62, 16000, true);
      view.setUint16(68, 16, true);
      return object(AsfGuid.StreamPropertiesObject, payload);
    }

    function nestedStream(stream: Uint8Array, streamNumber = 2): Uint8Array {
      const name = Buffer.from('Alternate audio', 'utf16le');
      const header = new Uint8Array(64 + 4 + name.length + 22 + 3);
      const view = new DataView(header.buffer);
      view.setUint16(48, streamNumber, true);
      view.setUint16(60, 1, true);
      view.setUint16(62, 1, true);
      view.setUint16(66, name.length, true);
      header.set(name, 68);
      view.setUint32(68 + name.length + 18, 3, true);
      const extended = object(AsfGuid.ExtendedStreamPropertiesObject, Buffer.concat([header, stream]));
      return extension(extended);
    }

    function videoStream(id: number): Uint8Array {
      const payload = new Uint8Array(54 + 51);
      const view = new DataView(payload.buffer);
      payload.set(AsfGuid.VideoMedia.toBin());
      view.setUint32(40, 51, true);
      view.setUint16(48, id, true);
      view.setUint32(54, 1920, true);
      view.setUint32(58, 1080, true);
      view.setUint16(63, 40, true);
      view.setUint32(65, 40, true);
      payload.set(new TextEncoder().encode('WMV3'), 81);
      return object(AsfGuid.StreamPropertiesObject, payload);
    }

    function extendedStream(id: number, embedded?: Uint8Array): Uint8Array {
      const name = Buffer.from('Main video', 'utf16le');
      const payload = new Uint8Array(64 + 4 + name.length + 22 + 3 + (embedded?.length ?? 0));
      const view = new DataView(payload.buffer);
      view.setBigUint64(0, 1000n, true);
      view.setBigUint64(8, 3000n, true);
      view.setUint32(16, 2000000, true);
      view.setUint16(48, id, true);
      view.setBigUint64(52, 400000n, true);
      view.setUint16(60, 1, true);
      view.setUint16(62, 1, true);
      view.setUint16(66, name.length, true);
      payload.set(name, 68);
      view.setUint32(68 + name.length + 18, 3, true);
      if (embedded) {
        payload.set(embedded, 68 + name.length + 25);
      }
      return object(AsfGuid.ExtendedStreamPropertiesObject, payload);
    }

    function extension(child: Uint8Array): Uint8Array {
      const header = new Uint8Array(22);
      new DataView(header.buffer).setUint32(18, child.length, true);
      return object(AsfGuid.HeaderExtensionObject, Buffer.concat([header, child]));
    }

    function codecList(): Uint8Array {
      // One audio codec shared by both streams, plus an unused video codec.
      function codec(type: number, name: string, information: Uint8Array): Uint8Array {
        const nameData = Buffer.from(`${name}\0`, 'utf16le');
        const payload = new Uint8Array(8 + nameData.length + information.length);
        const view = new DataView(payload.buffer);
        view.setUint16(0, type, true);
        view.setUint16(2, nameData.length / 2, true);
        payload.set(nameData, 4);
        view.setUint16(6 + nameData.length, information.length, true);
        payload.set(information, 8 + nameData.length);
        return payload;
      }
      const header = new Uint8Array(20);
      new DataView(header.buffer).setUint32(16, 2, true);
      return object(
        AsfGuid.CodecListObject,
        Buffer.concat([
          header,
          codec(2, 'WMA', Uint8Array.from([0x61, 0x01])),
          codec(1, 'Unused video', new TextEncoder().encode('MP43'))
        ])
      );
    }

    it('reads the packed ASF video format at a nonzero token offset', () => {
      const offset = 5;
      const data = new Uint8Array(offset + 54 + 51);
      const view = new DataView(data.buffer);
      data.set(AsfGuid.VideoMedia.toBin(), offset);
      data.set(AsfGuid.ErrorCorrectionObject.toBin(), offset + 16);
      view.setUint32(offset + 40, 51, true);
      view.setUint16(offset + 48, 2, true);
      const video = offset + 54;
      view.setUint32(video, 160, true);
      view.setUint32(video + 4, 120, true);
      view.setUint8(video + 8, 2);
      view.setUint16(video + 9, 40, true);
      view.setUint32(video + 11, 40, true);
      view.setInt32(video + 15, 160, true);
      view.setInt32(video + 19, 120, true);
      view.setUint16(video + 23, 1, true);
      view.setUint16(video + 25, 24, true);
      data.set(new TextEncoder().encode('MP43'), video + 27);
      const token = new StreamPropertiesObject({ objectId: AsfGuid.StreamPropertiesObject, objectSize: 129 });
      assert.include(token.get(data, offset), { streamType: 'video', streamNumber: 2, codecId: 'MP43' });
      assert.deepEqual(token.get(data, offset).video, { pixelWidth: 160, pixelHeight: 120 });
      view.setUint16(video + 9, 41, true);
      assert.throws(() => token.get(data, offset), AsfContentParseError, 'video format data exceeds stream data');
    });

    it('reports the elephant video codec from Stream Properties', async () => {
      const data = await readFile(path.join(asfFilePath, 'elephant.asf'));
      for (const streamInput of [false, true]) {
        const { format } = streamInput
          ? await mm.parseStream(createUnknownSizeStream(data), asfMimeType)
          : await mm.parseBuffer(data, asfMimeType);
        const video = format.trackInfo.find(track => track.type === mm.TrackType.video);
        assert.isDefined(video);
        assert.strictEqual(video.codecId, 'MP43');
        assert.deepEqual(video.video, { pixelWidth: 160, pixelHeight: 120 });
      }
    });

    it('reports audio properties without a codec list', async () => {
      const { format } = await mm.parseBuffer(asf(audioStream(7)), asfMimeType);
      assert.lengthOf(format.trackInfo, 1);
      assert.include(format.trackInfo[0], { id: 7, type: mm.TrackType.audio, codecId: '0x0161', bitrate: 128000 });
      assert.deepEqual(format.trackInfo[0].audio, { channels: 2, samplingFrequency: 44100, bitDepth: 16 });
      assert.isUndefined(format.trackInfo[0].codecName);
      assert.isTrue(format.hasAudio);
      assert.isFalse(format.hasVideo);
    });

    for (const codecFirst of [true, false]) {
      it(`reports actual streams rather than codecs (codec list first=${codecFirst})`, async () => {
        const streams = [audioStream(1), audioStream(2)];
        const objects = codecFirst ? [codecList(), ...streams] : [...streams, codecList()];
        const { format } = await mm.parseBuffer(asf(...objects), asfMimeType);
        assert.lengthOf(format.trackInfo, 2);
        assert.deepEqual(
          format.trackInfo.map(track => track.id),
          [1, 2]
        );
        for (const track of format.trackInfo) {
          assert.include(track, { type: mm.TrackType.audio, codecName: 'WMA' });
        }
        assert.isFalse(format.hasVideo, 'Unused codec does not imply a video track');
      });
    }

    it('omits unknown zero stream bitrate records', async () => {
      const payload = new Uint8Array(8);
      const view = new DataView(payload.buffer);
      view.setUint16(0, 1, true);
      view.setUint16(2, 1, true);
      const { format } = await mm.parseBuffer(
        asf(audioStream(1), object(AsfGuid.StreamBitratePropertiesObject, payload)),
        asfMimeType
      );
      assert.lengthOf(format.trackInfo, 1);
      assert.notProperty(format.trackInfo[0], 'bitrate');
    });

    it('uses stream bitrate records without copying the aggregate bitrate', async () => {
      const payload = new Uint8Array(14);
      const view = new DataView(payload.buffer);
      view.setUint16(0, 2, true);
      view.setUint16(2, 1, true);
      view.setUint32(4, 64000, true);
      view.setUint16(8, 2, true);
      view.setUint32(10, 96000, true);
      const { format } = await mm.parseBuffer(
        asf(object(AsfGuid.StreamBitratePropertiesObject, payload), audioStream(1), audioStream(2)),
        asfMimeType
      );
      assert.deepEqual(
        format.trackInfo.map(track => track.bitrate),
        [64000, 96000]
      );
    });

    for (const withCodecs of [false, true]) {
      for (const nestedFirst of [false, true]) {
        it(`retains standalone and nested streams (codecs=${withCodecs}, nested first=${nestedFirst})`, async () => {
          const objects = [audioStream(1), nestedStream(audioStream(2))];
          if (nestedFirst) {
            objects.reverse();
          }
          if (withCodecs) {
            objects.push(codecList());
          }
          const data = asf(...objects);
          for (const streamInput of [false, true]) {
            const { format } = streamInput
              ? await mm.parseStream(createUnknownSizeStream(data), asfMimeType)
              : await mm.parseBuffer(data, asfMimeType);
            assert.lengthOf(format.trackInfo, 2);
            assert.sameMembers(
              format.trackInfo.map(track => track.id),
              [1, 2]
            );
            for (const track of format.trackInfo) {
              assert.include(track, { type: mm.TrackType.audio, codecId: '0x0161', bitrate: 128000 });
              assert.deepEqual(track.audio, { channels: 2, samplingFrequency: 44100, bitDepth: 16 });
            }
            assert.isFalse(format.hasVideo, 'Unused video codec does not imply a video stream');
          }
        });
      }
    }

    it('normalizes reserved bits in extended stream numbers', () => {
      const data = nestedStream(audioStream(0x8002), 0xff82);
      const offset = HeaderObjectToken.len + new HeaderExtensionObject().len;
      const header = HeaderObjectToken.get(data, offset);
      const extended = new ExtendedStreamPropertiesObjectState(header).get(data, offset + HeaderObjectToken.len);
      assert.strictEqual(extended.streamNumber, 2);
      assert.strictEqual(extended.streamPropertiesObject.streamNumber, 2);
    });

    it('matches flagged nested streams to standalone properties and bitrate records', async () => {
      const payload = new Uint8Array(8);
      const view = new DataView(payload.buffer);
      view.setUint16(0, 1, true);
      view.setUint16(2, 0x8002, true);
      view.setUint32(4, 96000, true);
      const data = asf(
        audioStream(2),
        nestedStream(audioStream(0x8002), 0xff82),
        object(AsfGuid.StreamBitratePropertiesObject, payload),
        codecList()
      );
      for (const streamInput of [false, true]) {
        const { format } = streamInput
          ? await mm.parseStream(createUnknownSizeStream(data), asfMimeType)
          : await mm.parseBuffer(data, asfMimeType);
        assert.lengthOf(format.trackInfo, 1);
        assert.include(format.trackInfo[0], { id: 2, codecName: 'WMA', bitrate: 96000 });
        assert.isTrue(format.hasAudio);
        assert.isFalse(format.hasVideo);
      }
    });

    it('reports nested streams without relying on the codec list', async () => {
      const { format } = await mm.parseBuffer(asf(nestedStream(audioStream(2))), asfMimeType);
      assert.lengthOf(format.trackInfo, 1);
      assert.include(format.trackInfo[0], { id: 2, type: mm.TrackType.audio, codecId: '0x0161' });
      assert.isTrue(format.hasAudio);
    });

    it('does not duplicate a stream present in standalone and extended properties', async () => {
      const stream = audioStream(2);
      const { format } = await mm.parseBuffer(asf(stream, nestedStream(stream)), asfMimeType);
      assert.lengthOf(format.trackInfo, 1);
      assert.strictEqual(format.trackInfo[0].id, 2);
    });

    it('rejects truncated extended stream metadata', async () => {
      await expect(
        mm.parseBuffer(asf(extension(object(AsfGuid.ExtendedStreamPropertiesObject, new Uint8Array(63)))), asfMimeType)
      ).to.be.rejectedWith(AsfContentParseError, 'Truncated Extended');
    });

    it('rejects extended payload information that exceeds the object', async () => {
      const data = nestedStream(audioStream(2));
      const offset =
        HeaderObjectToken.len + 22 + HeaderObjectToken.len + 68 + Buffer.byteLength('Alternate audio', 'utf16le');
      new DataView(data.buffer).setUint32(offset + 18, 0xffffffff, true);
      await expect(mm.parseBuffer(asf(data), asfMimeType)).to.be.rejectedWith(
        AsfContentParseError,
        'exceeds object payload'
      );
    });

    for (const embedded of [true, false]) {
      it(`reads video timing and bitrate from extended properties (embedded=${embedded})`, async () => {
        const stream = videoStream(7);
        const data = asf(extension(extendedStream(7, embedded ? stream : undefined)), ...(embedded ? [] : [stream]));
        const { format } = await mm.parseBuffer(data, asfMimeType);
        assert.lengthOf(format.trackInfo, 1);
        assert.include(format.trackInfo[0], {
          id: 7,
          type: mm.TrackType.video,
          duration: 2,
          bitrate: 2000000,
          name: 'Main video'
        });
        assert.deepEqual(format.trackInfo[0].video, { pixelWidth: 1920, pixelHeight: 1080, frameRate: 25 });
        assert.strictEqual(format.containerDuration, 2);
        assert.strictEqual(format.overallBitrate, (data.length * 8) / 2);
      });
    }

    it('prefers explicit stream bitrate records over extended stream estimates', async () => {
      const payload = new Uint8Array(8);
      const view = new DataView(payload.buffer);
      view.setUint16(0, 1, true);
      view.setUint16(2, 7, true);
      view.setUint32(4, 1800000, true);
      const { format } = await mm.parseBuffer(
        asf(videoStream(7), extension(extendedStream(7)), object(AsfGuid.StreamBitratePropertiesObject, payload)),
        asfMimeType
      );
      assert.strictEqual(format.trackInfo[0].bitrate, 1800000);
    });

    it('does not duplicate an embedded stream also present in the header', async () => {
      const stream = videoStream(7);
      const { format } = await mm.parseBuffer(asf(stream, extension(extendedStream(7, stream))), asfMimeType);
      assert.lengthOf(format.trackInfo, 1);
    });

    it('leaves video timing unset without extended metadata', async () => {
      const { format } = await mm.parseBuffer(asf(videoStream(7)), asfMimeType);
      assert.isUndefined(format.trackInfo[0].duration);
      assert.isUndefined(format.trackInfo[0].bitrate);
      assert.isUndefined(format.overallBitrate);
    });

    it('rejects truncated extended stream fields', async () => {
      await expect(
        mm.parseBuffer(asf(extension(object(AsfGuid.ExtendedStreamPropertiesObject, new Uint8Array(63)))), asfMimeType)
      ).to.be.rejectedWith(AsfContentParseError, 'Truncated Extended');
      const child = extendedStream(7);
      new DataView(child.buffer).setUint16(24 + 66, 65535, true);
      await expect(mm.parseBuffer(asf(extension(child)), asfMimeType)).to.be.rejectedWith(
        AsfContentParseError,
        'exceeds object payload'
      );
    });

    it('rejects an embedded object that is not Stream Properties', async () => {
      const data = nestedStream(object(AsfGuid.PaddingObject, new Uint8Array()));
      await expect(mm.parseBuffer(asf(data), asfMimeType)).to.be.rejectedWith(AsfContentParseError, 'Invalid embedded');
    });

    it('rejects extended stream names that exceed their enclosing object', async () => {
      const data = nestedStream(audioStream(2));
      const view = new DataView(data.buffer);
      const extendedPayload = HeaderObjectToken.len + 22 + HeaderObjectToken.len;
      view.setUint16(extendedPayload + 66, 65535, true);
      await expect(mm.parseBuffer(asf(data), asfMimeType)).to.be.rejectedWith(
        AsfContentParseError,
        'exceeds object payload'
      );
    });

    it('does not use broadcasting file duration for overall bitrate', async () => {
      const payload = new Uint8Array(80);
      const view = new DataView(payload.buffer);
      view.setBigUint64(40, 100000000n, true);
      view.setUint32(64, 1, true);
      const { format } = await mm.parseBuffer(
        asf(object(AsfGuid.FilePropertiesObject, payload), videoStream(7)),
        asfMimeType
      );
      assert.isUndefined(format.duration);
      assert.isUndefined(format.containerDuration);
      assert.isUndefined(format.overallBitrate);
    });

    it('rejects stream data exceeding its enclosing object', async () => {
      const stream = audioStream(1);
      new DataView(stream.buffer).setUint32(HeaderObjectToken.len + 40, 1000, true);
      await expect(mm.parseBuffer(asf(stream), asfMimeType)).to.be.rejectedWith(
        AsfContentParseError,
        'stream data exceeds'
      );
    });

    it('rejects truncated stream properties', async () => {
      await expect(
        mm.parseBuffer(asf(object(AsfGuid.StreamPropertiesObject, new Uint8Array(53))), asfMimeType)
      ).to.be.rejectedWith(AsfContentParseError, 'Truncated Stream Properties');
    });

    it('rejects truncated stream bitrate records', async () => {
      const payload = new Uint8Array(2);
      new DataView(payload.buffer).setUint16(0, 1, true);
      await expect(
        mm.parseBuffer(asf(object(AsfGuid.StreamBitratePropertiesObject, payload)), asfMimeType)
      ).to.be.rejectedWith(AsfContentParseError, 'bitrate records exceed');
    });
  });

  describe('GUID', () => {
    it('should construct GUID from string', () => {
      const Header_GUID = Uint8Array.from([
        0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0xa6, 0xd9, 0x00, 0xaa, 0x00, 0x62, 0xce, 0x6c
      ]);

      assert.deepEqual(AsfGuid.HeaderObject.toBin(), Header_GUID);
    });

    it('should construct GUID from string', () => {
      const guid_data = new Uint8Array([48, 38, 178, 117, 142, 102, 207, 17, 166, 217, 0, 170, 0, 98, 206, 108]);
      assert.deepEqual(AsfGuid.fromBin(guid_data).str, '75B22630-668E-11CF-A6D9-00AA0062CE6C');
    });
  });

  it('reads the 32-bit header extension data size', () => {
    const extensionHeader = new Uint8Array(22);
    new DataView(extensionHeader.buffer).setUint32(18, 98547, true);

    expect(new HeaderExtensionObject().get(extensionHeader, 0).extensionDataSize).to.equal(98547);
  });

  /**
   * Trying Buffer.readUIntLE(0, 8)
   * Where 8 is 2 bytes longer then maximum allowed of 6
   */
  it('should be able to roughly decode a 64-bit QWord', () => {
    const tests: { raw: number[]; expected: number; description: string }[] = [
      {
        raw: [0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        expected: 0xff,
        description: '8-bit'
      },
      {
        raw: [0xff, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        expected: 0xffff,
        description: '16-bit'
      },
      {
        raw: [0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00],
        expected: 0xffffffff,
        description: '32-bit'
      },
      {
        raw: [0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00],
        expected: 0xffffffffff,
        description: '40-bit'
      },
      {
        raw: [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x00],
        expected: 0xffffffffffff,
        description: '48-bit'
      },
      {
        raw: [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x0f, 0x00],
        expected: 0xfffffffffffff,
        description: '52-bit'
      }
    ];

    tests.forEach(test => {
      const buf = Uint8Array.from(test.raw);
      assert.strictEqual(Number(getParserForAttr(DataType.QWord)(buf)), test.expected, test.description);
    });
  });

  describe('parse', () => {
    function checkFormat(format: mm.IFormat) {
      assert.strictEqual(format.container, 'ASF/audio', 'format.container');
      assert.strictEqual(format.codec, 'Windows Media Audio 9.1', 'format.codec');
      assert.approximately(format.duration!, 243.306, 1 / 10000, 'format.duration');
      assert.strictEqual(format.bitrate, 192639, 'format.bitrate');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasVideo');
    }

    function checkCommon(common: mm.ICommonTagsResult) {
      assert.strictEqual(common.title, "Don't Bring Me Down", 'common.title');
      assert.deepEqual(common.artist, 'Electric Light Orchestra', 'common.artist');
      assert.deepEqual(common.albumartist, 'Electric Light Orchestra', 'common.albumartist');
      assert.strictEqual(common.album, 'Discovery', 'common.album');
      assert.strictEqual(common.year, 2001, 'common.year');
      assert.deepEqual(common.track, { no: 9, of: null }, 'common.track 9/0');
      assert.deepEqual(common.disk, { no: null, of: null }, 'common.disk 0/0');
      assert.deepEqual(common.genre, ['Rock'], 'common.genre');
    }

    function checkNative(native: mm.INativeTagDict) {
      assert.deepEqual(native['WM/AlbumTitle'], ['Discovery'], 'native: WM/AlbumTitle');
      assert.deepEqual(native['WM/BeatsPerMinute'], [117], 'native: WM/BeatsPerMinute');
      assert.deepEqual(native.REPLAYGAIN_TRACK_GAIN, ['-4.7 dB'], 'native: REPLAYGAIN_TRACK_GAIN');
    }

    describe('should decode an ASF audio file (.wma)', () => {
      Parsers.forEach(parser => {
        it(parser.description, async function () {
          const { format, common, native } = await parser.parse(
            () => this.skip(),
            path.join(asfFilePath, 'asf.wma'),
            'audio/x-ms-wma'
          );
          checkFormat(format);
          checkCommon(common);
          assert.isDefined(native, 'metadata.native');
          assert.isDefined(native.asf, 'should include native ASF tags');
          checkNative(mm.orderTags(native.asf));
        });
      });
    });

    describe('should decode picture from', () => {
      Parsers.forEach(parser => {
        it(parser.description, async function () {
          const filePath = path.join(asfFilePath, 'issue_57.wma');
          const { native, common } = await parser.parse(() => this.skip(), filePath, 'audio/x-ms-wma');
          const asf = mm.orderTags(native.asf);
          assert.exists(asf['WM/Picture'][0], 'ASF WM/Picture should be set');
          for (const picture of [asf['WM/Picture'][0] as IPicture, common.picture![0]]) {
            assert.strictEqual(picture.format, 'image/jpeg');
            assert.strictEqual(picture.description, '');
            assert.lengthOf(picture.data, 40774);
            assert.deepEqual(Array.from(picture.data.subarray(0, 4)), [0xff, 0xd8, 0xff, 0xe0]);
          }
        });
      });
    });

    /**
     * Related issue: https://github.com/Borewit/music-metadata/issues/68
     */
    it('should be able to parse truncated .wma file', async () => {
      const filePath = path.join(asfFilePath, '13 Thirty Dirty Birds.wma');

      const { format } = await mm.parseFile(filePath);

      assert.strictEqual(format.container, 'ASF/audio', 'format.container');
      assert.strictEqual(format.codec, 'Windows Media Audio 9', 'format.codec');
      assert.approximately(format.duration!, 14.466, 1 / 10000, 'format.duration');
      assert.approximately(format.bitrate!, 128639, 1, 'format.bitrate');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasVideo');
    });

    /**
     * Related issue: https://github.com/Borewit/music-metadata/issues/2729
     */
    describe('WM/SharedUserRating decoding', () => {
      it('should normalize the from 0-99 scale to [0..1]', () => {
        assert.deepEqual(AsfTagMapper.toRating(75), { rating: 75 / 99 }, '4 stars');
        assert.deepEqual(AsfTagMapper.toRating(99), { rating: 1 }, '5 stars');
        assert.deepEqual(AsfTagMapper.toRating(1), { rating: 1 / 99 }, '1 star');
      });

      it('should tolerate a string-typed rating', () => {
        assert.deepEqual(AsfTagMapper.toRating('75'), { rating: 75 / 99 });
      });

      it('should omit the rating when unrated or invalid', () => {
        assert.deepEqual(AsfTagMapper.toRating(0), { rating: undefined });
        assert.deepEqual(AsfTagMapper.toRating('0'), { rating: undefined });
        assert.deepEqual(AsfTagMapper.toRating(Number.NaN), { rating: undefined });
      });

      it("from 'issue-2729.wma'", async () => {
        const filePath = path.join(asfFilePath, 'issue-2729.wma');
        const { native, common } = await mm.parseFile(filePath, { duration: false });
        assert.deepEqual(mm.orderTags(native.asf)['WM/SharedUserRating'], [75], 'native: WM/SharedUserRating');
        const sharedRating = common.rating?.find(r => r.source === undefined);
        if (sharedRating === undefined) {
          throw new Error('WM/SharedUserRating should be mapped');
        }
        assert.approximately(sharedRating.rating, 75 / 99, 1 / 1000, 'common rating normalized');
        assert.strictEqual(mm.ratingToStars(sharedRating.rating), 4, 'ratingToStars');
      });
    });
  });

  describe('rating', () => {
    const asfTagMapper = new AsfTagMapper();
    const warnings: IWarningCollector = { addWarning: () => undefined };

    it('maps the POPULARIMETER attribute to common.rating (issue #2730)', async () => {
      const filePath = path.join(asfFilePath, 'wma_rating.wma');
      const { common, native } = await mm.parseFile(filePath);
      const asf = mm.orderTags(native.asf);

      assert.deepEqual(asf.POPULARIMETER, ['hobbes|128|0'], 'native: POPULARIMETER');
      assert.deepEqual(asf['WM/SharedUserRating'], [75], 'native: WM/SharedUserRating');

      assert.isDefined(common.rating, 'common.rating should be defined');
      assert.deepEqual(
        common.rating?.find(r => r.source === 'hobbes'),
        { source: 'hobbes', rating: 0.5 },
        'POPULARIMETER should be mapped to a popm-style rating'
      );
      assert.isTrue(
        common.rating?.some(r => r.rating === 75 / 99) ?? false,
        'WM/SharedUserRating rating should still be mapped'
      );

      assert.strictEqual(mm.ratingToStars(common.rating?.[0].rating), 3, '128 -> 0.5 -> 3 stars');
    });

    it('maps POPULARIMETER to common.rating using the popm scale', () => {
      const tag = asfTagMapper.mapGenericTag({ id: 'POPULARIMETER', value: 'player@example.com|128|0' }, warnings);
      assert.deepEqual(tag, { id: 'rating', value: { source: 'player@example.com', rating: (128 - 1) / 254 } });
    });

    it('maps a POPULARIMETER rating of 255 to 1.0', () => {
      const tag = asfTagMapper.mapGenericTag({ id: 'POPULARIMETER', value: 'player@example.com|255|7' }, warnings);
      assert.deepEqual(tag, { id: 'rating', value: { source: 'player@example.com', rating: 1 } });
    });

    it('maps a POPULARIMETER rating of 1 to 0', () => {
      const tag = asfTagMapper.mapGenericTag({ id: 'POPULARIMETER', value: 'player@example.com|1|0' }, warnings);
      assert.deepEqual(tag, { id: 'rating', value: { source: 'player@example.com', rating: 0 } });
    });

    for (const rating of ['-1', '256', '999', '', 'abc', '128abc', '1.5']) {
      it(`registers a quality warning for invalid POPULARIMETER rating "${rating}"`, () => {
        const messages: string[] = [];
        const tag = asfTagMapper.mapGenericTag(
          { id: 'POPULARIMETER', value: `player@example.com|${rating}|0` },
          {
            addWarning: message => messages.push(message)
          }
        );
        assert.deepEqual(tag, { id: 'rating', value: { source: 'player@example.com', rating: undefined } });
        assert.deepEqual(messages, [`Invalid ASF POPULARIMETER rating: ${rating}`]);
      });
    }

    for (const rating of [0, 1, 128, 255]) {
      it(`does not register a quality warning for valid POPULARIMETER rating ${rating}`, () => {
        const messages: string[] = [];
        asfTagMapper.mapGenericTag(
          { id: 'POPULARIMETER', value: `player@example.com|${rating}|0` },
          {
            addWarning: message => messages.push(message)
          }
        );
        assert.isEmpty(messages);
      });
    }

    it('tolerates a POPULARIMETER value without the play counter', () => {
      const tag = asfTagMapper.mapGenericTag({ id: 'POPULARIMETER', value: 'player@example.com|128' }, warnings);
      assert.deepEqual(tag, { id: 'rating', value: { source: 'player@example.com', rating: (128 - 1) / 254 } });
    });

    it('guards against a non-numeric POPULARIMETER rating', () => {
      const messages: string[] = [];
      const unrated = asfTagMapper.mapGenericTag(
        { id: 'POPULARIMETER', value: 'player@example.com' },
        {
          addWarning: message => messages.push(message)
        }
      );
      assert.deepEqual(unrated, { id: 'rating', value: { source: 'player@example.com', rating: undefined } });
      assert.deepEqual(messages, ['Invalid ASF POPULARIMETER rating: undefined']);
    });

    it('treats a POPULARIMETER rating of 0 as unrated', () => {
      const unrated = asfTagMapper.mapGenericTag({ id: 'POPULARIMETER', value: 'player@example.com|0|0' }, warnings);
      assert.deepEqual(unrated, { id: 'rating', value: { source: 'player@example.com', rating: undefined } });
    });

    it('keeps mapping WM/SharedUserRating to common.rating', () => {
      const tag = asfTagMapper.mapGenericTag({ id: 'WM/SharedUserRating', value: 75 }, warnings);
      assert.deepEqual(tag, { id: 'rating', value: { rating: 75 / 99 } });
    });
  });

  describe('stream presence without a Codec List', () => {
    for (const { filename, hasAudio, hasVideo } of [
      { filename: 'asf-audio-no-codec-list.asf', hasAudio: true, hasVideo: false },
      { filename: 'asf-video-no-codec-list.asf', hasAudio: false, hasVideo: true },
      { filename: 'asf-audio-video-no-codec-list.asf', hasAudio: true, hasVideo: true },
      { filename: 'asf-video-audio-no-codec-list.asf', hasAudio: true, hasVideo: true }
    ]) {
      describe(filename, () => {
        for (const parser of Parsers) {
          it(parser.description, async function () {
            const { format } = await parser.parse(
              () => this.skip(),
              path.join(asfFilePath, filename),
              'audio/x-ms-asf'
            );
            assert.strictEqual(format.hasAudio, hasAudio, 'format.hasAudio');
            assert.strictEqual(format.hasVideo, hasVideo, 'format.hasVideo');
            assert.lengthOf(format.trackInfo, Number(hasAudio) + Number(hasVideo), 'Tracks from Stream Properties');
            for (const track of format.trackInfo) {
              assert.isUndefined(track.codecName, 'No Codec List entry supplies a codec name');
            }
            assert.isAbove(format.duration, 0, 'The fixture contains media');
          });
        }

        it('publishes absence only after reading the header', async () => {
          const data = await readFile(path.join(asfFilePath, filename));
          const header = TopLevelHeaderObjectToken.get(data, 0);
          const tokenizer = fromBuffer(data, { fileInfo: { mimeType: 'audio/x-ms-asf' } });
          const values = { hasAudio: [], hasVideo: [] };
          await mm.parseFromTokenizer(tokenizer, {
            observer({ tag }) {
              if (tag.type === 'format' && (tag.id === 'hasAudio' || tag.id === 'hasVideo')) {
                values[tag.id].push(tag.value);
                if (tag.value === false) {
                  assert.strictEqual(tokenizer.position, header.objectSize, 'Absence is known after the header scan');
                }
              }
            }
          });
          assert.deepEqual(values.hasAudio, [hasAudio]);
          assert.deepEqual(values.hasVideo, [hasVideo]);
        });
      });
    }
  });

  // PR #2785: read nested Stream Properties without notifying observers that present media is absent.
  describe('stream presence with nested Stream Properties', () => {
    async function nestedStreams(filename: string): Promise<Uint8Array> {
      const source = await readFile(path.join(asfFilePath, filename));
      const topLevel = TopLevelHeaderObjectToken.get(source, 0);
      const objects: Uint8Array[] = [];
      const extendedStreams: Uint8Array[] = [];
      const codecEntries: Uint8Array[] = [];
      for (let offset = TopLevelHeaderObjectToken.len; offset < topLevel.objectSize; ) {
        const header = HeaderObjectToken.get(source, offset);
        const object = source.subarray(offset, offset + header.objectSize);
        if (header.objectId.equals(AsfGuid.StreamPropertiesObject)) {
          // Extended Stream Properties has a 64-byte fixed payload, followed by
          // optional names/extensions (both counts are zero here) and the SPO.
          const extended = new Uint8Array(HeaderObjectToken.len + 64 + object.length);
          writeObjectHeader(extended, 0, AsfGuid.ExtendedStreamPropertiesObject, extended.length);
          const view = new DataView(extended.buffer);
          const streamNumber = source.readUInt16LE(offset + HeaderObjectToken.len + 48) & 0x7f;
          view.setUint16(HeaderObjectToken.len + 48, streamNumber, true);
          extended.set(object, HeaderObjectToken.len + 64);
          extendedStreams.push(extended);

          const { streamType } = new StreamPropertiesObject(header).get(source, offset + HeaderObjectToken.len);
          assert.include(['audio', 'video'], streamType);
          const codecName = Buffer.from(
            streamType === 'audio' ? 'Windows Media Audio' : 'Windows Media Video',
            'utf16le'
          );
          const entry = Buffer.alloc(8 + codecName.length);
          entry.writeUInt16LE(streamType === 'audio' ? 2 : 1, 0);
          entry.writeUInt16LE(codecName.length / 2, 2);
          entry.set(codecName, 4); // Empty description and codec information follow.
          codecEntries.push(entry);
        } else {
          objects.push(object);
        }
        offset += header.objectSize;
      }
      assert.isNotEmpty(extendedStreams, 'fixture has stream properties to move');
      const extensionIndex = objects.findIndex(object => AsfGuid.fromBin(object).equals(AsfGuid.HeaderExtensionObject));
      assert.isAtLeast(extensionIndex, 0, 'fixture has a Header Extension');
      const extension = objects[extensionIndex];
      const extensionData = Buffer.concat(extendedStreams);
      const nestedExtension = Buffer.concat([extension, extensionData]);
      writeObjectHeader(nestedExtension, 0, AsfGuid.HeaderExtensionObject, nestedExtension.length);
      nestedExtension.writeUInt32LE(nestedExtension.length - HeaderObjectToken.len - 22, HeaderObjectToken.len + 18);
      objects[extensionIndex] = nestedExtension;

      const codecList = Buffer.concat([Buffer.alloc(HeaderObjectToken.len + 20), ...codecEntries]);
      writeObjectHeader(codecList, 0, AsfGuid.CodecListObject, codecList.length);
      codecList.writeUInt32LE(codecEntries.length, HeaderObjectToken.len + 16);
      objects.push(codecList);
      const headerData = Buffer.concat([source.subarray(0, TopLevelHeaderObjectToken.len), ...objects]);
      writeTopLevelHeader(headerData, headerData.length, objects.length);
      const data = Buffer.concat([headerData, source.subarray(topLevel.objectSize)]);
      // Keep the original media payload and update the declared total file size.
      const filePropertiesOffset = TopLevelHeaderObjectToken.len;
      assert.isTrue(AsfGuid.fromBin(data, filePropertiesOffset).equals(AsfGuid.FilePropertiesObject));
      data.writeBigUInt64LE(BigInt(data.length), filePropertiesOffset + HeaderObjectToken.len + 16);
      return data;
    }

    for (const { filename, hasAudio, hasVideo, trackTypes } of [
      { filename: 'asf-audio-no-codec-list.asf', hasAudio: true, hasVideo: false, trackTypes: [TrackType.audio] },
      { filename: 'asf-video-no-codec-list.asf', hasAudio: false, hasVideo: true, trackTypes: [TrackType.video] },
      {
        filename: 'asf-audio-video-no-codec-list.asf',
        hasAudio: true,
        hasVideo: true,
        trackTypes: [TrackType.audio, TrackType.video]
      },
      {
        filename: 'asf-video-audio-no-codec-list.asf',
        hasAudio: true,
        hasVideo: true,
        trackTypes: [TrackType.video, TrackType.audio]
      }
    ]) {
      for (const streamInput of [false, true]) {
        it(`${filename}, ${streamInput ? 'stream' : 'buffer'}`, async () => {
          const data = await nestedStreams(filename);
          const values: { hasAudio: boolean[]; hasVideo: boolean[] } = { hasAudio: [], hasVideo: [] };
          const options: mm.IOptions = {
            observer({ tag }) {
              if (tag.type === 'format' && (tag.id === 'hasAudio' || tag.id === 'hasVideo')) {
                values[tag.id].push(tag.value as boolean);
              }
            }
          };
          const { format } = streamInput
            ? await mm.parseStream(createUnknownSizeStream(data), asfMimeType, options)
            : await mm.parseBuffer(data, asfMimeType, options);
          assert.deepEqual(
            format.trackInfo.map(track => track.type),
            trackTypes,
            'Stream types'
          );
          assert.strictEqual(format.hasAudio, hasAudio);
          assert.strictEqual(format.hasVideo, hasVideo);
          assert.deepEqual(values.hasAudio, [hasAudio], 'no false-negative audio notification');
          assert.deepEqual(values.hasVideo, [hasVideo], 'no false-negative video notification');
        });
      }
    }
  });

  describe('security hardening', () => {
    it('rejects a top-level header smaller than 30 bytes', () => {
      const header = new Uint8Array(TopLevelHeaderObjectToken.len);
      header.set(AsfGuid.HeaderObject.toBin());
      new DataView(header.buffer).setBigUint64(16, 29n, true);

      expect(() => TopLevelHeaderObjectToken.get(header, 0)).to.throw(
        AsfContentParseError,
        /Invalid ASF top-level header object size: 29/
      );
    });

    it('rejects object sizes that cannot be represented safely', () => {
      const header = new Uint8Array(HeaderObjectToken.len);
      header.set(AsfGuid.PaddingObject.toBin());
      new DataView(header.buffer).setBigUint64(16, BigInt(Number.MAX_SAFE_INTEGER) + 1n, true);

      expect(() => HeaderObjectToken.get(header, 0)).to.throw(
        AsfContentParseError,
        /Invalid ASF header object size: 9007199254740992/
      );
    });

    it('rejects a top-level header with no child objects', async () => {
      const header = new Uint8Array(TopLevelHeaderObjectToken.len);
      writeTopLevelHeader(header, TopLevelHeaderObjectToken.len, 0);

      await expect(mm.parseBuffer(header, asfMimeType)).to.be.rejectedWith(
        AsfContentParseError,
        /Unrealistic number of ASF header objects: 0/
      );
    });

    it('rejects child objects outside the top-level header boundary', async () => {
      const data = createSingleObjectAsf(
        AsfGuid.PaddingObject,
        HeaderObjectToken.len + 1,
        HeaderObjectToken.len,
        HeaderObjectToken.len
      );

      await expect(mm.parseBuffer(data, asfMimeType)).to.be.rejectedWith(
        AsfContentParseError,
        /ASF header object size 25 exceeds remaining header payload size 24/
      );
    });

    it('rejects unaccounted bytes in the top-level header payload', async () => {
      const data = createSingleObjectAsf(
        AsfGuid.PaddingObject,
        HeaderObjectToken.len,
        HeaderObjectToken.len,
        HeaderObjectToken.len + 1
      );

      await expect(mm.parseBuffer(data, asfMimeType)).to.be.rejectedWith(
        AsfContentParseError,
        /ASF header child objects leave 1 payload byte\(s\) unaccounted/
      );
    });

    it('translates truncated ignored stream payloads to an ASF parse error', async () => {
      const objectSize = HeaderObjectToken.len + 10;
      const actualObjectSize = HeaderObjectToken.len + 5;
      const stream = createUnknownSizeStream(
        createSingleObjectAsf(AsfGuid.PaddingObject, objectSize, actualObjectSize)
      );

      await expect(mm.parseStream(stream, asfMimeType)).to.be.rejectedWith(
        AsfContentParseError,
        /Unexpected end of ASF Padding Object/
      );
    });

    for (const { description, declaredSize, enclosingSize } of [
      { description: 'data outside the object boundary', declaredSize: 24, enclosingSize: 0 },
      { description: 'undeclared bytes inside the object boundary', declaredSize: 0, enclosingSize: 1 }
    ]) {
      it(`rejects Header Extension ${description}`, async () => {
        const data = createHeaderExtensionAsf(declaredSize, enclosingSize);

        await expect(mm.parseBuffer(data, asfMimeType)).to.be.rejectedWith(
          AsfContentParseError,
          new RegExp(`ASF extension data size ${declaredSize} does not match enclosing payload size ${enclosingSize}`)
        );
      });
    }

    it('bounds Codec List entries to their containing object', async () => {
      const codecListSize = 24 + 20;
      const paddingSize = 24;
      const data = new Uint8Array(TopLevelHeaderObjectToken.len + codecListSize + paddingSize);
      const codecListOffset = TopLevelHeaderObjectToken.len;
      const paddingOffset = codecListOffset + codecListSize;
      data.set(AsfGuid.HeaderObject.toBin());
      data.set(AsfGuid.CodecListObject.toBin(), codecListOffset);
      data.set(AsfGuid.PaddingObject.toBin(), paddingOffset);
      const view = new DataView(data.buffer);
      view.setBigUint64(16, BigInt(data.length), true);
      view.setUint32(24, 2, true);
      view.setBigUint64(codecListOffset + 16, BigInt(codecListSize), true);
      view.setUint16(codecListOffset + 24 + 16, 1, true);
      view.setBigUint64(paddingOffset + 16, BigInt(paddingSize), true);

      await expect(mm.parseBuffer(data, { mimeType: 'audio/ms-wma' })).to.be.rejectedWith(
        AsfContentParseError,
        /Invalid ASF Codec List Object/
      );
    });

    it('rejects a truncated large Codec List without allocating its declared size', async () => {
      const codecListHeader = new Uint8Array(20);

      await expect(readCodecEntries(fromBuffer(codecListHeader), 2 ** 32)).to.be.rejectedWith(
        AsfContentParseError,
        /Unexpected end of ASF Codec List Object/
      );
    });

    it('rejects Codec List entry counts exceeding the decoded-entry allocation limit', async () => {
      const codecListHeader = new Uint8Array(20);
      new DataView(codecListHeader.buffer).setUint16(16, 2, true);

      await expect(readCodecEntries(fromBuffer(codecListHeader), codecListHeader.length, 1)).to.be.rejectedWith(
        AsfContentParseError,
        'ASF Codec List entry count 2 exceeds entry limit 1'
      );
    });

    it('accepts Codec List objects whose total exceeds the per-buffer byte limit', async () => {
      const payloadSize = 140;
      const objectSize = HeaderObjectToken.len + payloadSize;
      const data = new Uint8Array(TopLevelHeaderObjectToken.len + objectSize * 2);
      writeTopLevelHeader(data, data.length, 2);
      for (let index = 0; index < 2; ++index) {
        writeObjectHeader(
          data,
          TopLevelHeaderObjectToken.len + index * objectSize,
          AsfGuid.CodecListObject,
          objectSize
        );
      }
      // Empty codec lists with legal trailing padding; neither payload exceeds 256 bytes.
      await mm.parseBuffer(data, asfMimeType, { maxMemoryAllocation: 256 });
    });

    it('caps retained Codec List metadata for streams with an unknown size', async () => {
      const payloadSize = 16 * 1024 * 1024 + 1;
      const objectSize = 24 + payloadSize;
      const stream = createUnknownSizeStream(createSingleObjectAsf(AsfGuid.CodecListObject, objectSize));

      await expect(mm.parseStream(stream, asfMimeType, { maxMemoryAllocation: 16 * 1024 * 1024 })).to.be.rejectedWith(
        AsfContentParseError,
        /Codec List Object: Metadata size 16777217 exceeds allocation limit 16777216/
      );
    });

    it('rejects object payloads larger than the known remaining input', async () => {
      const payloadSize = 16 * 1024 * 1024 + 1;
      const objectSize = 24 + payloadSize;
      const data = createSingleObjectAsf(AsfGuid.FilePropertiesObject, objectSize);

      await expect(mm.parseBuffer(data, asfMimeType)).to.be.rejectedWith(
        AsfContentParseError,
        /payload size 16777217 exceeds available input size 0/
      );
    });

    it('caps object allocations for streams with an unknown size', async () => {
      const payloadSize = 16 * 1024 * 1024 + 1;
      const objectSize = 24 + payloadSize;
      const stream = createUnknownSizeStream(createSingleObjectAsf(AsfGuid.FilePropertiesObject, objectSize));
      await expect(mm.parseStream(stream, asfMimeType, { maxMemoryAllocation: 16 * 1024 * 1024 })).to.be.rejectedWith(
        AsfContentParseError,
        /File Properties Object: Metadata size 16777217 exceeds allocation limit 16777216/
      );
    });

    it('caps nested object allocations for streams with an unknown size', async () => {
      const nestedPayloadSize = 16 * 1024 * 1024 + 1;
      const nestedObjectSize = 24 + nestedPayloadSize;
      const extensionObjectSize = 24 + 22 + nestedObjectSize;
      const extensionOffset = TopLevelHeaderObjectToken.len;
      const nestedOffset = extensionOffset + 24 + 22;
      const data = new Uint8Array(nestedOffset + 24);
      writeTopLevelHeader(data, TopLevelHeaderObjectToken.len + extensionObjectSize, 1);
      writeObjectHeader(data, extensionOffset, HeaderExtensionObject.guid, extensionObjectSize);
      writeObjectHeader(data, nestedOffset, AsfGuid.MetadataObject, nestedObjectSize);
      const view = new DataView(data.buffer);
      view.setUint32(extensionOffset + 24 + 18, nestedObjectSize, true);

      const stream = createUnknownSizeStream(data);
      await expect(mm.parseStream(stream, asfMimeType, { maxMemoryAllocation: 16 * 1024 * 1024 })).to.be.rejectedWith(
        AsfContentParseError,
        /Metadata Object: Metadata size 16777217 exceeds allocation limit 16777216/
      );
    });

    it('Avoid infinite loop CWE-835', async () => {
      const filePath = path.join(asfFilePath, 'CWE-835.wma');

      await expect(mm.parseFile(filePath)).to.be.rejectedWith(AsfContentParseError, /Invalid ASF header object size/);
    });

    it('numberOfObjectHeaders=4294967295', async () => {
      const filePath = path.join(asfFilePath, 'max-numberOfObjectHeaders.wma');

      await expect(mm.parseFile(filePath)).to.be.rejectedWith(
        AsfContentParseError,
        /Unrealistic number of ASF header objects/
      );
    });
  });

  describe('Pictures', () => {
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
  });
});
