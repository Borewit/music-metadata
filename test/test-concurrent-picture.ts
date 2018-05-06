import {assert} from 'chai';
import * as mm from '../src';
import * as fs from 'fs-extra';
import {Promise} from 'bluebird';
import * as path from 'path';

const t = assert;

it("should handle concurrent parsing of pictures", () => {

  const files = [path.join(__dirname, 'samples', 'flac.flac'), path.join(__dirname, 'samples', 'flac-bug.flac')];

  const promises: Array<Promise<any>> = [];

  files.forEach(file => {
    promises.push(mm.parseFile(file).then(result => {
      return fs.readFile(file + '.jpg').then(data => {
        t.deepEqual(result.common.picture[0].data, data, 'check picture');
      });
    }) as any);
  });

  return Promise.all<any>(promises);
});
