if (module == require.main) {

  var spawn = require('child_process').spawn,
      path  = require('path');
    
  var tests = ['test-genres.js', 'test-deunsync.js', 'test-metadataleak.js',
               'test-id3v1.1.js', 'test-id3v2.2.js', 'test-id3v2.3.js', 
               'test-id3v2.4.js', 'test-id4.js', 'test-ogg.js',
               'test-unknownencoding.js', 'test-nonasciichars.js',
               'test-flac.js', 'test-utf16bom-encoding.js',
               'test-ogg-multipagemetadatabug.js',
               'test-apev2-monkeysaudio.js'];
  
  var passedTests = 0;
  
  for (var i=0; i < tests.length; i++) {
    var test = tests[i];
    var testProcess = spawn(process.execPath, [path.join(__dirname, test)]);
    
    testProcess.stdout.on('data', function(data) {
      process.stdout.write(data.toString());
    });
    
    testProcess.stderr.on('data', function(data) {
      process.stderr.write(data.toString());
    });
    
    testProcess.on('exit', function () {
      passedTests++;   
    }); 
  }
  
  process.once('exit', function () {
    process.exit((passedTests === tests.length) ? 0 : 1);
  });
}