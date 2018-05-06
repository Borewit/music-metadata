import {assert} from 'chai';
import * as mm from '../src';

import * as path from 'path';

const t = assert;

it('invalid "Date" frame should not cause crash', () => {
  const filename = 'bug-id3v2-unknownframe.mp3';
  const filePath = path.join(__dirname, 'samples', filename);

  function checkCommon(common) {
    t.strictEqual(common.title, 'One', 'common.title');
    t.strictEqual(common.artist, 'Coheed And Cambria', 'common.artist');
    t.strictEqual(common.album, 'Year Of The Black Rainbow', 'common.album');
    t.strictEqual(common.year, 2010, 'common.year');
    t.deepEqual(common.track, {no: 1, of: null}, 'common.track');
    t.deepEqual(common.genre, ['Progressive Rock'], 'common.genre');
  }

  return mm.parseFile(filePath, {duration: true}).then(metadata => {
    checkCommon(metadata.common);
  });

});
