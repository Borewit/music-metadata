if (module == require.main) {
  require('async_testing').run(__dirname, process.ARGV);
}