'use strict'
/*jslint browser: true*/
import * as through from 'through'
import * as musicMetadata from './index'

import readStream = require('filereader-stream')
import isStream = require('is-stream')

import {ThroughStream} from "through"
import ReadableStream = NodeJS.ReadableStream

module.exports = (stream, opts, callback) => {
  return musicMetadata.parseStream(wrapFileWithStream(stream), opts, callback)
};

interface FileWrapperStream extends ThroughStream{
  fileSize: (cb: (fileSize: number) => void) => void
}

function wrapFileWithStream (file: ArrayBuffer | Blob | FileList | ReadableStream): ReadableStream {
  let stream = <FileWrapperStream> through( (data) => {
    if (data.length > 0) this.queue(data)
  }, null, {autoDestroy: false});

  if (file instanceof ArrayBuffer) {
    return wrapArrayBufferWithStream(file, stream)
  }

  stream.fileSize = (cb) => {
    process.nextTick( () => {
      cb((<Blob>file).size)
    })
  };

  if (isStream(file)) {
    return (<ReadableStream>file).pipe(stream)
  }
  if (file instanceof FileList) {
    throw new Error('You have passed a FileList object but we expected a File')
  }
  if (!(file instanceof File || file instanceof Blob)) {
    throw new Error('You must provide a valid File or Blob object')
  }

  return readStream(file).pipe(stream)
}

function wrapArrayBufferWithStream (arrayBuffer: ArrayBuffer, throughStream: ThroughStream) {
  (<FileWrapperStream> throughStream).fileSize = function (cb) {
    process.nextTick(function () {
      cb(arrayBuffer.byteLength)
    })
  };

  process.nextTick(function () {
    throughStream.write(new Buffer(new Uint8Array(arrayBuffer)))
    throughStream.end()
  });

  return throughStream
}
