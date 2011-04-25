var fs = require('fs'),
    mm = require('../lib/index'),
    assert = require('assert'),
    testHelper = require('./testHelper');
    
var sample = require('path').join(__dirname, 'samples/bug-non ascii chars.mp3');
var parser = new mm(fs.createReadStream(sample));

var testHelper = new testHelper(1, __filename);

parser.on('metadata', function(result) {
  assert.strictEqual(result.artist[0], 'Janelle Monáe');
  testHelper.ranTests(1);
});