var fs = require('fs'),
    midy = require('../lib/index');
        
var stream = fs.createReadStream('./samples/id4.m4a');
var tst = new midy(stream);

stream.on('data', function(result){
    //console.log(result.length);
});

tst.on('tmpo', function(result){
    //console.log(result);
});

tst.on('done', function(result){
    //stream.destroy();
});

tst.on('metadata', function(result) {
    console.log(result);
});

tst.parse();