import { assert } from 'chai';

import { parseStream } from '../lib/index.js';
import { IHttpClient, HttpClient } from './http-client.js';

import { IFileInfo } from 'strtok3';

interface IHttpClientTest {
  readonly name: string;
  client: IHttpClient;
}

const clients: IHttpClientTest[] = [
  {
    name: 'http',
    client: new HttpClient()
  }
];

// Skipped: https://github.com/Borewit/music-metadata/issues/160
describe('HTTP streaming', function() {

  // Increase time-out to 15 seconds because we retrieve files over HTTP(s)
  this.timeout(15 * 1000);
  this.retries(3); // Workaround for HTTP time-outs on Travis-CI

  describe('Stream HTTP using different clients', () => {

    clients.forEach(test => {

      describe(`HTTP client: ${test.name}`, () => {

        [true, false].forEach(hasContentLength => {

          it(`Should be able to parse M4A ${hasContentLength ? 'with' : 'without'} content-length specified`, async () => {

            const url = 'http://builds.tokyo.s3.amazonaws.com/sample.m4a';

            const response = await test.client.get(url);

            const fileInfo: IFileInfo = {
              mimeType: response.headers['content-type']
            };
            if (hasContentLength) {
              fileInfo.size = parseInt(response.headers['content-length'], 10); // Always pass this in production
            }

            const tags = await parseStream(response.stream, fileInfo);
            if (response.stream.destroy) {
              response.stream.destroy(); // Node >= v8 only
            }
            assert.strictEqual(tags.format.container, 'M4A/mp42/isom');
            assert.strictEqual(tags.format.codec, 'MPEG-4/AAC');
            assert.strictEqual(tags.format.lossless, false);

            assert.strictEqual(tags.common.title, 'Super Mario Galaxy "Into The Galaxy"');
            assert.strictEqual(tags.common.artist, 'club nintendo CD "SUPER MARIO GALAXY"より');
            assert.strictEqual(tags.common.album, 'SUPER MARIO GALAXY ORIGINAL SOUNDTRACK');
          });

        });

      });
    });
  });

});
