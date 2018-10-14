import * as initDebug from 'debug';
import { AbstractTokenizer } from 'strtok3/lib/AbstractTokenizer';
import { ChunkedFileData } from './chunked-file-data';

const debug = initDebug('xhr');

export interface IStreamingHttpConfig {
  timeoutInSec?: number;
  avoidHeadRequests?: boolean;
  initialChunkSize?: number;
  minimumChunkSize?: number;
}

interface IConfig {
  timeoutInSec?: number;
  avoidHeadRequests: boolean;
  initialChunkSize: number;
  minimumChunkSize: number;
}

export interface IContentRangeType {
  firstBytePosition?: number;
  lastBytePosition?: number;
  instanceLength?: number;
}

/**
 * StreamingHttpTokenReader
 *
 * Inspired by "XHR Reader"  written by António Afonso
 * https://github.com/aadsm/jsmediatags/blob/master/src/XhrFileReader.js
 */
export class StreamingHttpTokenReader extends AbstractTokenizer {

  private static getContentLength(headers: Headers): number {
    const contentLength = headers.get('Content-Length');
    return contentLength ? parseInt(contentLength, 10) : undefined;
  }

  public contentType: string;

  public config: IConfig = {
    avoidHeadRequests: false,
    initialChunkSize: 4 * 1024,
    minimumChunkSize: 1024
  };

  private _fileData: ChunkedFileData;
  private _isInitialized: boolean;

  constructor(private url: string, config?: IStreamingHttpConfig) {
    super();
    if (config) {
      Object.assign(this.config, config);
    }
    this._fileData = new ChunkedFileData();
    this._isInitialized = false;
    this.fileSize = 0;
  }

  /**
   * Read portion from stream
   * @param {Buffer} buffer: Target buffer
   * @param {number} offset: Offset is the offset in the buffer to start writing at; if not provided, start at 0
   * @param {number} length: The number of bytes to read, of not provided the buffer length will be used
   * @param {number} position: Position where to begin reading from in the file. If position is not defined, data will be read from the current file position.
   * @returns {Promise<number>}
   */
  public readBuffer(buffer: Buffer, offset: number = 0, length: number = buffer.length, position?: number): Promise<number> {

    if (position) {
      this.position = position;
    }

    debug(`readBuffer position=${this.position} length=${length}`);

    if (length === 0) {
      return Promise.resolve(0);
    }

    if (!length) {
      length = buffer.length;
    }

    return this.peekBuffer(buffer, offset, length, this.position).then(() => {

      this.position += length;
      return length;
    });
  }

  /**
   * Read portion from stream, similar to readBuffer, but it doesn't advance the position in the stream
   * @param buffer
   * @param {number} offset: Offset is the offset in the buffer to start writing at; if not provided, start at 0
   * @param {number} length: The number of bytes to read, of not provided the buffer length will be used
   * @param position is an integer specifying where to begin reading from in the file. If position is null, data will be read from the current file position.
   * @returns Promise number of bytes read
   */
  public peekBuffer(buffer: Buffer, offset: number = 0, length: number = buffer.length, position: number = this.position): Promise<number> {

    debug(`peekBuffer position=${position} length=${length}`);

    const lastPos = position + length - 1;

    return this.loadRange([position, lastPos]).then(() => {

      this._fileData.readToBuffer(buffer, offset, position, length);

      return length;
    });
  }

  /**
   * @param length Number of bytes to ignore
   */
  public ignore(length: number): Promise<number> {
    const bytesLeft = this.fileSize - this.position;
    if (length <= bytesLeft) {
      this.position += length;
      return Promise.resolve(length);
    } else {
      this.position += bytesLeft;
      return Promise.resolve(bytesLeft);
    }
  }

  public init(): Promise<Response> {
    return this.config.avoidHeadRequests ?
      this._fetchSizeWithGetRequest() :
      this._fetchSizeWithHeadRequest();
  }

  public loadRange(range: [number, number]): Promise<void> {

    debug(`loadRange ${range[0]}..${range[1]}`);

    if (this._fileData.hasDataRange(range[0], Math.min(this.fileSize, range[1]))) {
      debug(`Read from cache`);
      return Promise.resolve();
    }

    // Always download in multiples of CHUNK_SIZE. If we're going to make a
    // request might as well get a chunk that makes sense. The big cost is
    // establishing the connection so getting 10bytes or 1K doesn't really
    // make a difference.
    range = this._roundRange(range);

    // Upper range should not be greater than max file size
    range[1] = Math.min(this.fileSize, range[1]);

    debug(`adjust range to: ${range[0]}..${range[1]}`);

    return this._getResponse('GET', range).then(response => {
      return response.arrayBuffer().then(data => {
        this._fileData.addData(range[0], data);
      });
    });
  }

  private _fetchSizeWithHeadRequest(): Promise<Response> {

    debug(`_fetchSizeWithHeadRequest()`);
    return fetch(this.url, {method: 'HEAD'}).then(response => {
      const contentLength = StreamingHttpTokenReader.getContentLength(response.headers);
      if (contentLength) {
        debug(`contentLength=${contentLength}`);
        this.fileSize = contentLength;
      } else {
        // Content-Length not provided by the server, fallback to
        // GET requests.
        debug('Content-Length not provided by the server, fallback to GET requests');
        return this._fetchSizeWithGetRequest();
      }
      this.contentType = response.headers.get('Content-Type');
    });
  }

  private _fetchSizeWithGetRequest(): Promise<Response> {
    const range = this._roundRange([0, this.config.initialChunkSize]);

    return this._getResponse('GET', range).then(response => {
      const contentRange = this._parseContentRange(response.headers);
      debug(`_fetchSizeWithGetRequest response: contentRange=${contentRange}`);

      this.contentType = response.headers.get('Content-Type');
      if (contentRange) {
        this.fileSize = contentRange.instanceLength;
        return response;
      } else {
        throw new Error('Did not get a content range');
      }
      return response;
    });
  }

  private _parseContentRange(headers: Headers): IContentRangeType {
    const contentRange = headers.get('Content-Range');
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

  private _roundRange(range: [number, number]): [number, number] {
    const length = range[1] - range[0] + 1;
    // const newLength = Math.ceil(length / minimum_chunk_size) * minimum_chunk_size;
    const newLength = Math.max(this.config.minimumChunkSize, length);
    return [range[0], range[0] + newLength - 1];
  }

  private _getResponse(method: string, range?: [number, number]): Promise<Response> {
    if (range) {
      debug(`_makeXHRRequest ${method} ${range[0]}..${range[1]}`);
    } else {
      debug(`_makeXHRRequest ${method} (range not provided)`);
    }

    const headers = new Headers();
    headers.set('Range', 'bytes=' + range[0] + '-' + range[1]);

    return fetch(this.url, {method, headers}).then(response => {

      if (response.ok) {
        return response;
      } else {
        throw new Error(`Unexpected HTTP response status=${response.status}`);
      }

    });
  }
}
