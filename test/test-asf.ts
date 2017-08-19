import {} from "mocha";
import {assert} from 'chai';
import * as mm from '../src';
import * as path from 'path';
import GUID from "../src/asf/GUID";
import * as fs from 'fs-extra';

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

  describe("parse", () => {

    const filePath = path.join(__dirname, 'samples', 'asf.wma');

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

      return mm.parseFile(filePath, {native: true}).then((result) => {

        checkFormat(result.format);

        checkCommon(result.common);

        t.ok(result.native && result.native.asf, 'should include native ASF tags');
        checkNative(mm.orderTags(result.native.asf));
      });

    });

    it("should decode from ASF from a stream (audio/x-ms-wma)", () => {

      const stream = fs.createReadStream(filePath);

      return mm.parseStream(stream, 'audio/x-ms-wma', {native: true}).then((metadata) => {
        checkFormat(metadata.format);
        checkCommon(metadata.common);
        checkNative(mm.orderTags(metadata.native.asf));
      }).then(() => {
        stream.close();
      });

    });

  });

});
