import {} from "mocha"
import {assert} from 'chai';
import * as mm from '../src';

const path = require('path');

const t = assert;

it("should decode id3v2-duration-allframes", () => {

  const filePath = path.join(__dirname, 'samples', 'id3v2-duration-allframes.mp3');

  function checkFormat(format) {
    t.strictEqual(format.headerType, 'id3v2.3', 'format.headerType');
    t.strictEqual(format.bitrate, 256000, 'format.bitrate');
    t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
    t.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
    t.strictEqual(format.duration, 1.48928125, 'format.duration (test duration=true)');
    t.strictEqual(format.encoder, 'LAME 3.98.4', 'format.encoder');
  }
  function checkCommon(common) {
    t.strictEqual(common.title, 'Turkish Rondo', 'common.album');
    t.strictEqual(common.album, 'Piano Classics', 'common.title');
    t.strictEqual(common.year, 0, 'common.year');
    t.deepEqual(common.artist, 'Aubrey Hilliard', 'common.artist');
    t.deepEqual(common.composer, [ 'Mozart' ], 'common.composer');
    t.deepEqual(common.track, { no: 1, of: null }, 'common.track');
    t.deepEqual(common.genre, [ 'Classical' ], 'common.genre');
    t.deepEqual(common.disk, { no: null, of: null }, 'common.disk');
    t.deepEqual(common.picture, undefined, 'common.picture');
  }

  return mm.parseFile(filePath, {duration: true}).then(function (result) {

    checkFormat(result.format);

    checkCommon(result.common);

  })
});
