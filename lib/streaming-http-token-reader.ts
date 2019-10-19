import * as initDebug from 'debug';
import { AbstractTokenizer } from 'strtok3/lib/AbstractTokenizer';
import { ChunkedFileData } from './chunked-file-data';
import { HttpClient } from './http-client';
import { IHttpClient, IHttpResponse } from './types';

const debug = initDebug('streaming-http-token-reader');

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

/**
 * StreamingHttpTokenReader
 *
 * Inspired by "XHR Reader"  written by António Afonso
 * https://github.com/aadsm/jsmediatags/blob/master/src/XhrFileReader.js
 */
export class StreamingHttpTokenReader extends AbstractTokenizer {

  public static fromUrl(url: string, config?: IStreamingHttpConfig): StreamingHttpTokenReader {
    return new StreamingHttpTokenReader(new HttpClient(url), config);
  }

  public contentType: string;

  public config: IConfig = {
    avoidHeadRequests: false,
    initialChunkSize: 4 * 1024,
    minimumChunkSize: 1024
  };

  private _fileData: ChunkedFileData;
  private _isInitialized: boolean;

  constructor(private httpClient: IHttpClient, config?: IStreamingHttpConfig) {
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

  public init(): Promise<IHttpResponse> {
    return this.config.avoidHeadRequests ?
      this._fetchSizeWithGetRequest() :
      this._fetchSizeWithHeadRequest();
  }

  private loadRange(range: [number, number]): Promise<void> {

    if (range[0] > this.fileSize - 1) {
      throw new Error('End-Of-File');
    }

    debug(`request range ${range[0]}..${range[1]}`);
    range[1] = Math.min(this.fileSize - 1, range[1]);

    debug(`adjusted range ${range[0]}..${range[1]}`);
    if (this._fileData.hasDataRange(range[0], range[1])) {
      debug(`Read from cache`);
      return Promise.resolve();
    }

    // Always download in multiples of CHUNK_SIZE. If we're going to make a
    // request might as well get a chunk that makes sense. The big cost is
    // establishing the connection so getting 10bytes or 1K doesn't really
    // make a difference.
    range = this._roundRange(range);

    // Upper range should not be greater than max file size
    range[1] = Math.min(this.fileSize - 1, range[1]);

    debug(`blocked range: ${range[0]}..${range[1]}`);

    return this.httpClient.getResponse('GET', range).then(response => {
      return response.arrayBuffer().then(data => {
        this._fileData.addData(range[0], data);
      });
    });
  }

  private _fetchSizeWithHeadRequest(): Promise<IHttpResponse> {

    debug(`_fetchSizeWithHeadRequest()`);
    return this.httpClient.getHeadInfo().then(info => {
      if (info.contentLength) {
        debug(`contentLength=${info.contentLength}`);
        this.fileSize = info.contentLength;
      } else {
        // Content-Length not provided by the server, fallback to
        // GET requests.
        debug('Content-Length not provided by the server, fallback to GET requests');
        return this._fetchSizeWithGetRequest();
      }
      this.contentType = info.contentType;
    });
  }

  private _fetchSizeWithGetRequest(): Promise<IHttpResponse> {
    const range = this._roundRange([0, this.config.initialChunkSize]);

    return this.httpClient.getResponse('GET', range).then(response => {
      debug(`_fetchSizeWithGetRequest response: contentRange=${response.contentRange}`);

      if (response.contentRange) {
        this.fileSize = response.contentRange.instanceLength;
        this.contentType = response.contentType;
        return response;
      } else {
        throw new Error('Did not get a content range');
      }
    });
  }

  private _roundRange(range: [number, number]): [number, number] {
    const length = range[1] - range[0] + 1;
    // const newLength = Math.ceil(length / minimum_chunk_size) * minimum_chunk_size;
    const newLength = Math.max(this.config.minimumChunkSize, length);
    return [range[0], range[0] + newLength - 1];
  }

}
