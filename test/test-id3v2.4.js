var id3 = require('../lib/index'),
    fs = require('fs'),
    assert = require('assert'),
    testsRan = 0;
        
var sample = require('path').join(__dirname, 'samples/id3v2.4.mp3');
var parser = new id3(fs.createReadStream(sample));

parser.on('metadata', function(result) {
  assert.strictEqual(result.title, 'Home');
  assert.deepEqual(result.artist, ['Explo','ions','nodejsftws']);
  assert.deepEqual(result.albumartist, ['Soundtrack']);
  assert.strictEqual(result.album, 'Friday Night Lights [Original Movie Soundtrack]');
  assert.strictEqual(result.year, 2004);
  assert.strictEqual(result.track[0], 5);
  assert.strictEqual(result.track[1], 0);
  assert.strictEqual(result.disk[0], 1);
  assert.strictEqual(result.disk[1], 1);
  assert.deepEqual(result.genre, ['Soundtrack', 'OST']);
  testsRan += 10;
});

parser.on('title', function(result) {
  assert.strictEqual(result, 'Home');
  testsRan++;
});

parser.on('artist', function(result) {
  assert.strictEqual(result, 'Explo/ions/nodejsftws');
  testsRan++;
});

parser.on('albumartist', function(result) {
  assert.strictEqual(result, 'Soundtrack');
  testsRan++;
});

parser.on('album', function(result) {
  assert.strictEqual(result, 'Friday Night Lights [Original Movie Soundtrack]');
  testsRan++;
});

parser.on('year', function(result) {
  assert.strictEqual(result, '2004');
  testsRan++;
});

parser.on('track', function(result) {
  assert.strictEqual(result, '5');
  testsRan++;
});

parser.on('disk', function(result) {
  assert.strictEqual(result, '1/1');
  testsRan++;
});

parser.on('genre', function(result) {
  assert.strictEqual(result, 'Soundtrack/OST');
  testsRan++;;
});

parser.on('TALB', function(result) {
  assert.strictEqual(result, 'Friday Night Lights [Original Movie Soundtrack]');
  testsRan++;
});

parser.on('TPE1', function(result) {
  assert.strictEqual(result, 'Explo/ions/nodejsftws');
  testsRan++;
});

parser.on('TPE2', function(result) {
  assert.strictEqual(result, 'Soundtrack');
  testsRan++;
});

parser.on('TCOM', function(result) {
  assert.strictEqual(result, 'Explosions in the Sky');
  testsRan++;
});

parser.on('TPOS', function(result) {
  assert.strictEqual(result, '1/1');
  testsRan++;
});

parser.on('TCON', function(result) {
  assert.strictEqual(result, 'Soundtrack/OST');
  testsRan++;
});

parser.on('TIT2', function(result) {
  assert.strictEqual(result, 'Home');
  testsRan++;
});

parser.on('TRCK', function(result) {
  assert.strictEqual(result, '5');
  testsRan++;
});

parser.on('TDRC', function(result) {
  assert.strictEqual(result, '2004');
  testsRan++;
});

parser.on('APIC', function(result) {
  assert.strictEqual(result.format, 'image/jpg');
  assert.strictEqual(result.type, 'Cover (front)');
  assert.strictEqual(result.description, 'some description');
  assert.strictEqual(result.data.length, 80938);
  testsRan += 4;
});

parser.on('done', function(result) {
  assert.equal(testsRan, 31);
  console.log(__filename + ' ran ' + testsRan + ' tests');
});