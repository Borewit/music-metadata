var fs = require('fs'),
    common = require('../lib/common');
      
exports['deunsync'] = function(test){
    //testing that we can deunsync data correctly
    //it shouldn't matter if it's a buffer or not
    var expected = new Buffer([0xFF, 0xD8, 0xFF, 0xE0, 0x00]);    
    var sample = [0xFF, 0xD8, 0xFF, 0x00, 0xE0, 0x00];
    
    test.deepEqual(expected, common.removeUnsyncBytes(sample));
    test.deepEqual(expected, new Buffer(common.removeUnsyncBytes(sample)));
    test.finish();
};

if (module == require.main) {
  require('async_testing').run(__filename, process.ARGV);
}