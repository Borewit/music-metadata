var vb = require('../lib/vorbis'),
    fs = require('fs');
      
exports['vorbis'] = function(test) { 
    test.numAssertions = 13;
    
    var vorbis = new vb(fs.createReadStream('samples/vorbis.ogg'));
    
    vorbis.on('TRACKTOTAL', function(result){
        test.equal(result, 12, 'TRACKTOTAL failed');
    });
    
    vorbis.on('ALBUM', function(result){
        test.equal(result, 'Nevermind', 'ALBUM failed');
    });
    
    vorbis.on('ARTIST', function(result){
        test.equal(result, 'Nirvana', 'ARTIST failed');
    });
    
    var comCounter = 0;
    vorbis.on('COMMENT', function(result){
        switch(comCounter){
            case 0:
                test.equal(result, 'Nirvana\'s Greatest Album', 'COMMENT 1 failed');
                break;
            case 1:
                test.equal(result, 'And their greatest song', 'COMMENT 2 failed');
                break;
        }
        comCounter++;
    });
    
    var genCounter = 0;
    vorbis.on('GENRE', function(result){
        switch(genCounter){
            case 0:
                test.equal(result, 'Grunge', 'GENRE 1 failed');
                break;
            case 1:
                test.equal(result, 'Alternative', 'GENRE 2 failed');
                break;
        }
        genCounter++;
    });
    
    vorbis.on('TITLE', function(result){
        test.equal(result, 'In Bloom', 'TITLE failed');
    });
    
    vorbis.on('ALBUMARTIST', function(result){
        test.equal(result, 'Nirvana', 'ALBUMARTIST failed');
    });
    
    vorbis.on('DISCNUMBER', function(result){
        test.equal(result, '1', 'DISCNUMBER failed');
    });
    
    vorbis.on('DATE', function(result){
        test.equal(result, '1991', 'DATE failed');
    });
    
    vorbis.on('TRACKNUMBER', function(result){
        test.equal(result, '1', 'DISCNUMBER failed');
    });
    
    vorbis.on('METADATA_BLOCK_PICTURE', function(result){
        test.equal(result.format, 'Cover (front)', 'METADATA_BLOCK_PICTURE format failed');
        test.equal(result.type, 'image/jpeg', 'METADATA_BLOCK_PICTURE type failed');
        
        fs.writeFileSync('test.jpg', result.data);
        
        test.equal(result.data.length, 30966);
        
        
        
        test.finish();
    });
    
    
    
    vorbis.parse();
}

if (module == require.main) {
  require('async_testing').run(__filename, process.ARGV);
}