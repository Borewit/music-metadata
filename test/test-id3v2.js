var id3 = require('../lib/id3'),
    fs  = require('fs');

var id3v2 = new id3(fs.readFileSync('sample3v2.mp3'));
id3v2.parse();

exports.title = function(test){
    test.equal(id3v2.get('title'),'Home', 'title is not correct');
    test.done();
}

exports.artist = function(test){
    test.equal(id3v2.get('artist'), 'Explosions In The Sky', 'artist is not correct');
    test.done();
}

exports.albumartist = function(test){
    test.equal(id3v2.get('albumartist'), 'Soundtrack', 'album artist is not correct');
    test.done();
}

exports.album = function(test){
    test.equal(id3v2.get('album'), 'Friday Night Lights [Original Movie Soundtrack]', 'album is not correct');
    test.done();
}

exports.year = function(test){
    test.equal(id3v2.get('year'), 2004, 'year is not correct');
    test.done();
}

exports.track = function(test){
    test.equal(id3v2.get('track'),'5','track is not correct');
    test.done();
}

exports.disk = function(test){
    test.equal(id3v2.get('disk'),'1/1', 'disk is not correct');
    test.done();
}

exports.genre = function(test){
    test.equal(id3v2.get('genre'),'Soundtrack', 'genre is not correct');
    test.done();
}

exports.picture = function(test){
    test.equal(id3v2.get('picture').data.length, 80938, 'picture length is not correct');
    test.done();
}

exports.composer = function(test){
    test.equal(id3v2.get('composer'),'Explosions in the Sky', 'composer is not correct');
    test.done();
}
