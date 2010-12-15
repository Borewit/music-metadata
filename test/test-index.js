var index = require('../lib/index'),
    fs    = require('fs');
    
var id3 = new index(fs.createReadStream('samples/id3v2.3.mp3'));
    
exports['index'] = function(test) {
    test.numAssertions = 22;
    
    id3.on('album', function(result){
        test.equal(result, 'Friday Night Lights [Original Movie Soundtrack]', 'album failed');  
    });
    
    id3.on('artist', function(result){
        test.equal(result, 'Explosions In The Sky/Another/And Another', 'artist failed');  
    });
    
    id3.on('albumartist', function(result){
        test.equal(result, 'Soundtrack', 'albumartist failed');  
    });
    
    id3.on('composer', function(result){
        test.equal(result, 'Explosions in the Sky', 'composer failed');  
    });
    
    id3.on('disk', function(result){
        test.equal(result, '1/1', 'composer failed');  
    });
    
    id3.on('genre', function(result){
        test.equal(result, 'Soundtrack', 'genre failed');  
    });
    
    id3.on('title', function(result){
        test.equal(result, 'Home', 'title failed');  
    });
    
    id3.on('track', function(result){
        test.equal(result, 5, 'track failed');  
    });
    
    id3.on('year', function(result){
        test.equal(result, 2004, 'year failed');  
    });
    
    id3.on('picture', function(result){
        test.equal(result.format, 'image/jpg', 'picture format failed');
        test.equal(result.type, 'Cover (front)', 'picture type failed');
        test.equal(result.description, '', 'picture description failed');
        test.equal(result.data.length, 80938, 'picture length failed');   
    });
    
    id3.on('metadata', function(result){
        test.equal(result.title, 'Home', 'metadata title failed');
        test.equal(result.albumartist, 'Soundtrack', 'metadata albumartist failed');
        test.equal(result.artist, 'Explosions In The Sky/Another/And Another', 'metadata artist failed');
        test.equal(result.album, 'Friday Night Lights [Original Movie Soundtrack]', 'metadata album failed');
        test.equal(result.disk, '1/1', 'metdata disk failed');
        test.equal(result.genre, 'Soundtrack', 'metadata genre failed');
        test.equal(result.track, 5, 'metadata track failed');
        test.equal(result.year, 2004, 'metadata year failed');
    });
    
    id3.on('done', function(result){
        test.ok(true);
    });
    
    //TODO: implement id3.on('done') everywhere so we don't have to wait a long time for the test
    //can't use stream.on('end') because this could occur before the test has chance to capture
    //all tests
    setTimeout(function() {
        test.finish();
    },1000);

    id3.parse();
};

if (module == require.main) {
  require('async_testing').run(__filename, process.ARGV);
}