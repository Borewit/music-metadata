import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { assert, expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { fromBuffer } from 'strtok3';
import AsfGuid from '../lib/asf/AsfGuid.js';
import {
  AsfContentParseError,
  DataType,
  ExtendedStreamPropertiesObjectState,
  FilePropertiesObject,
  HeaderExtensionObject,
  HeaderObjectToken,
  readCodecEntries,
  StreamPropertiesObject,
  TopLevelHeaderObjectToken
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
    view.setBigUint64(0, 10000000n, true);
    view.setBigUint64(8, 30000000n, true);
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

describe('Parse ASF', () => {
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
          const { native } = await parser.parse(() => this.skip(), filePath, 'audio/x-ms-wma');
          const asf = mm.orderTags(native.asf);
          assert.exists(asf['WM/Picture'][0], 'ASF WM/Picture should be set');
          const nativePicture = asf['WM/Picture'][0];
          assert.exists((nativePicture as IPicture).data);
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

    it('caps retained Codec List metadata for streams with an unknown size', async () => {
      const payloadSize = 16 * 1024 * 1024 + 1;
      const objectSize = 24 + payloadSize;
      const stream = createUnknownSizeStream(createSingleObjectAsf(AsfGuid.CodecListObject, objectSize));

      await expect(mm.parseStream(stream, asfMimeType)).to.be.rejectedWith(
        AsfContentParseError,
        /Codec List Object payload size 16777217 exceeds allocation limit 16777216/
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
      await expect(mm.parseStream(stream, asfMimeType)).to.be.rejectedWith(
        AsfContentParseError,
        /File Properties Object payload size 16777217 exceeds allocation limit 16777216/
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
      await expect(mm.parseStream(stream, asfMimeType)).to.be.rejectedWith(
        AsfContentParseError,
        /Metadata Object payload size 16777217 exceeds allocation limit 16777216/
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
});
