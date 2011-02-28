var id3v2 = require('../lib/index'),
      fs = require('fs');

exports['id3v2.3'] = function(test) {
    test.numAssertions = 21;
    
    var id3 = new id3v2(fs.createReadStream('samples/id3v2.3.mp3'));
    
    id3.on('metadata', function(result){
        test.equal(result.title, 'Home');
        test.equal(result.artist, 'Explosions In The Sky/Another/And Another');
        test.equal(result.albumartist, 'Soundtrack');
        test.equal(result.album, 'Friday Night Lights [Original Movie Soundtrack]');
        test.equal(result.year, 2004);
        test.equal(result.track, 5);
        test.equal(result.disk, '1/1');
        test.equal(result.genre, 'Soundtrack');
    });
    
    id3.on('TALB', function(result){
        test.equal(result, 'Friday Night Lights [Original Movie Soundtrack]', 'TALB failed');
    });
    
    id3.on('TPE1', function(result){
        test.equal(result, 'Explosions In The Sky/Another/And Another', 'TPE1 failed');
    });
    
    id3.on('TPE2', function(result){
        test.equal(result, 'Soundtrack', 'TPE2 failed');
    });
    
    id3.on('TCOM', function(result){
        test.equal(result, 'Explosions in the Sky', 'TCOM failed');
    });

    id3.on('TPOS', function(result){
        test.equal(result, '1/1', 'TPOS failed');
    });
    
    id3.on('TCON', function(result){
        test.equal(result, 'Soundtrack', 'TCON failed');
    });
    
    id3.on('TIT2', function(result){
        test.equal(result, 'Home', 'TIT2 failed');
    });
    
    id3.on('TRCK', function(result){
        test.equal(result, 5, 'TRCK failed');
    });
    
    id3.on('TYER', function(result){
        test.equal(result, 2004, 'TYER failed');
    });
    
    id3.on('APIC', function(result){
        test.equal(result.format, 'image/jpg');
        test.equal(result.type, 'Cover (front)');
        test.equal(result.description, '');
        test.equal(result.data.length, 80938);
    });
   
    // TODO: test/impl for TXXX
    
    id3.on('done', function(result){
        test.finish();
    });
    
    id3.parse();
};

if (module == require.main) {
  require('async_testing').run(__filename, process.ARGV);
}