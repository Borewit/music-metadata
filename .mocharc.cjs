module.exports = {
  extension: ['ts'],
  'watch-files': ['lib/**/*.ts', 'test/**/*.ts'],
  spec: ['test/test-*.ts'],
  ...(process.version.startsWith('v16') ? { loader: ['tsx'] } : { import: ['tsx'] }),
  extensions: ['ts']
};
