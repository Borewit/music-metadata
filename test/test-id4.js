var id3 = require('../lib/id3'),
    fs  = require('fs');

var id4 = new id3(fs.readFileSync('sample4.m4a'));
id4.parse();

exports.artist = function(test){
    test.equal(id4.get('artist'),'The Prodigy', 'artist is not correct');
    test.done();
}

exports.albumartist = function(test){
    test.equal(id4.get('albumartist'),'Pendulum','album artist is not correct');
    test.done();
}

exports.title = function(test){
    test.equal(id4.get('title'),'Voodoo People (Pendulum Remix)', 'title is not correct');
    test.done();
}

exports.year = function(test){
    test.equal(id4.get('year'),2005, 'year is not correct');
    test.done();
}

exports.composer = function(test){
    test.equal(id4.get('composer'), 'Liam Howlett', 'composer is not correct');
    test.done();
}

exports.track = function(test){
    test.equal(id4.get('track').num, 1, 'track number is not correct');
    test.equal(id4.get('track').of, 1, 'track total is not correct');
    test.done();
}

exports.disk = function(test){
    test.equal(id4.get('disk').num,1, 'disk number is not correct');
    test.equal(id4.get('disk').of,1, 'disk total is not correct');
    test.done();
}

exports.picture = function(test){
    test.equal(id4.get('picture').data.length,196450, 'picture is not the same size');
    test.done();
}

exports.genre = function(test){
    test.equal(id4.get('genre'),'Electronic', 'genre is not correct');
    test.done();
}

exports.comment = function(test){
    test.equal(id4.get('comment'),'(Pendulum Remix)', 'comment is not correct');
    test.done();
}
