var id3 = require('../lib/index'),
    fs = require('fs'),
    assert = require('assert'),
    testsRan = 0;

var sample = require('path').join(__dirname, 'samples/id3v2.2.mp3');
var parser = new id3(fs.createReadStream(sample));

parser.on('metadata', function(result) {
  assert.strictEqual(result.title, 'You Are The One');
  assert.deepEqual(result.artist, ['Shiny Toy Guns']);
  assert.strictEqual(result.album, 'We Are Pilots');
  assert.strictEqual(result.year, 2006);
  assert.strictEqual(result.track[0], 1);
  assert.strictEqual(result.track[1], 11);
  assert.deepEqual(result.genre, ['Alternative']);
  testsRan += 7;
});

parser.on('title', function(result) {
  assert.strictEqual(result, 'You Are The One');
  testsRan++;
});

parser.on('artist', function(result) {
  assert.deepEqual(result, ['Shiny Toy Guns']);
  testsRan++;
});

parser.on('album', function(result) {
  assert.strictEqual(result, 'We Are Pilots');
  testsRan++;
});

parser.on('year', function(result) {
  assert.strictEqual(result, 2006);
  testsRan++;
});

parser.on('track', function(result) {
  assert.strictEqual(result[0], 1);
  assert.strictEqual(result[1], 11);
  testsRan+=2;
});

parser.on('genre', function(result) {
  assert.deepEqual(result, ['Alternative']);
  testsRan++;
});

parser.on('TP1', function(result) {
  assert.strictEqual(result, 'Shiny Toy Guns');
  testsRan++;
});

parser.on('TRK', function(result) {
  assert.strictEqual(result, '1/11');
  testsRan++;
});

parser.on('TYE', function(result) {
  assert.strictEqual(result, '2006');
  testsRan++;
});

parser.on('TEN', function(result) {
  assert.strictEqual(result, 'iTunes v7.0.2.16');
  testsRan++;
});

parser.on('TCO', function(result) {
  assert.strictEqual(result, '(20)'); //Alternative
  testsRan++;
});

parser.on('TAL', function(result) {
  assert.strictEqual(result, 'We Are Pilots');
  testsRan++;
});

parser.on('TT2', function(result) {
  assert.strictEqual(result, 'You Are The One');
  testsRan++;
});

parser.on('PIC', function(result) {
  assert.strictEqual(result.format, 'JPG');
  assert.strictEqual(result.type, 'Other');
  assert.strictEqual(result.description, '');
  assert.strictEqual(result.data.length, 99738);
  testsRan += 4;    
});

parser.on('ULT', function(result) {
  assert.strictEqual(result.descriptor, '');
  assert.strictEqual(result.language, 'eng');
  //skipping testing exact contents, bit naughty
  assert.strictEqual(result.text.length, 832);
  testsRan += 3;    
});

var comCounter = 0;
//there are 3 comment frames in this file so we need to assert all 3 events
parser.on('COM', function(result) {
  assert.strictEqual(result.language, 'eng');
  testsRan++;
  switch(comCounter) {
    case 0:
      assert.strictEqual(result.short_description, 'iTunPGAP');
      assert.strictEqual(result.text, '0');
      testsRan += 2;
      break;
    case 1:
      assert.strictEqual(result.short_description, 'iTunNORM');
      assert.strictEqual(result.text, '0000299C 0000291D 0000DBE0 0000D6BA 0003C378 0003C2C1 0000902A 00008F1B 00012FC6 00015FBC');
      testsRan += 2;
      break;
    case 2:
      assert.strictEqual(result.short_description, 'iTunSMPB');
      assert.strictEqual(result.text, '00000000 00000210 00000AD4 0000000000B6499C 00000000 006327AD 00000000 00000000 00000000 00000000 00000000 00000000');
      testsRan += 2;
      break;
    case 3:
      assert.strictEqual(result.short_description, 'iTunes_CDDB_IDs');
      assert.strictEqual(result.text, '11+3ABC77F16B8A2F0F1E1A1EBAB868A98F+8210091');
      testsRan += 2;
      break;
  }
  comCounter++;    
});

parser.on('done', function() {
  assert.strictEqual(testsRan, 40);
  console.log(__filename + ' ran ' + testsRan + ' tests');
});2