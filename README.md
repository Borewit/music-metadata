[![Build Status][travis-image]][travis-url] [![NPM version][npm-image]][npm-url] [![npm downloads][npm-downloads-image]][npm-url]

Streaming music metadata parser for node and the browser.

## Installation
Install via [npm](http://npmjs.org):

```
npm install music-metadata
```

You can also download a pre packaged browser release from `dist/music-metadata.js`.
See `example/drop_media_file.html` for usage.

## Features

* Supports metadata of the following audio files:
  * mp3 (ID3v1, ID3v2.2, ID3v2.3, ID3v2.4)
  * m4a (mp4)
  * Ogg (Vorbis)
  * FLAC (Vorbis)
  * ASF (wma, wmv)
  * APE (APEv2)
* Support for [MusicBrainz](https://pages.github.com/) / [Picard](https://picard.musicbrainz.org/) [tags](https://picard.musicbrainz.org/docs/tags/)
* Support for encoding / format details:
  * bitrate
  * sample depth
  * duration
  * encoding profile (e.g. CBR, V0, V2)
  

## API

### Examples

#### JavaScript
```javascript
var fs = require('fs')
var mm = require('music-metadata')
const util = require('util')

var audioStream = fs.createReadStream('../test/samples/MusicBrainz-multiartist [id3v2.4].V2.mp3')

// create a new music-metadata from a node ReadStream
mm.parseStream(audioStream, {native: true}, function (err, metadata) {
  // important note, the stream is not closed by default. To prevent leaks, you must close it yourself
  audioStream.close();
  if (err) throw err;

  console.log(util.inspect(metadata, {showHidden: false, depth: null}));
});
```

#### TypeScript
```TypeScript
import * as fs from 'fs'
import * as mm from 'music-metadata'
import * as util from 'util'

let audioStream = fs.createReadStream('../test/samples/MusicBrainz-multiartist [id3v2.4].V2.mp3')

// create a new music-metadata parser from a node ReadStream
mm.parseStream(audioStream, {native: true}, (err, metadata) => {
  // important note, the stream is not closed by default. To prevent leaks, you must close it yourself
  audioStream.close();
  if (err) throw err;

  console.log(util.inspect(metadata, {showHidden: false, depth: null}));
});
```

This will output the following music metadata:

```javascript
{ 
  common: 
   { 
     artists: [ 'Beth Hart', 'Joe Bonamassa' ],
     track: { no: 1, of: 10 },
     disk: { no: 1, of: 1 },
     title: 'Sinner\'s Prayer',
     artist: 'Beth Hart & Joe Bonamassa',
     album: 'Don\'t Explain',
     year: 2011,
     date: '2011-09-27',
     picture: 
      [ { format: 'jpg',
          data: <Buffer ff d8 ff e0 00 10 4a 46 49 46 00 01 01 00 00 01 00 01 00 00 ff db 00 43 00 03 02 02 03 02 02 03 03 03 03 04 03 03 04 05 08 05 05 04 04 05 0a 07 07 06 ... > } ],
     originaldate: '2011-09-26',
     media: 'CD',
     albumartist: 'Beth Hart & Joe Bonamassa',
     label: 'J&R Adventures',
     albumartistsort: 'Hart, Beth & Bonamassa, Joe',
     artistsort: 'Hart, Beth & Bonamassa, Joe',
     asin: 'B004X5SCGM',
     barcode: '804879313915',
     catalognumber: 'PRAR931391',
     musicbrainz_albumartistid: 
      [ '3fe817fc-966e-4ece-b00a-76be43e7e73c',
        '984f8239-8fe1-4683-9c54-10ffb14439e9' ],
     musicbrainz_albumid: 'e7050302-74e6-42e4-aba0-09efd5d431d8',
     releasestatus: 'official',
     releasetype: [ 'album' ],
     musicbrainz_artistid: 
      [ '3fe817fc-966e-4ece-b00a-76be43e7e73c',
        '984f8239-8fe1-4683-9c54-10ffb14439e9' ],
     musicbrainz_releasegroupid: 'e00305af-1c72-469b-9a7c-6dc665ca9adc',
     musicbrainz_trackid: 'd062f484-253c-374b-85f7-89aab45551c7',
     script: 'Latn',
     originalyear: 2011,
     musicbrainz_recordingid: 'f151cb94-c909-46a8-ad99-fb77391abfb8' },
  format: 
    { duration: 2,
     headerType: 'id3v2.4',
     dataformat: 'mp3',
     lossless: false,
     bitrate: 128000,
     sampleRate: 44100,
     numberOfChannels: 2,
     encoder: 'LAME3.99r',
     codecProfile: 'V2' },
  'id3v2.4': 
   { TIT2: 'Sinner\'s Prayer',
     TPE1: 'Beth Hart & Joe Bonamassa',
     TRCK: '1/10',
     TALB: 'Don\'t Explain',
     TPOS: '1/1',
     TDRC: '2011-09-27',
     APIC: 
      [ { format: 'image/jpeg',
          type: 'Cover (front)',
          description: '',
          data: <Buffer ff d8 ff e0 00 10 4a 46 49 46 00 01 01 00 00 01 00 01 00 00 ff db 00 43 00 03 02 02 03 02 02 03 03 03 03 04 03 03 04 05 08 05 05 04 04 05 0a 07 07 06 ... > } ],
     TDOR: '2011-09-26',
     TIPL: 
      { producer: [ 'Roy Weisman' ],
        engineer: [ 'James McCullagh', 'Jared Kvitka' ],
        arranger: [ 'Jeff Bova' ] },
     TMCL: 
      { 'bass guitar': [ 'Carmine Rojas' ],
        orchestra: [ 'The Bovaland Orchestra' ],
        drums: [ 'Anton Fig' ],
        percussion: [ 'Anton Fig' ],
        guitar: [ 'Blondie Chaplin', 'Joe Bonamassa' ],
        keyboard: [ 'Arlan Scheirbaum' ],
        vocals: [ 'Beth Hart', 'Joe Bonamassa' ],
        piano: [ 'Beth Hart' ] },
     TMED: 'CD',
     TPE2: 'Beth Hart & Joe Bonamassa',
     TPUB: 'J&R Adventures',
     TSO2: 'Hart, Beth & Bonamassa, Joe',
     TSOP: 'Hart, Beth & Bonamassa, Joe',
     'TXXX:ACOUSTID_ID': [ '09c06fac-679a-45b1-8ea0-6ce532318363' ],
     'TXXX:ARRANGER': [ 'Jeff Bova' ],
     'TXXX:ARTISTS': [ 'Joe Bonamassa' ],
     'TXXX:ARTISTSORT': [ 'Hart, Beth & Bonamassa, Joe' ],
     'TXXX:ASIN': 'B004X5SCGM',
     'TXXX:Artists': [ 'Beth Hart', 'Joe Bonamassa' ],
     'TXXX:BARCODE': '804879313915',
     'TXXX:Band': [ 'Beth Hart & Joe Bonamassa' ],
     'TXXX:CATALOGNUMBER': 'PRAR931391',
     'TXXX:ENGINEER': [ 'Jared Kvitka' ],
     'TXXX:LABEL': [ 'J&R Adventures' ],
     'TXXX:MEDIA': [ 'CD' ],
     'TXXX:MUSICBRAINZ_ALBUMARTISTID': [ '984f8239-8fe1-4683-9c54-10ffb14439e9' ],
     'TXXX:MUSICBRAINZ_ALBUMID': [ 'e7050302-74e6-42e4-aba0-09efd5d431d8' ],
     'TXXX:MUSICBRAINZ_ARTISTID': [ '984f8239-8fe1-4683-9c54-10ffb14439e9' ],
     'TXXX:MUSICBRAINZ_RELEASEGROUPID': [ 'e00305af-1c72-469b-9a7c-6dc665ca9adc' ],
     'TXXX:MUSICBRAINZ_RELEASETRACKID': [ 'd062f484-253c-374b-85f7-89aab45551c7' ],
     'TXXX:MUSICBRAINZ_TRACKID': [ 'f151cb94-c909-46a8-ad99-fb77391abfb8' ],
     'TXXX:MusicBrainz Album Artist Id': 
      [ '3fe817fc-966e-4ece-b00a-76be43e7e73c',
        '984f8239-8fe1-4683-9c54-10ffb14439e9' ],
     'TXXX:MusicBrainz Album Id': 'e7050302-74e6-42e4-aba0-09efd5d431d8',
     'TXXX:MusicBrainz Album Status': 'official',
     'TXXX:MusicBrainz Album Type': [ 'album' ],
     'TXXX:MusicBrainz Artist Id': 
      [ '3fe817fc-966e-4ece-b00a-76be43e7e73c',
        '984f8239-8fe1-4683-9c54-10ffb14439e9' ],
     'TXXX:MusicBrainz Release Group Id': 'e00305af-1c72-469b-9a7c-6dc665ca9adc',
     'TXXX:MusicBrainz Release Track Id': 'd062f484-253c-374b-85f7-89aab45551c7',
     'TXXX:NOTES': [ 'Medieval CUE Splitter (www.medieval.it)' ],
     'TXXX:ORIGINALDATE': [ '2011-09-26' ],
     'TXXX:ORIGINALYEAR': [ '2011' ],
     'TXXX:PERFORMER': [ 'Beth Hart (piano)' ],
     'TXXX:PRODUCER': [ 'Roy Weisman' ],
     'TXXX:Part of a set': [ '1/1' ],
     'TXXX:RELEASECOUNTRY': [ 'GB' ],
     'TXXX:RELEASESTATUS': [ 'official' ],
     'TXXX:RELEASETYPE': [ 'album' ],
     'TXXX:SCRIPT': 'Latn',
     'TXXX:originalyear': '2011',
     UFID: 
      [ { owner_identifier: 'http://musicbrainz.org',
          identifier: <Buffer 66 31 35 31 63 62 39 34 2d 63 39 30 39 2d 34 36 61 38 2d 61 64 39 39 2d 66 62 37 37 33 39 31 61 62 66 62 38> } ] } }
```

`music-metadata` also emits all metadata it discovers during parsing. For example if you wanted to read the `TLEN` frame from an id3v2.x file you can do this:

```javascript
parser.on('TLEN', function (result) {
  console.log(result);
});
```

Although in most cases duration is included, in some cases it requires `music-metadata` parsing the entire file.
To enforce parsing the entire file if needed you should set `duration` to `true`.
```javascript
var audioStream = fs.createReadStream('sample.mp3');
mm(audioStream, { duration: true }, function (err, metadata) {
  audioStream.close();
});
```

Note that in order to read the duration for streams that are not file streams, in some cases you should pass the size of the file in bytes.
```javascript
mm.parseStream(noFileStream, { duration: true, fileSize: 26838 }, function (err, metadata) {
  noFileStream.close();
});
```

Licence
-----------------

(The MIT License)

Copyright (c) 2016 Borewit

Based on [musicmetadata] (https://github.com/leetreveil/musicmetadata/) written by Lee Treveil <leetreveil@gmail.com> and many others.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[npm-url]: https://npmjs.org/package/music-metadata
[npm-image]: https://badge.fury.io/js/music-metadata.svg
[npm-downloads-image]: http://img.shields.io/npm/dm/music-metadata.svg

[travis-url]: https://travis-ci.org/Borewit/music-metadata
[travis-image]: https://travis-ci.org/Borewit/music-metadata.svg?branch=master
