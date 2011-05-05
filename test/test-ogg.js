var mm = require('../lib/index'),
    fs = require('fs'),
    assert = require('assert'),
    testHelper = require('./testHelper');
      
var testHelper = new testHelper(47, __filename);
var sample = require('path').join(__dirname, 'samples/oggy.ogg');
var parser = new mm(fs.createReadStream(sample));

parser.on('metadata', function(result) {
  assert.strictEqual(result.title, 'In Bloom');
  assert.strictEqual(result.artist[0], 'Nirvana');
  assert.strictEqual(result.albumartist[0], 'Nirvana');
  assert.strictEqual(result.album, 'Nevermind');
  assert.strictEqual(result.year, 1991);
  assert.strictEqual(result.track.no, 1);
  assert.strictEqual(result.track.of, 12);
  assert.strictEqual(result.disk.no, 1);
  assert.strictEqual(result.disk.of, 0);
  assert.strictEqual(result.genre[0], 'Grunge');
  assert.strictEqual(result.genre[1], 'Alternative');
  assert.strictEqual(result.picture[0].format, 'jpg');
  assert.strictEqual(result.picture[0].data.length, 30966);
  testHelper.ranTests(13);
});

//Aliased tests
parser.on('title', function(result) {
  assert.strictEqual(result, 'In Bloom');
  testHelper.ranTests(1);
});

parser.on('artist', function(result) {
  assert.strictEqual(result[0], 'Nirvana');
  testHelper.ranTests(1);
});

parser.on('albumartist', function(result) {
  assert.strictEqual(result[0], 'Nirvana');
  testHelper.ranTests(1);
});

parser.on('album', function(result) {
  assert.strictEqual(result, 'Nevermind');
  testHelper.ranTests(1);
});

parser.on('year', function(result) {
  assert.strictEqual(result, 1991);
  testHelper.ranTests(1);
});

parser.on('track', function(result) {
  assert.strictEqual(result.no, 1);
  assert.strictEqual(result.of, 12);
  testHelper.ranTests(2);
});

parser.on('disk', function(result) {
  assert.strictEqual(result.no, 1);
  assert.strictEqual(result.of, 0);
  testHelper.ranTests(2);
});

parser.on('genre', function(result) {
  assert.strictEqual(result[0], 'Grunge');
  assert.strictEqual(result[1], 'Alternative');
  testHelper.ranTests(2);
});

parser.on('picture', function(result) {
  assert.strictEqual(result[0].format, 'jpg');
  assert.strictEqual(result[0].data.length, 30966);
  testHelper.ranTests(2);
});

//Raw tests
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