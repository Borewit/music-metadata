import { assert } from 'chai';

import * as path from 'node:path';
import { Parsers } from './metadata-parsers.js';
import { samplePath } from './util.js';

const t = assert;

describe('should calculate duration for a CBR encoded MP3', () => {

  /* --------------------------------------------------------
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

  const filePath = path.join(samplePath, 'regress-GH-56.mp3');

  Parsers.forEach(parser => {
    it(parser.description, async function(){
      const { format } = await parser.parse(() => this.skip(), filePath, 'audio/mpeg');
      const expectedTags = parser.randomRead ? ['ID3v2.3', 'APEv2'] : ['ID3v2.3'];
      t.deepEqual(format.tagTypes, expectedTags, 'format.tagTypes');
      t.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
      t.strictEqual(format.duration, 16462080 / format.sampleRate, 'format.duration');
    });
  });

  it('_parseFile', async function(){
    const parser = Parsers[0];
    const { format} = await parser.parse(() => this.skip(), filePath, 'audio/mpeg');
    const expectedTags = parser.randomRead ? ['ID3v2.3', 'APEv2'] : ['ID3v2.3'];
    t.deepEqual(format.tagTypes, expectedTags, 'format.tagTypes');
    t.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
    t.strictEqual(format.duration, 16462080 / format.sampleRate, 'format.duration');
  });

  it('debug single', async function(){
    const parser =  Parsers[3];
    const { format } = await parser.parse(() => this.skip(), filePath, 'audio/mpeg');
    const expectedTags = parser.randomRead ? ['ID3v2.3', 'APEv2'] : ['ID3v2.3'];
    t.deepEqual(format.tagTypes, expectedTags, 'format.tagTypes');
    t.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
    t.strictEqual(format.duration, 16462080 / format.sampleRate, 'format.duration');
  });

});
