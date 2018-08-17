import {assert} from 'chai';
import * as mm from '../src';

import * as path from 'path';

const t = assert;

it("should decode non-ascii-characters", () => {

  const filename = 'bug-non ascii chars.mp3';
  const filePath = path.join(__dirname, 'samples', filename);

  return mm.parseFile(filePath).then(result => {
    t.deepEqual(result.common.artist, 'Janelle Monáe', 'common.artist');
    t.deepEqual(result.common.artists, ['Janelle Monáe', 'Roman Gianarthur', 'Nate Wonder'], 'common.artists');
  });

});
