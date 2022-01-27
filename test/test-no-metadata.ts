import {assert} from 'chai';
import path from 'node:path';

import * as mm from '../lib/index.js';
import { samplePath } from './util.js';

it("should reject files that can't be parsed", async () => {

  const filePath = path.join(samplePath, 'flac.flac.jpg');

  // Run with default options
  try {
    await mm.parseFile(filePath);
    assert.fail('Should reject a file which cannot be parsed');
  } catch (err) {
    assert.isDefined(err);
    assert.isDefined(err.message);
  }
});
