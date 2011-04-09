if (module == require.main) {
    var spawn = require('child_process').spawn;
        
    var tests = ['test-deunsync.js', 'test-id3v1.1.js', 'test-id3v2.2.js',
                 'test-id3v2.3.js', 'test-id3v2.4.js', 'test-id4.js', 
                 'test-vorbis.js'];
                   
    for (var i=0; i < tests.length; i++) {
        var test = spawn(process.execPath, [tests[i]]);
        
        test.stdout.on('data', function(data) {
            console.log(data.toString());
        });
        
        test.stderr.on('data', function(data) {
            console.log(data.toString());
        }); 
    }
}

