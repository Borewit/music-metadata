import { assert } from 'chai';
import * as mm from '../lib/index.js';
import path from 'node:path';
import GUID from '../lib/asf/GUID.js';
import { AsfUtil } from '../lib/asf/AsfUtil.js';
import { DataType } from '../lib/asf/AsfObject.js';
import { Parsers } from './metadata-parsers.js';

import { samplePath } from './util.js';

describe('Parse ASF', () => {

  describe('GUID', () => {
    it('should construct GUID from string', () => {

      const Header_GUID = Buffer.from([
        0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11,
        0xA6, 0xD9, 0x00, 0xAA, 0x00, 0x62, 0xCE, 0x6C
      ]);

      assert.deepEqual(GUID.HeaderObject.toBin(), Header_GUID);
    });

    it('should construct GUID from string', () => {

      const guid_data = Buffer.from([48, 38, 178, 117, 142, 102, 207, 17, 166, 217, 0, 170, 0, 98, 206, 108]);
      assert.deepEqual(GUID.fromBin(guid_data).str, '75B22630-668E-11CF-A6D9-00AA0062CE6C');
    });
  });

  /**
   * Trying Buffer.readUIntLE(0, 8)
   * Where 8 is 2 bytes longer then maximum allowed of 6
   */
  it('should be able to roughly decode a 64-bit QWord', () => {

    const tests: { raw: string, expected: number, description: string }[] = [
      {
        raw: '\xFF\x00\x00\x00\x00\x00\x00\x00',
        expected: 0xFF,
        description: '8-bit'
      },
      {
        raw: '\xFF\xFF\x00\x00\x00\x00\x00\x00',
        expected: 0xFFFF,
        description: '16-bit'
      },
      {
        raw: '\xFF\xFF\xFF\xFF\x00\x00\x00\x00',
        expected: 0xFFFFFFFF,
        description: '32-bit'
      },
      {
        raw: '\xFF\xFF\xFF\xFF\xFF\x00\x00\x00',
        expected: 0xFFFFFFFFFF,
        description: '40-bit'
      },
      {
        raw: '\xFF\xFF\xFF\xFF\xFF\xFF\x00\x00',
        expected: 0xFFFFFFFFFFFF,
        description: '48-bit'
      },
      {
        raw: '\xFF\xFF\xFF\xFF\xFF\xFF\x0F\x00',
        expected: 0xFFFFFFFFFFFFF,
        description: '52-bit'
      }
    ];

    tests.forEach(test => {
      const buf = Buffer.from(test.raw, 'binary');
      assert.strictEqual(Number(AsfUtil.getParserForAttr(DataType.QWord)(buf)), test.expected, test.description);
    });

  });

  describe('parse', () => {

    const asfFilePath = path.join(samplePath, 'asf');

    function checkFormat(format) {
      assert.strictEqual(format.container, 'ASF/audio', 'format.container');
      assert.strictEqual(format.codec, 'Windows Media Audio 9.1', 'format.codec');
      assert.approximately(format.duration, 243.306, 1 / 10000, 'format.duration');
      assert.strictEqual(format.bitrate, 192639, 'format.bitrate');
    }

    function checkCommon(common) {
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
        it(parser.description, async () => {
          const metadata = await parser.initParser(path.join(asfFilePath, 'asf.wma'), 'audio/x-ms-wma');
          assert.isDefined(metadata, 'metadata');
          checkFormat(metadata.format);
          checkCommon(metadata.common);
          assert.isDefined(metadata.native, 'metadata.native');
          assert.isDefined(metadata.native.asf, 'should include native ASF tags');
          checkNative(mm.orderTags(metadata.native.asf));
        });
      });

    });

    describe('should decode picture from', () => {

      Parsers.forEach(parser => {
        it(parser.description, async () => {
          const filePath = path.join(asfFilePath, 'issue_57.wma');
          const metadata = await parser.initParser(filePath, 'audio/x-ms-wma');
          const asf = mm.orderTags(metadata.native.asf);
          assert.exists(asf['WM/Picture'][0], 'ASF WM/Picture should be set');
          const nativePicture = asf['WM/Picture'][0];
          assert.exists(nativePicture.data);
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
      assert.approximately(format.duration, 14.466, 1 / 10000, 'format.duration');
      assert.approximately(format.bitrate, 128639, 1, 'format.bitrate');

      const asf = mm.orderTags(native.asf);
      // ToDo: Contains some WM/... tags which could be parsed / mapped better

      assert.strictEqual(common.title, 'Thirty Dirty Birds', 'metadata.common.title');
      assert.strictEqual(common.artist, 'The Red Hot Chili Peppers', 'metadata.common.artist');
      assert.strictEqual(common.date, '2003', 'metadata.common.date');
      assert.deepEqual(common.label, ['Capitol'], 'metadata.common.label');
      assert.strictEqual(common.track.no, 13, 'metadata.common.track.no');

      assert.exists(asf);
    });

  });

});
