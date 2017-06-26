import {} from "mocha"
import {assert} from 'chai';
import * as mm from '../src';

const path = require('path');

const t = assert;

it("should handle audio-frame-header-bug", () => {

  const filePath = path.join(__dirname, 'samples', 'audio-frame-header-bug.mp3');

  return mm.parseFile(filePath, { duration: true }).then( (result) => {
    t.strictEqual(result.format.duration, 200.59591666666665)
  })
});
