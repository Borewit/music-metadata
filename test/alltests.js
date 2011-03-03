if (module == require.main) {
  var tests = ['test-deunsync.js', 'test-id3v1.1.js', 'test-id3v2.2.js',
               'test-id3v2.3.js', 'test-id3v2.4.js', 'test-id4.js'];
               
  require('async_testing').run(tests, process.ARGV);
}