import {assert} from 'chai';
import * as mm from '../src';
import * as path from 'path';
import GUID from "../src/asf/GUID";
import * as fs from 'fs-extra';
import {AsfUtil} from "../src/asf/AsfUtil";
import {DataType} from "../src/asf/AsfObject";

const t = assert;

describe("ASF", () => {

  describe("GUID", () => {
    it("should construct GUID from string", () => {

      const Header_GUID = new Buffer([
        0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11,
        0xA6, 0xD9, 0x00, 0xAA, 0x00, 0x62, 0xCE, 0x6C
      ]);

      assert.deepEqual(GUID.HeaderObject.toBin(), Header_GUID);
    });
  });

  /**
   * Trying Buffer.readUIntLE(0, 8)
   * Where 8 is 2 bytes longer then maximum allowed of 6
   */
  it("should be able to roughly decode a 64-bit QWord", () => {

    const tests: Array<{ raw: string, expected: number, description: string }> = [
      { raw: "\xFF\x00\x00\x00\x00\x00\x00\x00",
        expected: 0xFF,
        description: "8-bit" },
      { raw: "\xFF\xFF\x00\x00\x00\x00\x00\x00",
        expected: 0xFFFF,
        description: "16-bit"},
      { raw: "\xFF\xFF\xFF\xFF\x00\x00\x00\x00",
        expected: 0xFFFFFFFF,
        description: "32-bit"},
      { raw: "\xFF\xFF\xFF\xFF\xFF\x00\x00\x00",
        expected: 0xFFFFFFFFFF,
        description: "40-bit"},
      { raw: "\xFF\xFF\xFF\xFF\xFF\xFF\x00\x00",
        expected: 0xFFFFFFFFFFFF,
        description: "48-bit"},
      { raw:     "\xFF\xFF\xFF\xFF\xFF\xFF\x0F\x00",
        expected: 0xFFFFFFFFFFFFF,
        description: "52-bit"}
    ];

    tests.forEach(test => {
      const buf = new Buffer(test.raw, "binary");
      t.strictEqual(AsfUtil.getParserForAttr(DataType.QWord)(buf), test.expected, test.description);
    });

  });

  describe("parse", () => {

    const asfFilePath = path.join(__dirname, 'samples', 'asf.wma');

    function checkFormat(format) {
      t.strictEqual(format.duration, 244.885, 'format.duration');
      t.strictEqual(format.bitrate, 192639, 'format.bitrate');
    }

    function checkCommon(common) {
      t.strictEqual(common.title, "Don't Bring Me Down", 'common.title');
      t.deepEqual(common.artist, 'Electric Light Orchestra', 'common.artist');
      t.deepEqual(common.albumartist, 'Electric Light Orchestra', 'common.albumartist');
      t.strictEqual(common.album, 'Discovery', 'common.album');
      t.strictEqual(common.year, 2001, 'common.year');
      t.deepEqual(common.track, {no: 9, of: null}, 'common.track 9/0');
      t.deepEqual(common.disk, {no: null, of: null}, 'common.disk 0/0');
      t.deepEqual(common.genre, ['Rock'], 'common.genre');
    }

    function checkNative(native: mm.INativeTagDict) {

      t.deepEqual(native['WM/AlbumTitle'], ['Discovery'], 'native: WM/AlbumTitle');
      t.deepEqual(native['WM/BeatsPerMinute'], [117], 'native: WM/BeatsPerMinute');
      t.deepEqual(native.REPLAYGAIN_TRACK_GAIN, ['-4.7 dB'], 'native: REPLAYGAIN_TRACK_GAIN');
    }

    it("should decode an ASF audio file (.wma)", () => {

      return mm.parseFile(asfFilePath, {native: true}).then(result => {

        checkFormat(result.format);

        checkCommon(result.common);

        t.ok(result.native && result.native.asf, 'should include native ASF tags');
        checkNative(mm.orderTags(result.native.asf));
      });

    });

    it("should decode from ASF from a stream (audio/x-ms-wma)", () => {

      const stream = fs.createReadStream(asfFilePath);

      return mm.parseStream(stream, 'audio/x-ms-wma', {native: true}).then(metadata => {
        checkFormat(metadata.format);
        checkCommon(metadata.common);
        checkNative(mm.orderTags(metadata.native.asf));
      }).then(() => {
        stream.close();
      });

    });

    it("should decode picture from ", () => {

      const filePath = path.join(__dirname, 'samples', 'issue_57.wma');

      return mm.parseFile(filePath, {duration: true, native: true}).then(metadata => {
        const asf = mm.orderTags(metadata.native.asf);
        assert.exists(asf['WM/Picture'][0], 'ASF WM/Picture should be set');
        const nativePicture = asf['WM/Picture'][0];
        assert.exists(nativePicture.data);
      });
    });

    /**
     * Related issue: https://github.com/Borewit/music-metadata/issues/68
     */
    it("should be able to parse truncated .wma file", () => {

      const filePath = path.join(__dirname, 'samples', '13 Thirty Dirty Birds.wma');

      return mm.parseFile(filePath, {duration: true, native: true}).then(metadata => {

        const asf = mm.orderTags(metadata.native.asf);
        // ToDo: Contains some WM/... tags which could be parsed / mapped better

        assert.strictEqual(metadata.common.title, "Thirty Dirty Birds", "metadata.common.title");
        assert.strictEqual(metadata.common.artist, "The Red Hot Chili Peppers", "metadata.common.artist");
        assert.strictEqual(metadata.common.date, "2003", "metadata.common.date");
        assert.strictEqual(metadata.common.label, "Capitol", "metadata.common.label");
        assert.strictEqual(metadata.common.track.no, 13, "metadata.common.track.no");

        assert.exists(asf);
      });
    });

  });

});
