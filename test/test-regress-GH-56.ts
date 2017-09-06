import {} from "mocha";
import {assert} from 'chai';
import * as mm from '../src';
import * as fs from 'fs-extra';

import * as path from 'path';

const t = assert;

it("should calculate duration for a CBR encoded MP3", function() {

  this.skip(); // Need to support APEv2 header first

  /**
   *
   * TAG headers:
   * - ID3v2.3 0 at position 0, length is 191 bytes
   * - APE v2.0 at position 5973245
   *
   * MPEG-length:	   5973054
   * Sample-rate:	     44100
   * frame_size:	       417
   * Samples per frame	1152
   *
   * No errors found in file.
   *
   * Summary:
   * ===============
   * Total number of frames: 14291, unpadded: 584, padded: 13707
   * File is CBR. Bitrate of each frame is 128 kbps.
   * Exact length: 06:13
   *
   * Audacity:   16463232
   * Calculated: 16502400
   */
  const filename = 'regress-GH-56.mp3';
  const filePath = path.join(__dirname, 'samples', filename);

  const stream = fs.createReadStream(filePath);
  return mm.parseStream(stream, 'audio/mpeg', {duration: true}).then((metadata) => {
    // ToDo: t.deepEqual(metadata.format.tagTypes, ['ID3v2.3', 'APEv2'], 'format.tagTypes');
    t.deepEqual(metadata.format.tagTypes, ['ID3v2.3'], 'format.tagTypes');
    t.strictEqual(metadata.format.sampleRate, 44100, 'format.sampleRate');
    t.strictEqual(metadata.format.duration, 16502400 / metadata.format.sampleRate, 'format.duration');
    stream.close();
  });

});
