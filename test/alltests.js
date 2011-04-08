if (module == require.main) {
    var exec = require('child_process').exec;
    var tests = ['test-deunsync.js', 'test-id3v1.1.js', 'test-id3v2.2.js',
                 'test-id3v2.3.js', 'test-id3v2.4.js', 'test-id4.js', 
                 'test-vorbis.js'];
                   
    for(var i in tests) {
        exec(process.execPath + ' ' + tests[i], 
            function (error, stdout, stderr) {
                if(stdout.length > 0) {
                    console.log(stdout);
                }

                if (error !== null) {
                  console.log('exec error: ' + error);
                }
        });
    }

	console.log('If there aren\'t any error messages from assert all tests have passed');
}

