import {} from "mocha";
import {assert} from 'chai';
import * as mm from '../lib';
import * as path from 'path';

const t = assert;

it("zero bytes", () => {

  const filename = 'zerobytes';
  const filePath = path.join(__dirname, 'samples', filename);

  return mm.parseFile(filePath).then((result) => {
    throw new Error("should throw an exception");
  }).catch((err) => {
    t.equal(err.message, 'Extension  not supported.');
  });
});
