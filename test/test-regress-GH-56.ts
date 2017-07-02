import {} from "mocha";
import {assert} from 'chai';
import * as mm from '../src';
import * as fs from 'fs-extra';

import * as path from 'path';

const t = assert;

it("should calculate duration for a VBR encoded MP3", () => {

  const filename = 'regress-GH-56.mp3';
  const filePath = path.join(__dirname, 'samples', filename);

  const stream = fs.createReadStream(filePath);
  return mm.parseStream(stream, 'audio/mpeg', {duration: true}).then((result) => {
    t.strictEqual(result.format.duration, 373.329375, 'format.duration');
    stream.close();
  });

});
