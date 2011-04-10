var id3 = require('../lib/index'),
    fs = require('fs'),
    assert = require('assert'),
    testsRan = 0;
        
var parser = new id3(fs.createReadStream('samples/id3v2.2.mp3'));

parser.on('metadata', function(result) {
  assert.equal(result.title, 'You Are The One');
  assert.equal(result.artist, 'Shiny Toy Guns');
  assert.equal(result.album, 'We Are Pilots');
  assert.equal(result.year, 2006);
  assert.deepEqual(result.track, [1, 11]);
  assert.equal(result.genre, 'Alternative');
  testsRan += 6;
});

parser.on('TP1', function(result) {
  assert.equal(result, 'Shiny Toy Guns');
  testsRan++;
});

parser.on('TRK', function(result) {
  assert.equal(result, '1/11');
  testsRan++;
});

parser.on('TYE', function(result) {
  assert.equal(result, 2006);
  testsRan++;
});

parser.on('TEN', function(result) {
  assert.equal(result, 'iTunes v7.0.2.16');
  testsRan++;
});

parser.on('TCO', function(result) {
  assert.equal(result, 'Alternative');
  testsRan++;
});

parser.on('TAL', function(result) {
  assert.equal(result, 'We Are Pilots');
  testsRan++;
});

parser.on('TT2', function(result) {
  assert.equal(result, 'You Are The One');
  testsRan++;
});

parser.on('PIC', function(result) {
  assert.equal(result.format, 'JPG');
  assert.equal(result.type, 'Other');
  assert.equal(result.description, '');
  assert.equal(result.data.length, 99738);
  testsRan += 4;    
});

parser.on('ULT', function(result) {
  assert.equal(result.descriptor, '');
  assert.equal(result.language, 'eng');
  //skipping testing exact contents, bit naughty
  assert.equal(result.text.length, 832);
  testsRan += 3;    
});

var comCounter = 0;
//there are 3 comment frames in this file so we need to assert all 3 events
parser.on('COM', function(result) {
  assert.equal(result.language, 'eng');
  testsRan++;
  switch(comCounter) {
    case 0:
      assert.equal(result.short_description, 'iTunPGAP');
      assert.equal(result.text, '0');
      testsRan += 2;
      break;
    case 1:
      assert.equal(result.short_description, 'iTunNORM');
      assert.equal(result.text, '0000299C 0000291D 0000DBE0 0000D6BA 0003C378 0003C2C1 0000902A 00008F1B 00012FC6 00015FBC');
      testsRan += 2;
      break;
    case 2:
      assert.equal(result.short_description, 'iTunSMPB');
      assert.equal(result.text, '00000000 00000210 00000AD4 0000000000B6499C 00000000 006327AD 00000000 00000000 00000000 00000000 00000000 00000000');
      testsRan += 2;
      break;
    case 3:
      assert.equal(result.short_description, 'iTunes_CDDB_IDs');
      assert.equal(result.text, '11+3ABC77F16B8A2F0F1E1A1EBAB868A98F+8210091');
      testsRan += 2;
      break;
  }
  comCounter++;    
});

parser.on('done', function() {
  assert.equal(testsRan, 32);
  console.log(__filename + ' ran ' + testsRan + ' tests');
});