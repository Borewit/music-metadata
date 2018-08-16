import {assert} from 'chai';
import * as mm from '../src';
import * as path from 'path';

const t = assert;

it("should reject files that can't be parsed", () => {

  const filePath = path.join(__dirname, 'samples', __filename);

  // Run with default options
  return mm.parseFile(filePath).then(result => {
    throw new Error("Should reject a file which cannot be parsed");
  }).catch(err => null);
});
