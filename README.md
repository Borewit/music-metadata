[![Build Status][travis-image]][travis-url] [![NPM version][npm-image]][npm-url] [![npm downloads][npm-downloads-image]][npm-url]

Streaming music metadata parser for node and the browser.

Installation
------------
Install via [npm](http://npmjs.org):

```
npm install music-metadata
```

You can also download a pre packaged browser release from `dist/music-metadata.js`.
See `example/drop_media_file.html` for usage.


Supports
-----------------
* mp3 (1.1, 2.2, 2.3, 2.4)
* m4a (mp4)
* vorbis (ogg, flac)
* asf (wma, wmv)
* MonkeyAudio, APEv2 (ape)


API
-----------------
```javascript
var fs = require('fs');
var mm = require('music-metadata');

// create a new parser from a node ReadStream
var parser = mm(fs.createReadStream('04. Lungs.flac'), {native: true, duration: true}, function (err, metadata) {
  if (err) throw err;
  console.log(metadata);
});
```

This will output the following music metadata:

```javascript
{
  "common": {
    "title": "Lungs",
    "artist": ["I Have A Tribe"],
    "albumartist": ["I Have A Tribe"],
    "album": "No Countries",
    "year": "2015",
    "track": {"no": 4, "of": 5},
    "genre": ["Pop Rock"],
    "disk": {"no": 1, "of": 1},
    "picture": [
      {
        "format": "jpg",
        "data": {
          "type": "Buffer",
          "data": ["..."]
        }
      }
    ],
    "grouping": "Rock",
    "copyright": "2015 Grönland Records",
    "releasecountry": "DE",
    "label": "Grönland Records",
    "musicbrainz_albumartistid": ["d8e73ae6-9884-4061-a056-c686b3375c9d"],
    "date": "2015-10-16",
    "musicbrainz_trackid": "ed040a93-1f95-4f91-8c41-359f5a6e7770",
    "albumartistsort": ["I Have a Tribe"],
    "originaldate": "2015-10-16",
    "script": "Latn",
    "musicbrainz_albumid": "4f54e938-89b4-4ee8-b282-74964f1e23bb",
    "releasestatus": "official",
    "acoustid_id": "5c94b20e-be79-4f6d-9800-d4caf8bc2a76",
    "catalognumber": "DAGRON153",
    "musicbrainz_artistid": ["d8e73ae6-9884-4061-a056-c686b3375c9d"],
    "media": "Digital Media",
    "releasetype": ["ep"],
    "originalyear": "2015",
    "musicbrainz_releasegroupid": "9c288627-be99-490e-9d3e-e6b135e9b8dd",
    "musicbrainz_recordingid": "a1a9ede1-219b-464c-9520-d9fd1debf933",
    "artistsort": ["I Have a Tribe"]
  },

  "format": {
    "duration": 266.56,
    "numberOfChannels": 2,
    "bitsPerSample": 16,
    "headerType": "vorbis",
    "sampleRate": 44100
  },

  "vorbis": {
    "GROUPING": "Rock",
    "COPYRIGHT": "2015 Grönland Records",
    "GENRE": ["Pop Rock"],
    "DESCRIPTION": ["Interprètes : I Have A Tribe, Main Artist; Patrick O'Laoghaire, Composer, Lyricist; Copyright Control\r\nLabel : Grönland Records - GoodToGo\r\n"],
    "TITLE": "Lungs",
    "RELEASECOUNTRY": "DE",
    "TOTALDISCS": ["1"],
    "LABEL": "Grönland Records",
    "TOTALTRACKS": ["5"],
    "MUSICBRAINZ_ALBUMARTISTID": ["d8e73ae6-9884-4061-a056-c686b3375c9d"],
    "DATE": "2015-10-16",
    "DISCNUMBER": "1",
    "TRACKTOTAL": "5",
    "MUSICBRAINZ_RELEASETRACKID": "ed040a93-1f95-4f91-8c41-359f5a6e7770",
    "ALBUMARTISTSORT": ["I Have a Tribe"],
    "ORIGINALDATE": "2015-10-16",
    "SCRIPT": "Latn",
    "MUSICBRAINZ_ALBUMID": "4f54e938-89b4-4ee8-b282-74964f1e23bb",
    "RELEASESTATUS": "official",
    "ALBUMARTIST": ["I Have A Tribe"],
    "ACOUSTID_ID": "5c94b20e-be79-4f6d-9800-d4caf8bc2a76",
    "CATALOGNUMBER": "DAGRON153",
    "ALBUM": "No Countries",
    "MUSICBRAINZ_ARTISTID": ["d8e73ae6-9884-4061-a056-c686b3375c9d"],
    "MEDIA": "Digital Media",
    "RELEASETYPE": ["ep"],
    "ORIGINALYEAR": "2015",
    "ARTIST": ["I Have A Tribe"],
    "DISCTOTAL": "1",
    "MUSICBRAINZ_RELEASEGROUPID": "9c288627-be99-490e-9d3e-e6b135e9b8dd",
    "MUSICBRAINZ_TRACKID": "a1a9ede1-219b-464c-9520-d9fd1debf933",
    "ARTISTSORT": ["I Have a Tribe"],
    "ARTISTS": ["I Have A Tribe"],
    "TRACKNUMBER": "4",
    "METADATA_BLOCK_PICTURE": [
      {
        "type": "Cover (front)",
        "format": "image/jpeg",
        "description": "Official cover included in digital release",
        "width": 0,
        "height": 0,
        "colour_depth": 0,
        "indexed_color": 0,
        "data": {
          "type": "Buffer",
          "data": ["..."]
        }
      }
    ]
  }
}
```

Note, the stream is not closed by default. To prevent leaks, you must close it yourself:
```javascript
var readableStream = fs.createReadStream('sample.mp3');
var parser = mm(readableStream, function (err, metadata) {
  if (err) throw err;
  readableStream.close();
});
```

`music-metadata` also emits all metadata it discovers during parsing. For example if you wanted to read the `TLEN` frame from an id3v2.x file you can do this:

```javascript
parser.on('TLEN', function (result) {
  console.log(result);
});
```

You can also read the duration; to calculate the duration `music-metadata` may need to parse the entire file
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

Copyright (c) 2016 Borewit

Based on [musicmetadata] (https://github.com/leetreveil/musicmetadata/) written by Lee Treveil <leetreveil@gmail.com> and many others.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[npm-url]: https://npmjs.org/package/music-metadata
[npm-image]: https://badge.fury.io/js/music-metadata.svg
[npm-downloads-image]: http://img.shields.io/npm/dm/music-metadata.svg

[travis-url]: https://travis-ci.org/profile/Borewit/music-metadata
[travis-image]: https://api.travis-ci.org/Borewit/music-metadata.svg?branch=master
