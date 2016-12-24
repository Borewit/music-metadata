import {Token} from 'strtok2';

export type ParserResult = (err: Error) => void;

export type TagCallback = (type: string, tag: string, value: string | number | boolean) => void;

export type Done = (err?: Error) => Token;

export type GetFileSize = (cb: (fileSize: number) => void) => void;

export interface IStreamParser {
  parse (stream: NodeJS.ReadableStream, tagEvent: TagCallback, done: Done, readDuration?: boolean, fileSize?: GetFileSize): void;
  end? (callback: TagCallback, done: Done): void;
}
