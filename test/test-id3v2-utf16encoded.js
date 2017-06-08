var path = require('path')
var fs = require('fs')
var mm = require('..')
var test = require('tape')

test('id3v2.4', function (t) {
  t.plan(11)

  var filename = 'id3v2-utf16.mp3';
  var filePath = path.join(__dirname, 'samples', filename);

  mm.parseFile(filePath, { duration: true }).then(function (result) {

    t.strictEqual(result.common.title, 'Redial (Feat. LeafRunner and Nowacking)', 'title')
    t.strictEqual(result.common.artist, 'YourEnigma', 'artist 0')
    t.strictEqual(result.common.year, 2014, 'year')
    t.strictEqual(result.common.picture[0].format, 'jpg', 'picture 0 format')
    t.strictEqual(result.common.picture[0].data.length, 214219, 'picture 0 length')
    t.deepEqual(result.common.picture[0].data.slice(0, 2), new Buffer([0xFF, 0xD8]), 'picture 0 JFIF magic header')

    var native = result.native['id3v2.3'];
    t.ok(native, 'Native id3v2.3 tags should be present')

    t.deepEqual(native[0], {id: 'TIT2', value: 'Redial (Feat. LeafRunner and Nowacking)'}, "['id3v2.3'].TIT2");
    t.deepEqual(native[1], {id: 'TPE1', value: 'YourEnigma'}, "['id3v2.3'].TIT2");
    t.deepEqual(native[2], {id: 'TYER', value: '2014'}, "['id3v2.3'].TYER");
    t.deepEqual(native[3], {id: 'COMM', value: {description: '', language: 'eng', text: 'Visit http://yourenigma.bandcamp.com'}}, "['id3v2.3'].COMM");


    t.end()
  }).catch( function(err) {
    t.error(err);
  });

})
