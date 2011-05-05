var fs = require('fs'),
    mm = require('../lib/index'),
    assert = require('assert'),
    testHelper = require('./testHelper');
    
var testHelper = new testHelper(3, __filename);

for (var i=0; i < 3; i++) {
  var sample = require('path').join(__dirname, 'samples/id3v1.mp3');
  var parser = new mm(fs.createReadStream(sample));
  
  parser.on('metadata', function(result) {
    //we are testing that the metadata object is not being shared across parsers
    assert.strictEqual(result.artist[0], 'Pendulum');
    testHelper.ranTests(1);
  });
}