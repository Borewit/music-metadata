import * as Stream from 'stream';
import * as https from 'https';
import * as http from 'http';

export interface IHttpResponse {
  headers: { [id: string]: string; }
  stream: Stream.Readable;
}

export interface IHttpClient {
  get: (url: string) => Promise<IHttpResponse>;
}

export class HttpClient implements IHttpClient {

  public get(url: string): Promise<IHttpResponse> {
    return new Promise<IHttpResponse>((resolve, reject) => {
      const request = ((url.startsWith('https') ? https : http) as typeof http).get(url);
      request.on('response', resp => {
        resolve({
          headers: resp.headers as any,
          stream: resp
        });
      });
      request.on('abort', () => {
        reject(new Error('abort'));
      });
      request.on('error', err => {
        reject(err);
      });
    });
  }
}
