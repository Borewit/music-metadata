var readStream = require('filereader-stream')
var through = require('through')
var musicmetadata = require('./index')
var Stream = require('stream').Stream;


module.exports = function (stream, opts) {
  return musicmetadata(wrapFileWithStream(stream), opts)
}

function wrapFileWithStream (file) {
  var stream = through(function write (data) {
    if (data.length > 0) this.queue(data)
  }, null, {autoDestroy: false});

  stream.fileSize = function (cb) {
    process.nextTick(function () {
      cb(file.size);
    })
  }

  if (file instanceof Stream) {
    return file.pipe(stream);
  }
  if (file instanceof FileList) {
    throw new Error('You have passed a FileList object but we expected a File');
  }
  if (!(file instanceof File || file instanceof Blob)) {
    throw new Error('You must provide a valid File or Blob object');
  }

  return readStream(file).pipe(stream);
}