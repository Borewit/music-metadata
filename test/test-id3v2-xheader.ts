import {assert} from 'chai';
import * as mm from '../src';

import * as path from 'path';

const t = assert;

it("should be able to read id3v2 files with extended headers", () => {

  const filename = 'id3v2-xheader.mp3';
  const filePath = path.join(__dirname, 'samples', filename);

  return mm.parseFile(filePath, {duration: true}).then(metadata => {
    t.strictEqual(metadata.format.numberOfSamples, 10944, 'format.numberOfSamples');
    t.strictEqual(metadata.format.sampleRate, 22050, 'format.sampleRate');
    t.strictEqual(metadata.format.duration, 10944 / metadata.format.sampleRate, 'format.duration');

    t.strictEqual(metadata.common.title, 'title', 'common.title');
    t.deepEqual(metadata.common.track, {no: null, of: null}, 'common.track');
    t.deepEqual(metadata.common.disk, {no: null, of: null}, 'common.disk');
  });

});
