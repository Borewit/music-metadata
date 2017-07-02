import {} from "mocha";
import {assert} from 'chai';
import * as mm from '../src';
import {INativeTagDict} from "../src/index";
import * as path from 'path';

const t = assert;

it("should decode id3v2.3", () => {

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

  function checkNative(native: INativeTagDict) {

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
