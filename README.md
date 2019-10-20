[![Build Status](https://travis-ci.org/Borewit/streaming-http-token-reader.svg?branch=master)](https://travis-ci.org/Borewit/streaming-http-token-reader)
[![NPM version](https://badge.fury.io/js/streaming-http-token-reader.svg)](https://npmjs.org/package/streaming-http-token-reader)
[![npm downloads](http://img.shields.io/npm/dm/streaming-http-token-reader.svg)](https://npmcharts.com/compare/streaming-http-token-reader?interval=30)
[![dependencies Status](https://david-dm.org/Borewit/streaming-http-token-reader/status.svg)](https://david-dm.org/Borewit/streaming-http-token-reader)
[![Known Vulnerabilities](https://snyk.io/test/github/Borewit/streaming-http-token-reader/badge.svg?targetFile=package.json)](https://snyk.io/test/github/Borewit/streaming-http-token-reader?targetFile=package.json)
[![Minified size](https://badgen.net/bundlephobia/min/streaming-http-token-reader)](https://bundlephobia.com/result?p=streaming-http-token-reader)

# streaming-http-token-reader

Streams HTTP using [RFC-7233](https://tools.ietf.org/html/rfc7233#section-2.3) [range requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests).
Prevents the entire content to be downloaded, for metadata analysis.
This module can be used both in the browser and in [Node.js](https://nodejs.org).

## Example

```js
// const mm = require('music-metadata-browser');  // Use module 'music-metadata-browser' client side
const mm = require('music-metadata'); // Use module 'music-metadata' in Node.js

const {StreamingHttpTokenReader} = require('streaming-http-token-reader');

const config = {
  avoidHeadRequests: true
};

const audioTrackUrl = 'https://test-audio.netlify.com/Various%20Artists%20-%202009%20-%20netBloc%20Vol%2024_%20tiuqottigeloot%20%5BMP3-V2%5D/01%20-%20Diablo%20Swing%20Orchestra%20-%20Heroines.mp3';

const streamingHttpTokenReader = new StreamingHttpTokenReader(audioTrackUrl, config);
streamingHttpTokenReader.init()
  .then(() => {
    return mm.parseFromTokenizer(streamingHttpTokenReader, streamingHttpTokenReader.contentType);
  })
  .then(metadata => {
    // Process metadata
    console.log('metadata:', metadata);
  });
```

## Server requirements

The server needs to send the following headers:

| HTTP header-| Value |
|-------------|-------|
| [Access-Control-Allow-Origin](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin)     | "*"                             |
| [Access-Control-Allow-Methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Methods)   | "GET,HEAD,OPTIONS"              |
| [Access-Control-Allow-Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Headers)   | "Content-Type, Range"           |
| [Access-Control-Expose-Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Expose-Headers) | "Content-Length, Content-Range" |

Example configuring Apache for streaming. Add the following to `.htaccess` in the folder sharing your audio tracks:
```
Header set Access-Control-Allow-Origin "*"
Header set Access-Control-Allow-Methods "GET,HEAD,OPTIONS"
Header set Access-Control-Allow-Headers "Content-Type, User-Agent, If-Modified-Since, Cache-Control, Range"
Header set Access-Control-Expose-Headers "Content-Length, Content-Range"
```

Ref:
* [streamroot.io: Range requests basics](https://support.streamroot.io/hc/en-us/articles/115003168773-Range-requests-basics)

Try if range request is supported:
```bash
curl -v -L --header "range: bytes=1-8" http://localhost:8080/bbb/test
```

## Licence

(The MIT License)

Copyright (c) 2018 Borewit

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
git pull
THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
