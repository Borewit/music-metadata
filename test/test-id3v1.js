var id3 = require('../lib/id3v1'),
      fs = require('fs');

exports['id3v1'] = function(test) {
    test.numAssertions = 6;
    var id3v1 = new id3(fs.readFileSync('samples/id3v1.mp3'));
    var tags = id3v1.parse();
    
    test.equal(tags.title, 'Blood Sugar', 'title is not correct');
    test.equal(tags.artist, 'Pendulum', 'artist is not correct');
    test.equal(tags.album, 'Blood Sugar (Single)', 'album is not correct');
    test.equal(tags.comment, 'abcdefg', 'comment is not correct');
    test.equal(tags.genre,'Electronic', 'genre is not correct');
    test.equal(tags.year,'2007', 'year is not correct');
    
    test.finish();
};

if (module == require.main) {
  require('async_testing').run(__filename, process.ARGV);
}