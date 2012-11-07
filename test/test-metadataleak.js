var fs     = require('fs');
var mm     = require('../lib/index');
var testy  = require('testy')();
var assert = testy.assert;
    
testy.expected = 3;

for (var i=0; i < 3; i++) {
  var sample = require('path').join(__dirname, 'samples/id3v1.mp3');
  var parser = new mm(fs.createReadStream(sample));
  
  parser.on('metadata', function(result) {
    //we are testing that the metadata object is not being shared across parsers
    assert.strictEqual(result.artist[0], 'Pendulum');
  });
}