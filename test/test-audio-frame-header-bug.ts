import {} from "mocha";
import {assert} from 'chai';
import * as mm from '../src';
import * as path from 'path';

const t = assert;

it("should handle audio-frame-header-bug", () => {

  const filePath = path.join(__dirname, 'samples', 'audio-frame-header-bug.mp3');

  return mm.parseFile(filePath, {duration: true}).then((result) => {
    // FooBar: 3:20.556 (8.844.527 samples); 44100 Hz => 200.5561678004535 seconds
    // t.strictEqual(result.format.duration, 200.59591666666665); // previous
    // t.strictEqual(result.format.duration, 200.5561678004535); // FooBar
    t.strictEqual(result.format.duration, 200.5955);
  });
});
