var mm = require('..')
var test = require('tape')
var through = require('through')
var common = require('../lib/common')

var headers = [
  new Buffer([0x4F, 0x67, 0x67, 0x53]), // ogg
  new Buffer([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x4D, 0x34, 0x41]), // mp4
  new Buffer([0x66, 0x4C, 0x61, 0x43]), // flac
  new Buffer([0x49, 0x44, 0x33]), // id3
  common.asfGuidBuf // asf
]

test('should return error when we unexpectedly hit the end of the stream', function (t) {
  t.plan(headers.length)

  headers.forEach(function (header) {
    var mockFile = through()
    mm(mockFile, function (err, result) {
      t.equal(err.message, 'Unexpected end of stream')
    })
    mockFile.emit('data', header)
    mockFile.emit('close')
  })
})
