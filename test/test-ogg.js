var mm = require('../lib/index'),
    fs = require('fs'),
    assert = require('assert'),
    testHelper = require('./testHelper');
      
var sample = require('path').join(__dirname, 'samples/oggy.ogg');
var parser = new mm(fs.createReadStream(sample));

var testHelper = new testHelper(46, __filename);

parser.on('metadata', function(result) {
  assert.strictEqual(result.title, 'In Bloom');
  assert.deepEqual(result.artist, ['Nirvana']);
  assert.deepEqual(result.albumartist, ['Nirvana']);
  assert.strictEqual(result.album, 'Nevermind');
  assert.strictEqual(result.year, 1991);
  assert.strictEqual(result.track.no, 1);
  assert.strictEqual(result.track.of, 12);
  assert.strictEqual(result.disk.no, 1);
  assert.strictEqual(result.disk.of, 0);
  assert.deepEqual(result.genre, ['Grunge', 'Alternative']);
  assert.strictEqual(result.picture.format, 'jpg');
  assert.strictEqual(result.picture.data.length, 30966);
  testHelper.ranTests(12);
});

parser.on('title', function(result) {
  assert.strictEqual(result, 'In Bloom');
  testHelper.ranTests(1);
});

parser.on('artist', function(result) {
  assert.strictEqual(result, 'Nirvana');
  testHelper.ranTests(1);
});

parser.on('albumartist', function(result) {
  assert.strictEqual(result, 'Nirvana');
  testHelper.ranTests(1);
});

parser.on('album', function(result) {
  assert.strictEqual(result, 'Nevermind');
  testHelper.ranTests(1);
});

parser.on('year', function(result) {
  assert.strictEqual(result, '1991');
  testHelper.ranTests(1);
});

parser.on('track', function(result) {
  assert.strictEqual(result, '1');
  testHelper.ranTests(1);
});

parser.on('disk', function(result) {
  assert.strictEqual(result, '1');
  testHelper.ranTests(1);
});

var genAliasCounter = 0;
parser.on('genre', function(result) {
  switch(genAliasCounter) {
    case 0:
      assert.strictEqual(result, 'Grunge');
      testHelper.ranTests(1);
      break;
    case 1:
      assert.strictEqual(result, 'Alternative');
      testHelper.ranTests(1);
      break;
  }
  genAliasCounter++;
});

parser.on('picture', function(result) {
  assert.strictEqual(result.format, 'image/jpeg');
  assert.strictEqual(result.type, 'Cover (back)');
  assert.strictEqual(result.description, 'little willy');
  assert.strictEqual(result.data.length, 30966);
  testHelper.ranTests(4);
});

parser.on('TRACKTOTAL', function(result) {
  assert.strictEqual(result, '12');
  testHelper.ranTests(1);
});
    
parser.on('ALBUM', function(result) {
  assert.strictEqual(result, 'Nevermind');
  testHelper.ranTests(1);
});

parser.on('ARTIST', function(result) {
  assert.strictEqual(result, 'Nirvana');
  testHelper.ranTests(1)
});

var comCounter = 0;
parser.on('COMMENT', function(result) {
  switch(comCounter) {
    case 0:
      assert.strictEqual(result, 'Nirvana\'s Greatest Album');
      testHelper.ranTests(1);
      break;
    case 1:
      assert.strictEqual(result, 'And their greatest song');
      testHelper.ranTests(1);
      break;
  }
  comCounter++;
});

var genCounter = 0;
parser.on('GENRE', function(result) {
  switch(genCounter) {
    case 0:
      assert.strictEqual(result, 'Grunge');
      testHelper.ranTests(1);
      break;
    case 1:
      assert.strictEqual(result, 'Alternative');
      testHelper.ranTests(1);
      break;
  }
  genCounter++;
});

parser.on('TITLE', function(result) {
  assert.strictEqual(result, 'In Bloom');
  testHelper.ranTests(1);
});

parser.on('ALBUMARTIST', function(result) {
  assert.strictEqual(result, 'Nirvana');
  testHelper.ranTests(1);
});

parser.on('DISCNUMBER', function(result) {
  assert.strictEqual(result, '1');
  testHelper.ranTests(1);
});

parser.on('DATE', function(result) {
  assert.strictEqual(result, '1991');
  testHelper.ranTests(1);
});

parser.on('TRACKNUMBER', function(result) {
  assert.strictEqual(result, '1');
  testHelper.ranTests(1);
});

parser.on('METADATA_BLOCK_PICTURE', function(result) {
  assert.strictEqual(result.format, 'image/jpeg');
  assert.strictEqual(result.type, 'Cover (back)');
  assert.strictEqual(result.description, 'little willy');
  
  //test exact contents too
  assert.strictEqual(result.data.length, 30966);
  assert.strictEqual(result.data[0], 255);
  assert.strictEqual(result.data[1], 216);
  assert.strictEqual(result.data[result.data.length - 1], 217);
  assert.strictEqual(result.data[result.data.length - 2], 255);
  testHelper.ranTests(8);
});

parser.on('done', function(err) {
  if (err) throw err;
  testHelper.ranTests(1);
});