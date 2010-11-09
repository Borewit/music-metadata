var id3 = require('../lib/id3v1'),
      fs = require('fs');

var id3v1 = new id3(fs.readFileSync('samples/id3v1.mp3'));
id3v1.parse();

exports.title = function(test){
    test.equal(id3v1.get('title'),'Blood Sugar', 'title is not correct');
    test.done();
}

exports.artist = function(test){
    test.equal(id3v1.get('artist'),'Pendulum', 'artist is not correct');
    test.done();
}

exports.album = function(test){
    test.equal(id3v1.get('album'),'Blood Sugar (Single)', 'album is not correct');
    test.done();
}

exports.comment = function(test){
    test.equal(id3v1.get('comment'),'abcdefg', 'comment is not correct');
    test.done();
}

exports.genre = function(test){
    test.equal(id3v1.get('genre'),'Electronic', 'genre is not correct');
    test.done();
}

exports.year = function(test){
    test.equal(id3v1.get('year'),'2007', 'year is not correct');
    test.done();
}