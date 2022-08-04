import {assert} from 'chai';
import * as mm from '../lib/index.js';
import { samplePath } from './util.js';

import path from 'node:path';

const t = assert;

it("should decode non-ascii-characters", () => {

  const filename = 'bug-non ascii chars.mp3';
  const filePath = path.join(samplePath, filename);

  return mm.parseFile(filePath).then(result => {
    t.deepEqual(result.common.artist, 'Janelle Monáe', 'common.artist');
    t.deepEqual(result.common.artists, ['Janelle Monáe', 'Roman Gianarthur', 'Nate Wonder'], 'common.artists');
  });

});
