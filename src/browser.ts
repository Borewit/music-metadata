'use strict';

/*jslint browser: true*/
import * as through from 'through';
import * as musicMetadata from './index';
import readStream = require('filereader-stream');
import isStream = require('is-stream');
import {ThroughStream} from 'through';
import * as stream from 'stream';

module.exports = (stream, opts, callback) => {
  return musicMetadata.parseStream(wrapFileWithStream(stream), opts, callback);
};

interface IFileWrapperStream extends ThroughStream {
  fileSize: (cb: (fileSize: number) => void) => void
}

function wrapFileWithStream(file: ArrayBuffer | Blob | FileList | ReadableStream): stream.Readable {
  // tslint:disable-next-line
  const stream = through( function(data) {
    if (data.length > 0) this.queue(data);
  }, null, {autoDestroy: false}) as IFileWrapperStream;

  if (file instanceof ArrayBuffer) {
    return wrapArrayBufferWithStream(file, stream);
  }

  stream.fileSize = (cb) => {
    process.nextTick( () => {
      cb((file as Blob).size);
    });
  };

  if (isStream(file)) {
    return (file as ReadableStream).pipe(stream);
  }
  if (file instanceof FileList) {
    throw new Error('You have passed a FileList object but we expected a File');
  }
  if (!(file instanceof File || file instanceof Blob)) {
    throw new Error('You must provide a valid File or Blob object');
  }

  return readStream(file).pipe(stream);
}

function wrapArrayBufferWithStream(arrayBuffer: ArrayBuffer, throughStream: ThroughStream) {
  (throughStream as IFileWrapperStream).fileSize = (cb) => {
    process.nextTick( () => {
      cb(arrayBuffer.byteLength);
    });
  };

  process.nextTick( () => {
    throughStream.write(new Buffer(new Uint8Array(arrayBuffer)));
    throughStream.end();
  });

  return throughStream;
}
