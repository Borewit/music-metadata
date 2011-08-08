var id3 = require('../lib/index'),
    fs = require('fs'),
    testy = require('testy')(),
    assert = testy.assert;
        
testy.expected = 52;

var sample = require('path').join(__dirname, 'samples/id3v2.4.mp3');
var parser = new id3(fs.createReadStream(sample));

parser.on('metadata', function(result) {
  assert.strictEqual(result.title, 'Home');
  assert.strictEqual(result.artist[0], 'Explo');
  assert.strictEqual(result.artist[1], 'ions');
  assert.strictEqual(result.artist[2], 'nodejsftws');
  assert.strictEqual(result.albumartist[0], 'Soundtrack');
  assert.strictEqual(result.album, 'Friday Night Lights [Original Movie Soundtrack]');
  assert.strictEqual(result.year, '2004');
  assert.strictEqual(result.track.no, 5);
  assert.strictEqual(result.track.of, 0);
  assert.strictEqual(result.disk.no, 1);
  assert.strictEqual(result.disk.of, 1);
  assert.strictEqual(result.genre[0], 'Soundtrack');
  assert.strictEqual(result.genre[1], 'OST');
  assert.strictEqual(result.picture[0].format, 'jpg');
  assert.strictEqual(result.picture[0].data.length, 80938);
  assert.strictEqual(result.picture[1].format, 'jpg');
  assert.strictEqual(result.picture[1].data.length, 80938);
});

//Aliased tests
parser.on('title', function(result) {
  assert.strictEqual(result, 'Home');
});

parser.on('artist', function(result) {
  assert.strictEqual(result[0], 'Explo');
  assert.strictEqual(result[1], 'ions');
  assert.strictEqual(result[2], 'nodejsftws');
});

parser.on('albumartist', function(result) {
  assert.strictEqual(result[0], 'Soundtrack');
});

parser.on('album', function(result) {
  assert.strictEqual(result, 'Friday Night Lights [Original Movie Soundtrack]');
});

parser.on('year', function(result) {
  assert.strictEqual(result, '2004');
});

parser.on('track', function(result) {
  assert.strictEqual(result.no, 5);
  assert.strictEqual(result.of, 0);
});

parser.on('disk', function(result) {
  assert.strictEqual(result.no, 1);
  assert.strictEqual(result.of, 1);
});

parser.on('genre', function(result) {
  assert.strictEqual(result[0], 'Soundtrack');
  assert.strictEqual(result[1], 'OST');
});

parser.on('picture', function(result) {
  assert.strictEqual(result[0].format, 'jpg');
  assert.strictEqual(result[0].data.length, 80938);
  assert.strictEqual(result[1].format, 'jpg');
  assert.strictEqual(result[1].data.length, 80938);
});

//Raw tests
parser.on('TALB', function(result) {
  assert.strictEqual(result, 'Friday Night Lights [Original Movie Soundtrack]');
});

parser.on('TPE1', function(result) {
  assert.strictEqual(result, 'Explo/ions/nodejsftws');
});

parser.on('TPE2', function(result) {
  assert.strictEqual(result, 'Soundtrack');
});

parser.on('TCOM', function(result) {
  assert.strictEqual(result, 'Explosions in the Sky');
});

parser.on('TPOS', function(result) {
  assert.strictEqual(result, '1/1');
});

parser.on('TCON', function(result) {
  assert.strictEqual(result, 'Soundtrack/OST');
});

parser.on('TIT2', function(result) {
  assert.strictEqual(result, 'Home');
});

parser.on('TRCK', function(result) {
  assert.strictEqual(result, '5');
});

parser.on('TDRC', function(result) {
  assert.strictEqual(result, '2004');
});

var apicCounter = 0;
parser.on('APIC', function(result) {
  if (apicCounter === 0) {
    assert.strictEqual(result.format, 'image/jpg');
    assert.strictEqual(result.type, 'Cover (front)');
    assert.strictEqual(result.description, 'some description');
    assert.strictEqual(result.data.length, 80938);
  }
  if (apicCounter === 1) {
    assert.strictEqual(result.format, 'image/jpeg');
    assert.strictEqual(result.type, 'Cover (back)');
    assert.strictEqual(result.description, 'back');
    assert.strictEqual(result.data.length, 80938);
  }
  apicCounter++;
});

parser.on('done', function(err) {
  if (err) throw err;
  assert.ok(true);
  testy.finish();
});