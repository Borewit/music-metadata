'use strict'
/*jslint browser: true*/
var readStream = require('filereader-stream')
var through = require('through')
var musicmetadata = require('./index')
var isStream = require('is-stream')

module.exports = function (stream, opts, callback) {
  return musicmetadata(wrapFileWithStream(stream), opts, callback)
}

function wrapFileWithStream (file) {
  var stream = through(function write (data) {
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

  return readStream(file).pipe(stream)
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
