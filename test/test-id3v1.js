var id3 = require('../lib/id3v1'),
      fs = require('fs');

var id3v1 = new id3(fs.readFileSync('samples/id3v1.mp3'));
var tags = id3v1.parse();

exports.title = function(test){
    test.equal(tags.title, 'Blood Sugar', 'title is not correct');
    test.done();
}

exports.artist = function(test){
    test.equal(tags.artist, 'Pendulum', 'artist is not correct');
    test.done();
}

exports.album = function(test){
    test.equal(tags.album, 'Blood Sugar (Single)', 'album is not correct');
    test.done();
}

exports.comment = function(test){
    test.equal(tags.comment, 'abcdefg', 'comment is not correct');
    test.done();
}

exports.genre = function(test){
    test.equal(tags.genre,'Electronic', 'genre is not correct');
    test.done();
}

exports.year = function(test){
    test.equal(tags.year,'2007', 'year is not correct');
    test.done();
}