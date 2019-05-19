
import {assert} from 'chai';
import * as mm from '../src';

import * as path from 'path';

const t = assert;

it("should decode id3v2-duration-allframes", () => {

  /**
   * Audacity:         64512 samples (counts 56 frames??)
   * ---------------------------
   * MPEG-length:	     47647
   * Sample-rate:	     44100
   * frame_size:	       835
   * Samples per frame	1152
   *
   *   Summary:
   *   ===============
   *    Total number of frames: 57, unpadded: 5, padded: 52
   *    File is CBR. Bitrate of each frame is 256 kbps.
   *    Exact length: 00:01
   */
  const filePath = path.join(__dirname, 'samples', 'id3v2-duration-allframes.mp3');

  function checkFormat(format) {
    t.deepEqual(format.tagTypes, ['ID3v2.3'], 'format.tagTypes');
    t.strictEqual(format.bitrate, 256000, 'format.bitrate');
    t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
    t.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
    t.strictEqual(format.duration, 57 * 1152 / format.sampleRate, 'format.duration (test duration=true)');
    t.strictEqual(format.container, 'MPEG', 'format.container');
    t.strictEqual(format.codec, 'mp3', 'format.codec');
    t.strictEqual(format.tool, 'LAME 3.98.4', 'format.tool');
  }

  function checkCommon(common) {
    t.strictEqual(common.title, 'Turkish Rondo', 'common.album');
    t.strictEqual(common.album, 'Piano Classics', 'common.title');
    t.strictEqual(common.year, 0, 'common.year');
    t.deepEqual(common.artist, 'Aubrey Hilliard', 'common.artist');
    t.deepEqual(common.composer, ['Mozart'], 'common.composer');
    t.deepEqual(common.track, {no: 1, of: null}, 'common.track');
    t.deepEqual(common.genre, ['Classical'], 'common.genre');
    t.deepEqual(common.disk, {no: null, of: null}, 'common.disk');
    t.deepEqual(common.picture, undefined, 'common.picture');
  }

  return mm.parseFile(filePath, {duration: true}).then(result => {
    checkFormat(result.format);
    checkCommon(result.common);
  });

});
