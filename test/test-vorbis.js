var vorbis = require('../lib/index'),
    fs = require('fs'),
    assert = require('assert'),
    testsRan = 0;
      
var sample = require('path').join(__dirname, 'samples/vorbis.ogg');
var parser = new vorbis(fs.createReadStream(sample));

parser.on('metadata', function(result) {
  assert.strictEqual(result.title, 'In Bloom');
  assert.deepEqual(result.artist, ['Nirvana']);
  assert.deepEqual(result.albumartist, ['Nirvana']);
  assert.strictEqual(result.album, 'Nevermind');
  assert.strictEqual(result.year, 1991);
  assert.strictEqual(result.track[0], 1);
  assert.strictEqual(result.track[1], 12);
  assert.strictEqual(result.disk[0], 1);
  assert.strictEqual(result.disk[1], 1);
  assert.deepEqual(result.genre, ['Grunge', 'Alternative']);
  testsRan += 10;
});

parser.on('title', function(result) {
  assert.strictEqual(result, 'In Bloom');
  testsRan++;
});

parser.on('artist', function(result) {
  assert.strictEqual(result, 'Nirvana');
  testsRan++;
});

parser.on('albumartist', function(result) {
  assert.strictEqual(result, 'Nirvana');
  testsRan++;
});

parser.on('album', function(result) {
  assert.strictEqual(result, 'Nevermind');
  testsRan++;
});

parser.on('year', function(result) {
  assert.strictEqual(result, '1991');
  testsRan++;
});

parser.on('track', function(result) {
  assert.strictEqual(result, '1');
  testsRan++;
});

parser.on('disk', function(result) {
  assert.strictEqual(result, '1');
  testsRan++;
});

var genAliasCounter = 0;
parser.on('genre', function(result) {
  switch(genAliasCounter) {
    case 0:
      assert.strictEqual(result, 'Grunge');
      testsRan++;
      break;
    case 1:
      assert.strictEqual(result, 'Alternative');
      testsRan++;
      break;
  }
  genAliasCounter++;
});

parser.on('TRACKTOTAL', function(result) {
  assert.strictEqual(result, '12');
  testsRan++;
});
    
parser.on('ALBUM', function(result) {
  assert.strictEqual(result, 'Nevermind');
  testsRan++;
});

parser.on('ARTIST', function(result) {
  assert.strictEqual(result, 'Nirvana');
  testsRan++
});

var comCounter = 0;
parser.on('COMMENT', function(result) {
  switch(comCounter) {
    case 0:
      assert.strictEqual(result, 'Nirvana\'s Greatest Album');
      testsRan++;
      break;
    case 1:
      assert.strictEqual(result, 'And their greatest song');
      testsRan++;
      break;
  }
  comCounter++;
});

var genCounter = 0;
parser.on('GENRE', function(result) {
  switch(genCounter) {
    case 0:
      assert.strictEqual(result, 'Grunge');
      testsRan++;
      break;
    case 1:
      assert.strictEqual(result, 'Alternative');
      testsRan++;
      break;
  }
  genCounter++;
});

parser.on('TITLE', function(result) {
  assert.strictEqual(result, 'In Bloom');
  testsRan++;
});

parser.on('ALBUMARTIST', function(result) {
  assert.strictEqual(result, 'Nirvana');
  testsRan++;
});

parser.on('DISCNUMBER', function(result) {
  assert.strictEqual(result, '1');
  testsRan++;
});

parser.on('DATE', function(result) {
  assert.strictEqual(result, '1991');
  testsRan++;
});

parser.on('TRACKNUMBER', function(result) {
  assert.strictEqual(result, '1');
  testsRan++;
});

parser.on('METADATA_BLOCK_PICTURE', function(result) {
  assert.strictEqual(result.format, 'Cover (back)');
  assert.strictEqual(result.type, 'image/jpeg');
  assert.strictEqual(result.description, 'little willy');
  
  //test exact contents too
  assert.strictEqual(result.data.length, 30966);
  assert.strictEqual(result.data[0], 255);
  assert.strictEqual(result.data[1], 216);
  assert.strictEqual(result.data[result.data.length - 1], 217);
  assert.strictEqual(result.data[result.data.length - 2], 255);
  testsRan+=8;
});

parser.on('done', function(result) {
  assert.equal(testsRan, 39);
  console.log(__filename + ' ran ' + testsRan + ' tests');
});