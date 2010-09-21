var assert = require('assert'),
    id3 = require('../lib/id3'),
    fs  = require('fs');

var audioFile = fs.readFileSync('sample3v2.mp3');
var id3v2 = new id3(audioFile);

id3v2.parse();

assert.equal(id3v2.get('title'),'Home', 'title is not correct');
assert.equal(id3v2.get('artist'), 'Explosions In The Sky', 'artist is not correct');
assert.equal(id3v2.get('albumartist'), 'Soundtrack', 'album artist is not correct');
assert.equal(id3v2.get('album'), 'Friday Night Lights [Original Movie Soundtrack]', 'album is not correct');
assert.equal(id3v2.get('year'), 2004, 'year is not correct');
assert.equal(id3v2.get('track'),'5','track is not correct');
assert.equal(id3v2.get('disk'),'1/1', 'disk is not correct');
assert.equal(id3v2.get('genre'),'Soundtrack', 'genre is not correct');
assert.equal(id3v2.get('picture').data.length, 80938, 'picture length is not correct');
