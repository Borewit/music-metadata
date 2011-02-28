var id3 = require('../lib/index'),
      fs = require('fs');

exports['id3v1.1'] = function(test) {
    test.numAssertions = 13;
    var parser = new id3(fs.createReadStream('samples/id3v1.mp3'));
    
    parser.on('title', function(result) {
        test.equal(result, 'Blood Sugar', 'title is not correct')
    });

    parser.on('artist', function(result) {
        test.equal(result, 'Pendulum', 'artist is not correct');
    });

    parser.on('album', function(result) {
        test.equal(result, 'Blood Sugar (Single)', 'album is not correct');
    });

    parser.on('year', function(result) {
        test.equal(result,'2007', 'year is not correct');
    });

    parser.on('comment', function(result) {
        test.equal(result, 'abcdefg', 'comment is not correct');
    });

    parser.on('track', function(result) {
        test.equal(result, 1, 'track is not correct');
    });

    parser.on('genre', function(result) {
        test.equal(result,'Electronic', 'genre is not correct');
    });
    
    parser.on('done', function(){
        test.finish();
    });

    parser.on('metadata', function(result) {
        test.equal(result.title, 'Blood Sugar');
        test.equal(result.artist, 'Pendulum');
        test.equal(result.album, 'Blood Sugar (Single)');
        test.equal(result.year, 2007);
        test.equal(result.track, 1);
        test.equal(result.genre, 'Electronic');
    });

    parser.parse();  
};

if (module == require.main) {
  require('async_testing').run(__filename, process.ARGV);
}