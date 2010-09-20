var assert = require('assert'),
    id3 = require('../lib/id3'),
    fs  = require('fs');

var audioFile = fs.readFileSync('sample3v1.mp3');
var id3v1 = new id3(audioFile);

id3v1.parse();

assert.equal(id3v1.get('title'),'Blood Sugar', 'title is not correct');
assert.equal(id3v1.get('artist'),'Pendulum', 'artist is not correct');
assert.equal(id3v1.get('album'),'Blood Sugar (Single)', 'album is not correct');
assert.equal(id3v1.get('comment'),'abcdefg', 'comment is not correct');
assert.equal(id3v1.get('genre'),'Electronic', 'genre is not correct');
assert.equal(id3v1.get('year'),'2007', 'year is not correct');
