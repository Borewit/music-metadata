import { assert } from 'chai';

import * as Stream from 'stream';
import * as http from 'http';
import * as https from 'https';

import * as mm from '../src';
import { IOptions } from '../src/type';

interface IHttpResponse {
  headers: { [id: string]: string; }
  stream: Stream.Readable;
}

interface IHttpClient {
  get: (url: string) => Promise<IHttpResponse>;
}

interface IHttpClientTest {
  readonly name: string;
  client: IHttpClient;
}

class NodeHttpClient {

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

const clients: IHttpClientTest[] = [

  {
    name: 'http',
    client: new NodeHttpClient()
  }

];

// Skipped: https://github.com/Borewit/music-metadata/issues/160
describe.skip('HTTP streaming', function() {

  // Increase time-out to 15 seconds because we retrieve files over HTTP(s)
  this.timeout(15 * 1000);
  this.retries(3); // Workaround for HTTP time-outs on Travis-CI

  describe('Stream HTTP using different clients', () => {

    clients.forEach(test => {

      describe(`HTTP client: ${test.name}`, () => {

        [true, false].forEach(hasContentLength => {

          it(`Should be able to parse M4A ${hasContentLength ? 'with' : 'without'} content-length specified`, async () => {

            const url = 'https://tunalib.s3.eu-central-1.amazonaws.com/plan.m4a';

            const response = await test.client.get(url);

            const options: IOptions = {};
            if (hasContentLength) {
              options.fileSize = parseInt(response.headers['content-length'], 10); // Always pass this in production
            }

            const tags = await mm.parseStream(response.stream, response.headers['content-type'], options);
            if (response.stream.destroy) {
              response.stream.destroy(); // Node >= v8 only
            }
            assert.strictEqual(tags.format.codec, 'MP4A');
            assert.strictEqual(tags.format.lossless, false);

            assert.strictEqual(tags.common.title, 'We Made a Plan');
            assert.strictEqual(tags.common.artist, 'Adan Cruz');
            assert.strictEqual(tags.common.album, 'Quiérelo');
          });

        });

      });
    });
  });

});
