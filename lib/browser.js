'use strict'
/*jslint browser: true*/
var readStream = require('filereader-stream')
var through = require('through')
var musicmetadata = require('./index')
var isStream = require('is-stream')

module.exports = function (stream, opts, callback) {
  var wrappedStram = wrapFileWithStream(stream);

  if (typeof opts === 'function') {
    callback = opts
    opts = {}
  }

  return musicmetadata(wrappedStram.dest, opts, function (){
    // Once we have our meta data we abort stream file reader
    wrappedStram.abort()

    callback.apply(null, arguments)
  });
}

function wrapFileWithStream (file) {
  var
    streamFileReader,
    stream = through(function write (data) {
    if (data.length > 0) this.queue(data)
  }, null, {autoDestroy: false})

  if (file instanceof window.ArrayBuffer) {
    return wrapArrayBufferWithStream(file, stream)
  }

  stream.fileSize = function (cb) {
    process.nextTick(function () {
      cb(file.size)
    })
  }

  if (isStream(file)) {
    return file.pipe(stream)
  }
  if (file instanceof window.FileList) {
    throw new Error('You have passed a FileList object but we expected a File')
  }
  if (!(file instanceof window.File || file instanceof window.Blob)) {
    throw new Error('You must provide a valid File or Blob object')
  }

  streamFileReader = readStream(file)
  streamFileReader.pipe(stream)

  return streamFileReader
}

function wrapArrayBufferWithStream (arrayBuffer, throughStream) {
  throughStream.fileSize = function (cb) {
    process.nextTick(function () {
      cb(arrayBuffer.byteLength)
    })
  }

  process.nextTick(function () {
    throughStream.write(new Buffer(new Uint8Array(arrayBuffer)))
    throughStream.end()
  })

  return throughStream
}
