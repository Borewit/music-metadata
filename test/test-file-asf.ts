import { assert, expect } from 'chai';
import { Readable } from 'node:stream';
import { fromBuffer } from 'strtok3';
import * as mm from '../lib/index.js';
import path from 'node:path';
import AsfGuid from '../lib/asf/AsfGuid.js';
import { getParserForAttr } from '../lib/asf/AsfUtil.js';
import { AsfContentParseError, DataType, HeaderExtensionObject, HeaderObjectToken, readCodecEntries, TopLevelHeaderObjectToken } from '../lib/asf/AsfObject.js';
import { Parsers } from './metadata-parsers.js';

import { samplePath } from './util.js';
import type { IPicture } from '../lib/index.js';

const asfFilePath = path.join(samplePath, 'asf');
const asfMimeType = { mimeType: 'audio/ms-wma' };

function writeObjectHeader(data: Uint8Array, offset: number, objectId: AsfGuid, objectSize: number): void {
  data.set(objectId.toBin(), offset);
  new DataView(data.buffer).setBigUint64(offset + 16, BigInt(objectSize), true);
}

function writeTopLevelHeader(data: Uint8Array, objectSize: number, childCount: number): void {
  writeObjectHeader(data, 0, AsfGuid.HeaderObject, objectSize);
  new DataView(data.buffer).setUint32(24, childCount, true);
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
  const data = createSingleObjectAsf(
    HeaderExtensionObject.guid,
    extensionObjectSize,
    extensionObjectSize
  );
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

  describe('GUID', () => {
    it('should construct GUID from string', () => {

      const Header_GUID = Uint8Array.from([
        0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11,
        0xA6, 0xD9, 0x00, 0xAA, 0x00, 0x62, 0xCE, 0x6C
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

    const tests: { raw: number[], expected: number, description: string }[] = [
      {
        raw: [0xFF, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        expected: 0xFF,
        description: '8-bit'
      },
      {
        raw: [0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
        expected: 0xFFFF,
        description: '16-bit'
      },
      {
        raw: [0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00],
        expected: 0xFFFFFFFF,
        description: '32-bit'
      },
      {
        raw: [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00],
        expected: 0xFFFFFFFFFF,
        description: '40-bit'
      },
      {
        raw: [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x00],
        expected: 0xFFFFFFFFFFFF,
        description: '48-bit'
      },
      {
        raw: [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x0F, 0x00],
        expected: 0xFFFFFFFFFFFFF,
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
      assert.strictEqual(common.title, 'Don\'t Bring Me Down', 'common.title');
      assert.deepEqual(common.artist, 'Electric Light Orchestra', 'common.artist');
      assert.deepEqual(common.albumartist, 'Electric Light Orchestra', 'common.albumartist');
      assert.strictEqual(common.album, 'Discovery', 'common.album');
      assert.strictEqual(common.year, 2001, 'common.year');
      assert.deepEqual(common.track, {no: 9, of: null}, 'common.track 9/0');
      assert.deepEqual(common.disk, {no: null, of: null}, 'common.disk 0/0');
      assert.deepEqual(common.genre, ['Rock'], 'common.genre');
    }

    function checkNative(native: mm.INativeTagDict) {

      assert.deepEqual(native['WM/AlbumTitle'], ['Discovery'], 'native: WM/AlbumTitle');
      assert.deepEqual(native['WM/BeatsPerMinute'], [117], 'native: WM/BeatsPerMinute');
      assert.deepEqual(native.REPLAYGAIN_TRACK_GAIN, ['-4.7 dB'], 'native: REPLAYGAIN_TRACK_GAIN');
    }

    describe('should decode an ASF audio file (.wma)', () => {

      Parsers.forEach(parser => {
        it(parser.description, async function(){
          const {format, common, native} = await parser.parse(() => this.skip(), path.join(asfFilePath, 'asf.wma'), 'audio/x-ms-wma');
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
        it(parser.description, async function(){
          const filePath = path.join(asfFilePath, 'issue_57.wma');
          const {native} = await parser.parse(() => this.skip(), filePath, 'audio/x-ms-wma');
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

      const {format, common, native} = await mm.parseFile(filePath);

      assert.strictEqual(format.container, 'ASF/audio', 'format.container');
      assert.strictEqual(format.codec, 'Windows Media Audio 9', 'format.codec');
      assert.approximately(format.duration!, 14.466, 1 / 10000, 'format.duration');
      assert.approximately(format.bitrate!, 128639, 1, 'format.bitrate');
      assert.isTrue(format.hasAudio, 'format.hasAudio');
      assert.isFalse(format.hasVideo, 'format.hasVideo');  });

  });

  describe('security hardening', () => {

    it('rejects a top-level header smaller than 30 bytes', () => {
      const header = new Uint8Array(TopLevelHeaderObjectToken.len);
      header.set(AsfGuid.HeaderObject.toBin());
      new DataView(header.buffer).setBigUint64(16, 29n, true);

      expect(() => TopLevelHeaderObjectToken.get(header, 0))
        .to.throw(AsfContentParseError, /Invalid ASF top-level header object size: 29/);
    });

    it('rejects object sizes that cannot be represented safely', () => {
      const header = new Uint8Array(HeaderObjectToken.len);
      header.set(AsfGuid.PaddingObject.toBin());
      new DataView(header.buffer).setBigUint64(16, BigInt(Number.MAX_SAFE_INTEGER) + 1n, true);

      expect(() => HeaderObjectToken.get(header, 0))
        .to.throw(AsfContentParseError, /Invalid ASF header object size: 9007199254740992/);
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

      await expect(mm.parseFile(filePath)).to.be.rejectedWith(
        AsfContentParseError,
        /Invalid ASF header object size/
      );
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
