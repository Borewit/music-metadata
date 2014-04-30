var path    = require('path');
var fs      = require('fs');
var through = require('through');
var mm      = require('../lib/index');
var test    = require('tape');

test('nonfilestream', function (t) {
  t.plan(1);

  // shim process for browser-based tests
  if (!process.nextTick)
    process.nextTick = function(cb) { setTimeout(cb, 0); };

  var sample = path.join(__dirname, 'samples/id3v2-duration-allframes.mp3');
  var nonFileStream = through(
    function write(data) { this.queue(data); },
    function end() { this.queue(null); });
  fs.createReadStream(sample).pipe(nonFileStream);

  new mm(nonFileStream, { duration: true, fileSize: 47889 })
    .on('metadata', function (result) {
      t.equal(result.duration, 1);
      t.end();
    });
});
