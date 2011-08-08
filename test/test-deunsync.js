var common = require('../lib/common'),
    testy = require('testy')(),
    assert = testy.assert;
    
testy.expected = 1;
    
var expected = new Buffer([0xFF, 0xD8, 0xFF, 0xE0, 0x00]);    
var sample = new Buffer([0xFF, 0xD8, 0xFF, 0x00, 0xE0, 0x00]);
var output = common.removeUnsyncBytes(sample);

assert.deepEqual(output, expected);

testy.finish();