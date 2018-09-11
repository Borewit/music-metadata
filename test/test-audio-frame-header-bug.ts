import {assert} from 'chai';
import * as mm from '../src';
import * as path from 'path';

const t = assert;

it("should handle audio-frame-header-bug", function() {

  this.timeout(15000); // It takes a long time to parse

  const filePath = path.join(__dirname, 'samples', 'audio-frame-header-bug.mp3');

  return mm.parseFile(filePath, {duration: true}).then(result => {
    // If MPEG Layer II is accepted, it will give back third frame with a different frame length;
    // therefore it start counting actual parsable frames ending up on ~66.86
    t.strictEqual(result.format.duration, 66.8560544217687);
  });
});
