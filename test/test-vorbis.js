var vorbis = require('../lib/index'),
    fs = require('fs'),
    assert = require('assert'),
    testsRan = 0;
      
var parser = new vorbis(fs.createReadStream('samples/vorbis.ogg'));

parser.on('metadata', function(result) {
    assert.equal(result.title, 'In Bloom');
    assert.equal(result.artist, 'Nirvana');
    assert.equal(result.album, 'Nevermind');
    assert.equal(result.year, 1991);
    assert.equal(result.track, 1);
    assert.deepEqual(result.genre, ['Grunge', 'Alternative']);
    testsRan += 6;
});

parser.on('TRACKTOTAL', function(result) {
    assert.equal(result, 12);
    testsRan++;
});
    
parser.on('ALBUM', function(result) {
    assert.equal(result, 'Nevermind');
    testsRan++;
});

parser.on('ARTIST', function(result) {
    assert.equal(result, 'Nirvana');
    testsRan++
});

var comCounter = 0;
parser.on('COMMENT', function(result) {
    switch(comCounter) {
        case 0:
            assert.equal(result, 'Nirvana\'s Greatest Album');
            testsRan++;
            break;
        case 1:
            assert.equal(result, 'And their greatest song');
            testsRan++;
            break;
    }
    comCounter++;
});

var genCounter = 0;
parser.on('GENRE', function(result) {
    switch(genCounter) {
        case 0:
            assert.equal(result, 'Grunge');
            testsRan++;
            break;
        case 1:
            assert.equal(result, 'Alternative');
            testsRan++;
            break;
    }
    genCounter++;
});

parser.on('TITLE', function(result) {
    assert.equal(result, 'In Bloom');
    testsRan++;
});

parser.on('ALBUMARTIST', function(result) {
    assert.equal(result, 'Nirvana');
    testsRan++;
    
});

parser.on('DISCNUMBER', function(result) {
    assert.equal(result, '1');
    testsRan++;
});

parser.on('DATE', function(result) {
    assert.equal(result, '1991');
    testsRan++;
});

parser.on('TRACKNUMBER', function(result) {
    assert.equal(result, '1');
    testsRan++;
});

parser.on('METADATA_BLOCK_PICTURE', function(result) {
    assert.equal(result.format, 'Cover (back)');
    assert.equal(result.type, 'image/jpeg');
    assert.equal(result.description, 'little willy');
    
    //test exact contents too
    assert.equal(result.data.length, 30966);
    assert.equal(result.data[0], 255);
    assert.equal(result.data[1], 216);
    assert.equal(result.data[result.data.length - 1], 217);
    assert.equal(result.data[result.data.length - 2], 255);
    testsRan+= 8;
});

parser.on('done', function(result) {
    assert.equal(testsRan, 26);
    console.log(__filename + ' ran ' + testsRan + ' tests');
});
  
parser.parse();