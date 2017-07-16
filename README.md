[![Build Status](https://travis-ci.org/Borewit/music-metadata.svg?branch=master)](https://travis-ci.org/Borewit/music-metadata)
[![NPM version](https://badge.fury.io/js/music-metadata.svg)](https://npmjs.org/package/music-metadata)
[![npm downloads](http://img.shields.io/npm/dm/music-metadata.svg)](https://npmjs.org/package/music-metadata)
[![Dependencies](https://david-dm.org/Borewit/music-metadata.svg)](https://david-dm.org/Borewit/music-metadata)

Streaming music metadata parser for node.

## Installation
Install via [npm](http://npmjs.org):

```
npm install music-metadata
```

## Features

* Supports metadata of the following audio and tag types:

| File extension                         | MIME-type                      |   Tag header type                  |
| -------------------------------------- | ------------------------------ | ---------------------------------- |
| ape                                    | audio/ape                      | APEv2                              |
| asf, wma, wmv                          | audio/x-ms-wma, video/x-ms-asf | ASF                                |
| flac                                   | audio/flac                     | Vorbis                             | 
| m4a, m4b, m4p, m4v, m4r, 3gp, mp4, aac | audio/aac, audio/aacp          | QTFF                               | 
| mp3                                    | audio/mpeg                     | ID3v1.1, ID3v2.2, ID3v2.3, ID3v2.4 | 
| ogv, oga, ogx, ogg                     | audio/ogg, application/ogg     | Vorbis                             |


* Support for [MusicBrainz](https://pages.github.com/) / [Picard](https://picard.musicbrainz.org/) [tags](https://picard.musicbrainz.org/docs/tags/)
* Support for encoding / format details:
  * bitrate
  * sample depth
  * duration
  * encoding profile (e.g. CBR, V0, V2)
  

## API

### Options:
  * `duration`: default: `false`, if set to `true`, it will parse the whole media file if required to determine the duration.
  * `native`: default: `false`, if set to `true`, it will return native tags in addition to the `common` tags.
  * `skipCovers`: default: `false`, if set to `true`, it will not return embedded cover-art (images).
    

### Examples

##### JavaScript
```javascript
var mm = require('music-metadata');
const util = require('util')

mm.parseFile('../test/samples/MusicBrainz-multiartist [id3v2.4].V2.mp3', {native: true})
  .then(function (metadata) {
    console.log(util.inspect(metadata, { showHidden: false, depth: null }));
  })
  .catch(function (err) {
    console.error(err.message);
  });
```

##### TypeScript
```TypeScript
import * as mm from 'music-metadata';
import * as util from 'util';

mm.parseFile('../test/samples/MusicBrainz-multiartist [id3v2.4].V2.mp3')
  .then((metadata) => {
    console.log(util.inspect(metadata, {showHidden: false, depth: null}));
  })
  .catch((err) => {
    console.error(err.message);
  });
```

Although in most cases duration is included, in some cases it requires `music-metadata` parsing the entire file.
To enforce parsing the entire file if needed you should set `duration` to `true`.
```javascript
mm.parseFile('sample.mp3', {duration: true})
  .then(function (metadata) {
    console.log(util.inspect(metadata, { showHidden: false, depth: null }));
  })
```
For a live example see [_Parse MP3 (ID3v2.4 tags) stream with music-metadata_](https://runkit.com/borewit/parse-mp3-id3v2-4-tags-stream-with-music-metadata), hosted on RunKit.

In order to read the duration of a stream (with the exception of file streams), in some cases you should pass the size of the file in bytes.
```javascript
mm.parseStream(someReadStream, 'audio/mpeg', { duration: true, fileSize: 26838 })
  .then( function (metadata) {
     console.log(util.inspect(metadata, { showHidden: false, depth: null }));
     someReadStream.close();
   });
```

Licence
-----------------
(The MIT License)

Copyright (c) 2017 Borewit

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


