import {} from "mocha";
import {assert} from 'chai';
import * as mm from '../lib';
import * as path from 'path';
import {INativeTagDict} from "../lib";

const t = assert;

it("should decode monkeysaudio (.ape)", () => {

  const filePath = path.join(__dirname, 'samples', 'monkeysaudio.ape');

  function checkFormat(format) {
    t.strictEqual(format.headerType, 'APEv2', 'format.tag_type');
    t.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample');
    t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 [kHz]');
    t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
    t.strictEqual(format.duration, 1.2134240362811792, 'duration [sec]');
  }

  function checkCommon(common) {
    t.strictEqual(common.title, '07. Shadow On The Sun', 'common.title');
    t.strictEqual(common.artist, undefined, 'common.artist');
    t.deepEqual(common.artists, ['Audioslave', 'Chris Cornell'], 'common.artists');
    // Used to be ['Audioslave'], but 'APEv2/Album Artist'->'albumartist' is not set in actual file!
    t.deepEqual(common.albumartist, undefined, 'common.albumartist');
    t.strictEqual(common.album, 'Audioslave', 'common.album');
    t.strictEqual(common.year, 2002, 'common.year');
    t.deepEqual(common.genre, ['Alternative'], 'common.genre');
    t.deepEqual(common.track, {no: 7, of: null}, 'common.track');
    t.deepEqual(common.disk, {no: 3, of: null}, 'common.disk');
    t.strictEqual(common.picture[0].format, 'jpg', 'common.picture 0 format');
    t.strictEqual(common.picture[0].data.length, 48658, 'common.picture 0 length');
    t.strictEqual(common.picture[1].format, 'jpg', 'common.picture 1 format');
    t.strictEqual(common.picture[1].data.length, 48658, 'common.picture 1 length');
  }

  function checkNative(ape: INativeTagDict) {
    t.deepEqual(ape.ENSEMBLE, ['Audioslave']);
    t.deepEqual(ape.Artist, ['Audioslave', 'Chris Cornell']);
    t.strictEqual(ape['Cover Art (Front)'][0].data.length, 48658, 'raw cover art (front) length');
    t.strictEqual(ape['Cover Art (Back)'][0].data.length, 48658, 'raw cover art (front) length');
  }

  return mm.parseFile(filePath, {native: true}).then((result) => {

    checkFormat(result.format);

    checkCommon(result.common);

    t.ok(result.native && result.native.APEv2, 'should include native APEv2 tags');
    checkNative(mm.orderTags(result.native.APEv2));
  });

});
