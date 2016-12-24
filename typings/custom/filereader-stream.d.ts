declare module 'filereader-stream' {

  import ReadableStream = NodeJS.ReadableStream;

  function readStream (file, options?: {output?: string}): ReadableStream;

  export = readStream
}
