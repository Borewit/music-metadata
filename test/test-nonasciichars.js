var fs     = require('fs');
var mm     = require('../lib/index');
var testy  = require('testy')();
var assert = testy.assert;
    
testy.expected = 1;

var sample = require('path').join(__dirname, 'samples/bug-non ascii chars.mp3');
var parser = new mm(fs.createReadStream(sample));

parser.on('metadata', function(result) {
  assert.strictEqual(result.artist[0], 'Janelle Monáe');
});