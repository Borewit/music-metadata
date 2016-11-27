export type ParserResult = (err: Error) => void

export type TagCallback = (type: string, tag: string, value: string | number) => void

export type Done = (err: Error) => void

export type GetFileSize = (cb: (fileSize: number) => void) => void

export interface IStreamParser {
  parse (stream: NodeJS.ReadableStream, tagEvent: TagCallback, done?: Done, readDuration?: boolean, fileSize?: GetFileSize): void
}
