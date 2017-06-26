"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var mm = require("../src");
var fs = require("fs-extra");
var path = require('path');
var t = chai_1.assert;
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
it("nonfilestream", function () {
    var runOnce = function () {
        // shim process for browser-based tests
        if (!process.nextTick)
            process.nextTick = function (cb) {
                setTimeout(cb, 0);
            };
        var sample = path.join(__dirname, 'samples/id3v2-duration-allframes.mp3');
        /* ToDo?
        const nonFileStream = through(
          function write(data) {
            this.queue(data);
          },
          function end() {
            this.queue(null);
          });*/
        var fileStream = fs.createReadStream(sample);
        //fileStream.pipe(nonFileStream);
        return mm.parseStream(fileStream, "audio/mpeg", { duration: true, fileSize: 47889 }).then(function (result) {
            t.equal(result.format.duration, 1.48928125);
            return fileStream.close();
        });
    };
    var countdown = 100;
    var loop = function () {
        return runOnce().then(function () {
            --countdown;
            if (countdown > 0)
                return loop();
        });
    };
    return loop();
});
//# sourceMappingURL=test-non-file-stream-duration.js.map