[![Build Status](https://secure.travis-ci.org/leetreveil/musicmetadata.png)](http://travis-ci.org/leetreveil/musicmetadata) [![NPM version][npm-image]][npm-url]

[![browser support](https://ci.testling.com/leetreveil/musicmetadata.png)](https://ci.testling.com/leetreveil/musicmetadata)

Streaming music metadata parser for node and the browser.

Installation
------------
Install via [npm](http://npmjs.org):

```
npm install musicmetadata
```

Or with [bower](http://bower.io) if you're in the browser:

```
bower install musicmetadata
```

If you're old'skool you can download the latest tar ball from https://github.com/leetreveil/musicmetadata/releases.


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
var parser = mm(fs.createReadStream('sample.mp3'));

// listen for the metadata event
parser.on('metadata', function (result) {
  console.log(result);
});
```

You can also read the duration; reading the duration may be slow so only set this if you need to.
```javascript
var parser = mm(fs.createReadStream('sample.mp3'), { duration: true });
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
  picture : [ { format : 'jpg', data : <Buffer> } ],
  duration : 302 // in seconds
}
```

If you just want the artist - listen for the artist event:

```javascript
parser.on('artist', function (result) {
  console.log(result);
});
```

You can also listen for custom metadata types that are not part of the standard metadata as defined above. For example if you wanted to read the `TLEN` frame from a id3v2.x file you can do this:

```javascript
parser.on('TLEN', function (result) {
  console.log(result);
});
```

The ```done``` event will be raised when parsing has finished or an error has occurred. This could be
used to disconnect from the stream as soon as parsing has finished, saving bandwidth.

```javascript
parser.on('done', function (err) {
  if (err) throw err;
  stream.destroy();
});
```

Licence
-----------------

(The MIT License)

Copyright (c) 2014 Lee Treveil <leetreveil@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

[npm-url]: https://npmjs.org/package/musicmetadata
[npm-image]: https://badge.fury.io/js/musicmetadata.png

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
