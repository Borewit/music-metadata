import {} from "mocha"
import {assert} from 'chai';
import * as mm from '../src';

const path = require('path');

const t = assert;

describe("mpeg parsing fails for irrelevant attributes #14", () => {

  it("should decode 04 - You Don't Know.mp3", () => {

    const filePath = path.join(__dirname, 'samples', "04 - You Don't Know.mp3");

    function checkFormat(format) {
      t.strictEqual(format.headerType, 'id3v2.3', 'format.type');
      t.strictEqual(format.duration, 206,3292290249433, 'format.duration'); // FooBar says 3:26.329 seconds (9.099.119 samples)
      t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
      t.strictEqual(format.bitrate, 320000, 'format.bitrate = 128 kbit/sec');
      t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
      t.strictEqual(format.encoder, 'LAME3.98r', 'format.encoder');
      t.strictEqual(format.codecProfile, 'CBR', 'format.codecProfile');
    }

    function checkCommon(common) {
      t.strictEqual(common.title, "You Don't Know", 'common.title');
      t.deepEqual(common.artists, ['Reel Big Fish'], 'common.artists');
      t.strictEqual(common.albumartist, 'Reel Big Fish', 'common.albumartist');
      t.strictEqual(common.album, 'Why Do They Rock So Hard?', 'common.album');
      t.strictEqual(common.year, 1998, 'common.year');
      t.strictEqual(common.track.no, 4, 'common.track.no');
      t.strictEqual(common.track.of, null, 'common.track.of');
      t.strictEqual(common.disk.no, null, 'common.disk.no');
      t.strictEqual(common.disk.of, null, 'common.disk.of');
      t.strictEqual(common.genre[0], 'Ska-Punk', 'common.genre');
    }

    function getNativeTags(native, tagId) {
      return native.filter(function (tag) {
        return tag.id === tagId
      }).map(function (tag) {
        return tag.value
      })
    }

    function checkNative(native) {

      t.deepEqual(getNativeTags(native, 'TPE2'), ['Reel Big Fish'], 'native: TPE2');

      t.deepEqual(getNativeTags(native, 'TIT2'), ["You Don't Know"], 'native: TIT2');

      t.deepEqual(getNativeTags(native, 'TALB'), ['Why Do They Rock So Hard?'], 'native: TALB');

      t.deepEqual(getNativeTags(native, 'TPE1'), ['Reel Big Fish'], 'native: TPE1');

      t.deepEqual(getNativeTags(native, 'TCON'), ['Ska-Punk'], 'native: TCON');

      t.deepEqual(getNativeTags(native, 'TYER'), ['1998'], 'native: TYER');

      t.deepEqual(getNativeTags(native, 'TCOM'), ['CA'], 'native: TCOM'); // ToDo: common property?

      t.deepEqual(getNativeTags(native, 'TRCK'), ['04'], 'native: TRCK');

      t.deepEqual(getNativeTags(native, 'COMM'), [{description: "", language: "eng", text: "jive"}], 'native: COMM');
    }

    return mm.parseFile(filePath, {duration: true}).then((result) => {

      checkFormat(result.format);

      checkCommon(result.common);

      checkNative(result.native['id3v2.3'])

    })
  });

});
