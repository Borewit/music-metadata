var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('tape')

test('invalid "Date" frame should not cause crash', function (t) {
  t.plan(6)

  var filename = 'bug-id3v2-unknownframe.mp3';
  var filePath = path.join(__dirname, 'samples', filename);

  function checkCommon (common) {
    t.strictEqual(common.title, 'One', 'common.title')
    t.strictEqual(common.artist, 'Coheed And Cambria', 'common.artist')
    t.strictEqual(common.album, 'Year Of The Black Rainbow', 'common.album')
    t.strictEqual(common.year, 2010, 'common.year')
    t.deepEqual(common.track, { no:1, of:null }, 'common.track')
    t.deepEqual(common.genre, ['Progressive Rock'], 'common.genre')
  }


  mm.parseFile(filePath, { duration: true }).then(function (metadata) {
    checkCommon(metadata.common)
    t.end()
  }).catch( function(err) {
    t.error(err);
  });
})
