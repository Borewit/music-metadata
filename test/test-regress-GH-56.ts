import {assert} from "chai";

import * as path from "path";
import {Parsers} from './metadata-parsers';

const t = assert;

describe("should calculate duration for a CBR encoded MP3", () => {

  /*--------------------------------------------------------
   TAG headers:
    - ID3v2.3 at position 0, length is 191 bytes
    - APE v2.0 at position 5973245, length is 206 bytes

   MPEG-length:	   5973054
   Sample-rate:	     44100
   frame_size:	       417
   Samples per frame	1152

   No errors found in file.

   Summary:
   ===============
   Total number of frames: 14291, unpadded: 584, padded: 13707
   File is CBR. Bitrate of each frame is 128 kbps.
   Exact length: 06:13

   Audacity:   16463232
   Calculated: 16462080
   --------------------------------------------------------*/

  const filename = "regress-GH-56.mp3";
  const filePath = path.join(__dirname, "samples", filename);

  Parsers.forEach(parser => {
    it(parser.description, () => {
      return parser.initParser(filePath, 'audio/mpeg', {native: true}).then(metadata => {
        // ToDo: t.deepEqual(metadata.format.tagTypes, ['ID3v2.3', 'APEv2'], 'format.tagTypes');
        t.deepEqual(metadata.format.tagTypes, ["ID3v2.3"], "format.tagTypes");
        t.strictEqual(metadata.format.sampleRate, 44100, "format.sampleRate");
        t.strictEqual(metadata.format.duration, 16462080 / metadata.format.sampleRate, "format.duration");
      });
    });
  });

});
