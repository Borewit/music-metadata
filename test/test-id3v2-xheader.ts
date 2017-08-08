import {} from "mocha";
import {assert} from 'chai';
import * as mm from '../lib';

import * as path from 'path';

const t = assert;

it("should be able to read id3v2 files with extended headers", () => {

  const filename = 'id3v2-xheader.mp3';
  const filePath = path.join(__dirname, 'samples', filename);

  return mm.parseFile(filePath, {duration: true}).then((result) => {
    t.strictEqual(result.format.duration, 0.4969375, 'format.duration');

    t.strictEqual(result.common.title, 'title', 'common.title');
    t.deepEqual(result.common.track, {no: null, of: null}, 'common.track');
    t.deepEqual(result.common.disk, {no: null, of: null}, 'common.disk');
  });

});
