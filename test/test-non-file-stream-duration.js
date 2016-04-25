// var path = require('path')
// var fs = require('fs')
// var through = require('through')
// var mm = require('..')
// var test = require('tape')

/* TODO: fix this test. There's a weird race condition when running the full
  test suite that causes this test only to fail. If we remove the
  nonFileStream stuff and just pass the FileStream everything works fine.

  How to reproduce:

  for run in {1..1000}
  do
  npm test
  done

  npm test will fail every 3rd to 5th time.

test('nonfilestream', function (t) {
  t.plan(1)

  // shim process for browser-based tests
  if (!process.nextTick)
    process.nextTick = function(cb) { setTimeout(cb, 0); }

  var sample = path.join(__dirname, 'samples/id3v2-duration-allframes.mp3')
  var nonFileStream = through(
    function write (data) { this.queue(data); },
    function end () { this.queue(null); })
  var fileStream = fs.createReadStream(sample)
  fileStream.pipe(nonFileStream)

  new mm(nonFileStream, { duration: true, fileSize: 47889 })
    .on('metadata', function (result) {
      t.equal(result.duration, 1)
      t.end()
    })
})
*/
