var id3 = require('../lib/index'),
    fs = require('fs'),
    assert = require('assert');
        
var sample = require('path').join(__dirname, 'samples/id4.m4a');
var parser = new id3(fs.createReadStream(sample));

parser.on('done', function(err) {
  console.log('done');
  console.log(err);
  if (err) throw err;
});