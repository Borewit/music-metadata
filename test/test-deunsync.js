var common = require('../lib/common'),
      assert = require('assert');
    
//testing that we can deunsync data correctly
//it shouldn't matter if it's a buffer or not
//0x00 to the right of 0xFF should be removed
var expected = new Buffer([0xFF, 0xD8, 0xFF, 0xE0, 0x00]);    
var sample = [0xFF, 0xD8, 0xFF, 0x00, 0xE0, 0x00];

assert.deepEqual(expected, common.removeUnsyncBytes(sample));
assert.deepEqual(expected, new Buffer(common.removeUnsyncBytes(sample)));

console.log(__filename + ' ran ' + 2 + ' tests');