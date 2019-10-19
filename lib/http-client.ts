import * as initDebug from 'debug';
import * as _fetch from 'node-fetch';
import { IContentRangeType, IHeadInfo, IHttpClient, IHttpResponse } from './types'; // Add 'fetch' API for node.js

const debug = initDebug('streaming-http-token-reader:http-client');

export function parseContentRange(contentRange: string): IContentRangeType {
  debug(`_parseContentRang response: contentRange=${contentRange}`);

  if (contentRange) {
    const parsedContentRange = contentRange.match(
      /bytes (\d+)-(\d+)\/(?:(\d+)|\*)/i
    );
    if (!parsedContentRange) {
      throw new Error('FIXME: Unknown Content-Range syntax: ' + contentRange);
    }

    return {
      firstBytePosition: parseInt(parsedContentRange[1], 10),
      lastBytePosition: parseInt(parsedContentRange[2], 10),
      instanceLength: parsedContentRange[3] ? parseInt(parsedContentRange[3], 10) : null
    };
  } else {
    return null;
  }
}

/**
 * Simple HTTP-client, which both works in node.js and browser
 */
export class HttpClient implements IHttpClient {

  private static getContentLength(headers: _fetch.Headers): number {
    const contentLength = headers.get('Content-Length');
    return contentLength ? parseInt(contentLength, 10) : undefined;
  }

  private static parseContentRange(headers: _fetch.Headers): IContentRangeType {
    const contentRange = headers.get('Content-Range');
    return parseContentRange(contentRange);
  }

  private static makeResponse(resp): IHttpResponse {
    return {
      contentLength: HttpClient.getContentLength(resp.headers),
      contentType: resp.headers.get('Content-Type'),
      contentRange: HttpClient.parseContentRange(resp.headers),
      arrayBuffer: () => resp.arrayBuffer()
    };
  }

  constructor(private url: string) {
  }

  public getHeadInfo(): Promise<IHeadInfo> {
    return _fetch(this.url, {method: 'HEAD'}).then(resp => HttpClient.makeResponse(resp));
  }

  public getResponse(method: string, range?: [number, number]): Promise<IHttpResponse> {
    if (range) {
      debug(`_makeXHRRequest ${method} ${range[0]}..${range[1]}`);
    } else {
      debug(`_makeXHRRequest ${method} (range not provided)`);
    }

    const headers = new _fetch.Headers();
    headers.set('Range', 'bytes=' + range[0] + '-' + range[1]);

    return _fetch(this.url, {method, headers}).then(response => {

      if (response.ok) {
        return HttpClient.makeResponse(response);
      } else {
        throw new Error(`Unexpected HTTP response status=${response.status}`);
      }
    });
  }

}
