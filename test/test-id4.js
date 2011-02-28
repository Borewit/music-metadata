var id4 = require('../lib/index'),
      fs = require('fs');
      
exports['id4'] = function(test) {
    test.numAssertions = 23;
    
    var id3 = new id4(fs.createReadStream('samples/id4.m4a'));
    
    id3.on('metadata', function(result){
        test.equal(result.title, 'Voodoo People (Pendulum Remix)');
        test.equal(result.artist, 'The Prodigy');
        test.equal(result.albumartist, 'Pendulum');
        test.equal(result.album, 'Voodoo People');
        test.equal(result.year, 2005);
        test.deepEqual(result.track, [1,0]);
        test.deepEqual(result.disk, [1,1]);
        test.equal(result.genre, 'Electronic');
    });
    
    id3.on('trkn', function(result){
        test.deepEqual(result, [1,0], 'trkn failed');
    });
    
    id3.on('disk', function(result){
        test.deepEqual(result, [1,1], 'disk failed');
    });
    
    id3.on('tmpo', function(result){
        test.equal(result, 0, 'tmpo failed');
    });
    
    id3.on('gnre', function(result){
        test.equal(result, 'Electronic', 'gnre failed');
    });
    
    id3.on('stik', function(result){
        test.equal(result, 256, 'stik failed');
    });
    
    id3.on('©alb', function(result){
        test.equal(result, 'Voodoo People', '©alb failed');
    });
    
    id3.on('©ART', function(result){
        test.equal(result, 'The Prodigy', '©ART failed');
    });
    
    id3.on('aART', function(result){
        test.equal(result, 'Pendulum', 'aART failed');
    });
    
    id3.on('©cmt', function(result){
        test.equal(result, '(Pendulum Remix)', '©cmt failed');
    });
    
    id3.on('©wrt', function(result){
        test.equal(result, 'Liam Howlett', '©wrt failed');
    });
    
    id3.on('©nam', function(result){
        test.equal(result, 'Voodoo People (Pendulum Remix)', '©nam failed');
    });
    
    id3.on('©too', function(result){
        test.equal(result, 'Lavf52.36.0', '©too failed');
    });
    
    id3.on('©day', function(result){
        test.equal(result, 2005, '©day failed');
    });
    
    id3.on('covr', function(result){
        test.equal(result.format, 'image/jpeg');
        test.equal(result.data.length, 196450);
    });
 
    id3.on('done', function(){
        test.finish();
    });
    
    id3.parse();
};

if (module == require.main) {
  require('async_testing').run(__filename, process.ARGV);
}