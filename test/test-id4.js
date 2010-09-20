var assert = require('assert'),
    id3 = require('../lib/id3'),
    fs  = require('fs');

var audioFile = fs.readFileSync('sample4.m4a');
var id4 = new id3(audioFile);

id4.parse();

assert.equal(id4.get('artist'),'The Prodigy', 'artist is not correct');
assert.equal(id4.get('albumartist'),'Pendulum','album artist is not correct');
assert.equal(id4.get('title'),'Voodoo People (Pendulum Remix)', 'title is not correct');
assert.equal(id4.get('year'),2005, 'year is not correct');
assert.equal(id4.get('composer'), 'Liam Howlett', 'composer is not correct');
assert.equal(id4.get('track').number, 1, 'track number is not correct');
assert.equal(id4.get('track').total, 0, 'track total is not correct');
assert.equal(id4.get('disk').number,1, 'disk number is not correct');
assert.equal(id4.get('disk').total,1, 'disk total is not correct');
assert.equal(id4.get('picture').data.length,196450, 'picture is not the same size');
assert.equal(id4.get('genre'),'Electronic', 'genre is not correct');
assert.equal(id4.get('comment'),'(Pendulum Remix)', 'comment is not correct');
