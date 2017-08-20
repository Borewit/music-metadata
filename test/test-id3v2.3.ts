import {} from "mocha";
import {assert} from 'chai';
import * as mm from '../src';
import * as path from 'path';
import {ID3v2Parser} from "../src/id3v2/ID3v2Parser";
import * as strtok from "strtok3";

const t = assert;

describe("Extract metadata from ID3v2.3 header", () => {

  it("should parse a raw ID3v2.3 header", () => {

    const filePath = path.join(__dirname, "samples", "MusicBrainz - Beth Hart - Sinner's Prayer.id3v23");

    return strtok.fromFile(filePath).then((tokenizer) => {
      return ID3v2Parser.getInstance().parse(tokenizer, {}).then((id3) => {

        t.strictEqual(33, id3.native['id3v2.3'].length);

        const id3v23 = mm.orderTags(id3.native['id3v2.3']);
        t.isDefined(id3v23.UFID, "check if ID3v2.3-UFID is set");
      });
    });
  });

  it("parse a ID3v2.3", () => {

    const filePath = path.join(__dirname, 'samples', 'id3v2.3.mp3');

    function checkFormat(format) {
      t.strictEqual(format.headerType, 'id3v2.3', 'format.type');
      t.strictEqual(format.duration, 1, 'format.duration'); // FooBar says 0.732 seconds (32.727 samples)
      t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
      t.strictEqual(format.bitrate, 128000, 'format.bitrate = 128 kbit/sec');
      t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
      t.strictEqual(format.encoder, 'LAME3.98r', 'format.encoder');
      t.strictEqual(format.codecProfile, 'CBR', 'format.codecProfile');
    }

    function checkCommon(common) {
      t.strictEqual(common.title, 'Home', 'common.title');
      t.deepEqual(common.artists, ['Explosions In The Sky', 'Another', 'And Another'], 'common.artists');
      t.strictEqual(common.albumartist, 'Soundtrack', 'common.albumartist');
      t.strictEqual(common.album, 'Friday Night Lights [Original Movie Soundtrack]', 'common.album');
      t.strictEqual(common.year, 2004, 'common.year');
      t.strictEqual(common.track.no, 5, 'common.track.no');
      t.strictEqual(common.track.of, null, 'common.track.of');
      t.strictEqual(common.disk.no, 1, 'common.disk.no');
      t.strictEqual(common.disk.of, 1, 'common.disk.of');
      t.strictEqual(common.genre[0], 'Soundtrack', 'common.genre');
      t.strictEqual(common.picture[0].format, 'jpg', 'common.picture format');
      t.strictEqual(common.picture[0].data.length, 80938, 'common.picture length');
    }

    function checkNative(native: mm.INativeTagDict) {

      t.deepEqual(native.TALB, ['Friday Night Lights [Original Movie Soundtrack]'], 'native: TALB');
      t.deepEqual(native.TPE1, ['Explosions In The Sky', 'Another', 'And Another'], 'native: TPE1');
      t.deepEqual(native.TPE2, ['Soundtrack'], 'native: TPE2');
      t.deepEqual(native.TCOM, ['Explosions in the Sky'], 'native: TCOM');
      t.deepEqual(native.TPOS, ['1/1'], 'native: TPOS');
      t.deepEqual(native.TCON, ['Soundtrack'], 'native: TCON');
      t.deepEqual(native.TIT2, ['Home'], 'native: TIT2');
      t.deepEqual(native.TRCK, ['5'], 'native: TRCK');
      t.deepEqual(native.TYER, ['2004'], 'native: TYER');
      t.deepEqual(native['TXXX:PERFORMER'], ['Explosions In The Sky'], 'native: TXXX:PERFORMER');

      const apic = native.APIC[0];
      t.strictEqual(apic.format, 'image/jpg', 'raw APIC format');
      t.strictEqual(apic.type, 'Cover (front)', 'raw APIC headerType');
      t.strictEqual(apic.description, '', 'raw APIC description');
      t.strictEqual(apic.data.length, 80938, 'raw APIC length');
    }

    return mm.parseFile(filePath, {duration: true, native: true}).then((result) => {
      checkFormat(result.format);
      checkCommon(result.common);
      checkNative(mm.orderTags(result.native['id3v2.3']));
    });

  });

  it("should decode corrupt ID3v2.3 header: 'Strawberry'", () => {

    /**
     * Kept 25 frames from original MP3; concatenated copied last 128 bytes to restore ID3v1.0 header
     */
    const filePath = path.join(__dirname, 'samples', '04-Strawberry.mp3');

    function checkFormat(format: mm.IFormat) {
      t.strictEqual(format.duration, 248, 'format.duration');
      t.strictEqual(format.headerType, 'id3v2.3', 'format.tag_type');
      t.strictEqual(format.dataformat, 'mp3', 'format.dataformat');
      t.strictEqual(format.lossless, false, 'format.lossless');
      t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
      t.strictEqual(format.bitrate, 128000, 'format.bitrate = 128 bit/sec');
      t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
    }

    function checkCommon(common: mm.ICommonTagsResult) {
      t.strictEqual(common.title, 'Strawberry', 'common.title');
      t.strictEqual(common.artist, 'Union Youth', "common.artist");
      t.strictEqual(common.album, "The Royal Gene", "common.album");
      t.strictEqual(common.albumartist, undefined, "common.albumartist");
      t.strictEqual(common.year, 2002, 'common.year');
      t.deepEqual(common.track, {no: 4, of: null}, 'common.track = 4/?');
      t.strictEqual(common.track.of, null, 'common.track.of = null');
      t.deepEqual(common.genre, ["Alternative"], "common.genre");
      t.isUndefined(common.comment, "common.comment");
    }

    return mm.parseFile(filePath).then((result) => {
      checkFormat(result.format);
      checkCommon(result.common);
    });

  });

});
