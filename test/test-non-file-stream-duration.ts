import {} from "mocha"
import {assert} from 'chai';
import * as mm from '../src';
import * as fs from "fs-extra";

const path = require('path');

const t = assert;

/* TODO: fix this test. There's a weird race condition when running the full
 test suite that causes this test only to fail. If we remove the
 nonFileStream stuff and just pass the FileStream everything works fine.

 How to reproduce:

 for run in {1..1000}
 do
 npm test
 done

 npm test will fail every 3rd to 5th time.
 */

it("nonfilestream", () => {


  const runOnce = () => {

    // shim process for browser-based tests
    if (!process.nextTick)
      process.nextTick = (cb) => {
        setTimeout(cb, 0);
      };

    const sample = path.join(__dirname, 'samples/id3v2-duration-allframes.mp3');
    /* ToDo?
    const nonFileStream = through(
      function write(data) {
        this.queue(data);
      },
      function end() {
        this.queue(null);
      });*/

    const fileStream = fs.createReadStream(sample);
    //fileStream.pipe(nonFileStream);

    return mm.parseStream(fileStream, "audio/mpeg", {duration: true, fileSize: 47889}).then((result) => {
      t.equal(result.format.duration, 1.48928125);
      return fileStream.close();
    })
  };

  let countdown = 100;

  const loop = () => {
    return runOnce().then(() => {
      --countdown;
      if(countdown>0)
        return loop();
    });
  };

  return loop();

});
