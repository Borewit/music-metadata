import {assert} from 'chai';
import * as path from 'path';

import * as mm from '../lib';
import { samplePath } from './util';

const t = assert;

it("should decode non-ascii-characters", () => {

  const filename = 'bug-non ascii chars.mp3';
  const filePath = path.join(samplePath, filename);

  return mm.parseFile(filePath).then(result => {
    t.deepEqual(result.common.artist, 'Janelle Monáe', 'common.artist');
    t.deepEqual(result.common.artists, ['Janelle Monáe', 'Roman Gianarthur', 'Nate Wonder'], 'common.artists');
  });

});
