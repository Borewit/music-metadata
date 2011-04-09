var id3 = require('../lib/index'),
      fs = require('fs'),
      assert = require('assert'),
      testsRan = 0;
        
var parser = new id3(fs.createReadStream('samples/id4.m4a'));

parser.on('metadata', function(result) {
    assert.equal(result.title, 'Voodoo People (Pendulum Remix)');
    assert.equal(result.artist, 'The Prodigy');
    assert.equal(result.albumartist, 'Pendulum');
    assert.equal(result.album, 'Voodoo People');
    assert.equal(result.year, 2005);
    assert.deepEqual(result.track, [1,0]);
    assert.deepEqual(result.disk, [1,1]);
    assert.equal(result.genre, 'Electronic');
    testsRan += 8;
});

parser.on('trkn', function(result){
    assert.deepEqual(result, [1,0]);
    testsRan++;
});

parser.on('disk', function(result){
    assert.deepEqual(result, [1,1]);
    testsRan++;
});

parser.on('tmpo', function(result){
    assert.equal(result, 0);
    testsRan++;
});

parser.on('gnre', function(result){
    assert.equal(result, 'Electronic');
    testsRan++;
});

parser.on('stik', function(result){
    assert.equal(result, 256);
    testsRan++;
});

parser.on('©alb', function(result){
    assert.equal(result, 'Voodoo People');
    testsRan++;
});

parser.on('©ART', function(result){
    assert.equal(result, 'The Prodigy');
    testsRan++;
});

parser.on('aART', function(result){
    assert.equal(result, 'Pendulum');
    testsRan++;
});

parser.on('©cmt', function(result){
    assert.equal(result, '(Pendulum Remix)');
    testsRan++;
});

parser.on('©wrt', function(result){
    assert.equal(result, 'Liam Howlett');
    testsRan++;
});

parser.on('©nam', function(result){
    assert.equal(result, 'Voodoo People (Pendulum Remix)');
    testsRan++;
});

parser.on('©too', function(result){
    assert.equal(result, 'Lavf52.36.0');
    testsRan++;
});

parser.on('©day', function(result){
    assert.equal(result, 2005);
    testsRan++;
});

parser.on('covr', function(result){
    assert.equal(result.format, 'image/jpeg');
    assert.equal(result.data.length, 196450);
    testsRan += 2;
});

parser.on('done', function(){
    assert.equal(testsRan, 23);
    console.log(__filename + ' ran ' + testsRan + ' tests');
});

parser.parse();