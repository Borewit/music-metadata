[![Build Status](https://travis-ci.org/Borewit/music-metadata.svg?branch=master)](https://travis-ci.org/Borewit/music-metadata)
[![Build status](https://ci.appveyor.com/api/projects/status/tgtqynlon8t99qq5/branch/master?svg=true)](https://ci.appveyor.com/project/Borewit/music-metadata/branch/master)
[![NPM version](https://badge.fury.io/js/music-metadata.svg)](https://npmjs.org/package/music-metadata)
[![npm downloads](http://img.shields.io/npm/dm/music-metadata.svg)](https://npmjs.org/package/music-metadata)
[![Dependencies](https://david-dm.org/Borewit/music-metadata.svg)](https://david-dm.org/Borewit/music-metadata)
[![Coverage Status](https://coveralls.io/repos/github/Borewit/music-metadata/badge.svg?branch=master)](https://coveralls.io/github/Borewit/music-metadata?branch=master)
[![NSP Status](https://nodesecurity.io/orgs/borewit/projects/c62c75fc-b5fa-4ee6-9cf2-fd01a2217938/badge)](https://nodesecurity.io/orgs/borewit/projects/c62c75fc-b5fa-4ee6-9cf2-fd01a2217938)

Stream and file based music metadata parser for node.

## Installation
Install via [npm](http://npmjs.org):

```
npm install music-metadata
```

## Features

* Supports metadata of the following audio and tag types:

| File extension                         | MIME-type                             |   Tag header type                  |
| -------------------------------------- | ------------------------------------- | ---------------------------------- |
| ape                                    | audio/ape                             | APEv2                              |
| aif, aiff, aifc                        | audio/aiff, audio/x-aif, audio/x-aifc | ID3v2                              |
| asf, wma, wmv                          | audio/x-ms-wma, video/x-ms-asf        | ASF                                |
| flac                                   | audio/flac                            | Vorbis                             | 
| m4a, m4b, m4p, m4v, m4r, 3gp, mp4, aac | audio/aac, audio/aacp                 | QTFF                               | 
| mp2, mp3, m2a                          | audio/mpeg                            | ID3v1.1, ID3v2                     | 
| ogv, oga, ogx, ogg, opus               | audio/ogg, application/ogg            | Vorbis                             |
| wav                                    | audio/wav, audio/wave                 | ID3v2, RIFF/INFO (EXIF 2.3)        |
| wv, wvp                                | audio/x-wavpack                       | APEv2                              |


* Support for [MusicBrainz](https://pages.github.com/) / [Picard](https://picard.musicbrainz.org/) [tags](https://picard.musicbrainz.org/docs/tags/)
* Support for encoding / format details:
  * bitrate
  * sample depth
  * duration
  * encoding profile (e.g. CBR, V0, V2)
  

## API

### Import music-metadata:

This is how you can import music-metadata in JavaScript, in you code:
```JavaScript
var mm = require('music-metadata');
```

This is how it's done in TypeScript:
```TypeScript
import * as mm from 'music-metadata';
```

### Module Functions:

There are two ways to parse (read) audio tracks:
1) Audio (music) files can be parsed using direct file access using the [parseFile function](#parsefile)
2) Using [Node.js streams](https://nodejs.org/api/stream.html) using the [parseStream function](#parseStream).

Direct file access tends to be a little faster, because it can 'jump' to various parts in the file without being obliged to read intermediate date.

#### parseFile function

Parses the specified file (`filePath`) and returns a promise with the metadata result (`IAudioMetadata`).

`parseFile(filePath: string, opts: IOptions = {}): Promise<IAudioMetadata>`

Javascript example:
```javascript
var mm = require('music-metadata');
const util = require('util')

mm.parseFile('../test/samples/Mu' +
 'sicBrainz-multiartist [id3v2.4].V2.mp3', {native: true})
  .then(function (metadata) {
    console.log(util.inspect(metadata, { showHidden: false, depth: null }));
  })
  .catch(function (err) {
    console.error(err.message);
  });
```

Typescript example:
```TypeScript
import * as mm from 'music-metadata';
import * as util from 'util';

mm.parseFile('../test/samples/MusicBrainz-multiartist [id3v2.4].V2.mp3')
  .then( metadata => {
    console.log(util.inspect(metadata, {showHidden: false, depth: null}));
  })
  .catch((err) => {
    console.error(err.message);
  });
```

#### parseStream function

Parses the provided audio stream for metadata. You should specify the corresponding [MIME-type] (https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types). 

`parseStream(stream: Stream.Readable, mimeType: string, opts: IOptions = {}): Promise<IAudioMetadata>`

Example:
```javascript
mm.parseStream(someReadStream, 'audio/mpeg', { fileSize: 26838 })
  .then( function (metadata) {
     console.log(util.inspect(metadata, { showHidden: false, depth: null }));
     someReadStream.close();
   });
```

### Options:
  * `duration`: default: `false`, if set to `true`, it will parse the whole media file if required to determine the duration.
  * `native`: default: `false`, if set to `true`, it will return native tags in addition to the `common` tags.
  * `skipCovers`: default: `false`, if set to `true`, it will not return embedded cover-art (images).
  * `fileSize`: only provide this in combination with `parseStream` function.
  * `mergeTagHeaders`: default: `false`, if set to `true`, it will merge the information from all headers found in the file (highest version has priority).

Although in most cases duration is included, in some cases it requires `music-metadata` parsing the entire file.
To enforce parsing the entire file if needed you should set `duration` to `true`.
    
### Metadata result:

If the returned promise resolves, the metadata (TypeScript `IAudioMetadata` interface) contains:

  * [`format: IFormat`](#format) Audio format information
  * `native: INativeTags` List of native (original) tags found in the parsed audio file. If the native option is set to false, this property is not defined.
  * [`common: ICommonTagsResult`](doc/common_metadata.md) Is a generic (abstract) way of reading metadata information. 
  
#### Format
  
  Audio format information. Defined in the TypeScript `IFormat` interface:
  
  * `dataformat?: string` Audio encoding format. e.g.: 'flac'
  * `tagTypes?: TagType[]`  List of tagging formats found in parsed audio file
  * `duration?: number` Duration in seconds
  * `bitrate?: number` Number bits per second of encoded audio file
  * `sampleRate?: number` Sampling rate in Samples per second (S/s)
  * `bitsPerSample?: number` Audio bit depth
  * `encoder?` Encoder name
  * `codecProfile?: string` Codec profile
  * `lossless?: boolean` True if lossless,  false for lossy encoding
  * `numberOfChannels?: number` Number of audio channels
  * `numberOfSamples?: number` Number of samples frames, one sample contains all channels. The duration is: numberOfSamples / sampleRate
  
#### Common

[Common tag documentation](doc/common_metadata.md) is automatically generated.

## Examples

For a live example see [parse MP3 (ID3v2.4 tags) stream with music-metadata](https://runkit.com/borewit/parse-mp3-id3v2-4-tags-stream-with-music-metadata), hosted on RunKit.

In order to read the duration of a stream (with the exception of file streams), in some cases you should pass the size of the file in bytes.
```javascript
mm.parseStream(someReadStream, 'audio/mpeg', { duration: true, fileSize: 26838 })
  .then( function (metadata) {
     console.log(util.inspect(metadata, { showHidden: false, depth: null }));
     someReadStream.close();
   });
```

## Licence

(The MIT License)

Copyright (c) 2017 Borewit

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


