var id3 = require('../lib/index'),
    fs = require('fs'),
    testy = require('testy'),
    assert = testy.assert;

testy.expected = 45;

var sample = require('path').join(__dirname, 'samples/id3v2.2.mp3');
var parser = new id3(fs.createReadStream(sample));

parser.on('metadata', function(result) {
  assert.strictEqual(result.title, 'You Are The One');
  assert.strictEqual(result.artist[0], 'Shiny Toy Guns');
  assert.strictEqual(result.album, 'We Are Pilots');
  assert.strictEqual(result.year, 2006);
  assert.strictEqual(result.track.no, 1);
  assert.strictEqual(result.track.of, 11);
  assert.strictEqual(result.genre[0], 'Alternative');
  assert.strictEqual(result.picture[0].format, 'jpg');
  assert.strictEqual(result.picture[0].data.length, 99738);
});

//Aliased tests
parser.on('title', function(result) {
  assert.strictEqual(result, 'You Are The One');
});

parser.on('artist', function(result) {
  assert.deepEqual(result[0], 'Shiny Toy Guns');
});

parser.on('album', function(result) {
  assert.strictEqual(result, 'We Are Pilots');
});

parser.on('year', function(result) {
  assert.strictEqual(result, 2006);
});

parser.on('track', function(result) {
  assert.strictEqual(result.no, 1);
  assert.strictEqual(result.of, 11);
});

parser.on('genre', function(result) {
  assert.strictEqual(result[0], 'Alternative');
});

parser.on('picture', function(result) {
  assert.strictEqual(result[0].format, 'jpg');
  assert.strictEqual(result[0].data.length, 99738);
});

//Raw tests
parser.on('TP1', function(result) {
  assert.strictEqual(result, 'Shiny Toy Guns');
});

parser.on('TRK', function(result) {
  assert.strictEqual(result, '1/11');
});

parser.on('TYE', function(result) {
  assert.strictEqual(result, '2006');
});

parser.on('TEN', function(result) {
  assert.strictEqual(result, 'iTunes v7.0.2.16');
});

parser.on('TCO', function(result) {
  assert.strictEqual(result, '(20)'); //Alternative
});

parser.on('TAL', function(result) {
  assert.strictEqual(result, 'We Are Pilots');
});

parser.on('TT2', function(result) {
  assert.strictEqual(result, 'You Are The One');
});

parser.on('PIC', function(result) {
  assert.strictEqual(result.format, 'JPG');
  assert.strictEqual(result.type, 'Other');
  assert.strictEqual(result.description, '');
  assert.strictEqual(result.data.length, 99738); 
});

parser.on('ULT', function(result) {
  assert.strictEqual(result.descriptor, '');
  assert.strictEqual(result.language, 'eng');
  //skipping testing exact contents, bit naughty
  assert.strictEqual(result.text.length, 832);
});

var comCounter = 0;
//there are 3 comment frames in this file so we need to assert all 3 events
parser.on('COM', function(result) {
  switch(comCounter) {
    case 0:
      assert.strictEqual(result.language, 'eng');
      assert.strictEqual(result.short_description, 'iTunPGAP');
      assert.strictEqual(result.text, '0');
      break;
    case 1:
      assert.strictEqual(result.language, 'eng');
      assert.strictEqual(result.short_description, 'iTunNORM');
      assert.strictEqual(result.text, '0000299C 0000291D 0000DBE0 0000D6BA 0003C378 0003C2C1 0000902A 00008F1B 00012FC6 00015FBC');
      break;
    case 2:
      assert.strictEqual(result.language, 'eng');
      assert.strictEqual(result.short_description, 'iTunSMPB');
      assert.strictEqual(result.text, '00000000 00000210 00000AD4 0000000000B6499C 00000000 006327AD 00000000 00000000 00000000 00000000 00000000 00000000');
      break;
    case 3:
      assert.strictEqual(result.language, 'eng');
      assert.strictEqual(result.short_description, 'iTunes_CDDB_IDs');
      assert.strictEqual(result.text, '11+3ABC77F16B8A2F0F1E1A1EBAB868A98F+8210091');
      break;
  }
  comCounter++;    
});

parser.on('done', function(err) {
  if (err) throw err;
  assert.ok(true);
  testy.finish();
});