declare module 'filereader-stream' {
  import * as events from 'events'
  import WritableStream = NodeJS.WritableStream;

  export class FileStream extends events.EventEmitter {
    constructor(file, options?: {output?: string})

    public readChunk(outputType)

    public pipe<T extends WritableStream>(destination: T, options?: { end?: boolean; }): T;

    public pause()

    public resume()

    public abort()
  }
}
