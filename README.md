[![Build Status][travis-image]][travis-url] [![NPM version][npm-image]][npm-url] [![npm downloads][npm-downloads-image]][npm-url]

Streaming music metadata parser for node and the browser.

Installation
------------
Install via [npm](http://npmjs.org):

```
npm install musicmetadata
```

You can also download a pre packaged browser release from `dist/musicmetadata.js`.
See `example/index.html` for usage.


Supports
-----------------
* mp3 (1.1, 2.2, 2.3, 2.4)
* m4a (mp4)
* vorbis (ogg, flac)
* asf (wma, wmv)


API
-----------------
```javascript
var fs = require('fs');
var mm = require('musicmetadata');

// create a new parser from a node ReadStream
var parser = mm(fs.createReadStream('sample.mp3'), function (err, metadata) {
  if (err) throw err;
  console.log(metadata);
});
```

This will output the standard music metadata:

```javascript
{ artist : ['Spor'],
  album : 'Nightlife, Vol 5.',
  albumartist : [ 'Andy C', 'Spor' ],
  title : 'Stronger',
  year : '2010',
  track : { no : 1, of : 44 },
  disk : { no : 1, of : 2 },
  genre : ['Drum & Bass'],
  picture : [ { format : 'jpg', data : <Buffer> } ],
  duration : 302.41 // in seconds
}
```

`musicmetadata` also emits all metadata it discovers during parsing. For example if you wanted to read the `TLEN` frame from an id3v2.x file you can do this:

```javascript
parser.on('TLEN', function (result) {
  console.log(result);
});
```

You can also read the duration; to calculate the duration `musicmetadata` may need to parse the entire file
so only enable this if you need the functionality.
```javascript
mm(fs.createReadStream('sample.mp3'), { duration: true }, function (err, metadata) {
  
});
```

Note that in order to read the duration for streams that are not file streams, you must also pass the size of the file in bytes.
```javascript
mm(fs.createReadStream('sample.mp3'), { duration: true, fileSize: 26838 }, function (err, metadata) {
  
});
```

Licence
-----------------

(The MIT License)

Copyright (c) 2015 Lee Treveil <leetreveil@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[npm-url]: https://npmjs.org/package/musicmetadata
[npm-image]: https://badge.fury.io/js/musicmetadata.svg
[npm-downloads-image]: http://img.shields.io/npm/dm/musicmetadata.svg

[travis-url]: https://travis-ci.org/leetreveil/musicmetadata
[travis-image]: https://api.travis-ci.org/leetreveil/musicmetadata.svg?branch=master
