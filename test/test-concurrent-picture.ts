import {assert} from 'chai';
import * as mm from '../lib/index.js';
import fs from 'node:fs';
import path from 'node:path';
import { samplePath } from './util.js';

const t = assert;

it("should handle concurrent parsing of pictures", () => {

  const files = [path.join(samplePath, 'flac.flac'), path.join(samplePath, 'flac-bug.flac')];

  return Promise.all<any>(files.map(file => {
    return mm.parseFile(file).then(result => {
      const data = fs.readFileSync(file + '.jpg');
      t.deepEqual(result.common.picture[0].data, data, 'check picture');
    });
  }));
});
