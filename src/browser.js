'use strict'
/*jslint browser: true*/
import * as readStream from 'filereader-stream'
import * as through from 'through'
import * as musicmetadata from './index'
import * as isStream  from 'is-stream'
import {EventEmitter} from "events";

module.exports = (stream, opts, callback) => {
  return musicmetadata(wrapFileWithStream(stream), opts, callback)
}

function wrapFileWithStream (file: any): EventEmitter {
  let stream = through( (data) => {
    if (data.length > 0) this.queue(data)
  }, null, {autoDestroy: false})

  if (file instanceof ArrayBuffer) {
    return wrapArrayBufferWithStream(file, stream)
  }

  stream.fileSize = (cb) => {
    process.nextTick( () => {
      cb(file.size)
    })
  }

  if (isStream(file)) {
    return file.pipe(stream)
  }
  if (file instanceof FileList) {
    throw new Error('You have passed a FileList object but we expected a File')
  }
  if (!(file instanceof File || file instanceof Blob)) {
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
