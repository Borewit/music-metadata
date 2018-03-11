[![Build Status](https://travis-ci.org/Borewit/music-metadata.svg?branch=master)](https://travis-ci.org/Borewit/music-metadata)
[![Build status](https://ci.appveyor.com/api/projects/status/tgtqynlon8t99qq5/branch/master?svg=true)](https://ci.appveyor.com/project/Borewit/music-metadata/branch/master)
[![NPM version](https://badge.fury.io/js/music-metadata.svg)](https://npmjs.org/package/music-metadata)
[![npm downloads](http://img.shields.io/npm/dm/music-metadata.svg)](https://npmjs.org/package/music-metadata)
[![Dependencies](https://david-dm.org/Borewit/music-metadata.svg)](https://david-dm.org/Borewit/music-metadata)
[![Coverage Status](https://coveralls.io/repos/github/Borewit/music-metadata/badge.svg?branch=master)](https://coveralls.io/github/Borewit/music-metadata?branch=master)
[![NSP Status](https://nodesecurity.io/orgs/borewit/projects/c62c75fc-b5fa-4ee6-9cf2-fd01a2217938/badge)](https://nodesecurity.io/orgs/borewit/projects/c62c75fc-b5fa-4ee6-9cf2-fd01a2217938)

Stream and file based music metadata parser for node.

= Document Title
:toc:

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

Although in most cases duration is included, in some cases it requires `music-metadata` parsing the entire file.
To enforce parsing the entire file if needed you should set `duration` to `true`.
    
### Metadata result:

If the returned promise resolves, the metadata (TypeScript `IAudioMetadata` interface) contains:

  * [`format: IFormat`](#format) Audio format information
  * `native: INativeTags` List of native (original) tags found in the parsed audio file. If the native option is set to false, this property is not defined.
  * [`common: ICommonTagsResult`](#common) Is a generic (abstract) way of reading metadata information.
  
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

| Common tag                 | n | Description                                                                                                    | ID3v1.1 | ID3v2.2 | ID3v2.3                                                     | ID3v2.4                                                     | iTunes MP4                                              | vorbis                     | APEv2                               | asf                               |
|----------------------------|---|----------------------------------------------------------------------------------------------------------------|---------|---------|-------------------------------------------------------------|-------------------------------------------------------------|---------------------------------------------------------|----------------------------|-------------------------------------|-----------------------------------|
| year                       | 1 | Release year                                                                                                   | year    | TYE     | TYER                                                        | TYER                                                        |                                                         |                            |                                     |                                   |
| track                      | 1 | Track number on the media, e.g. `{no: 1, of: 2}`                                                               | track   | TRK     | TRCK                                                        | TRCK                                                        | trkn                                                    | TRACKNUMBER                | TRACK                               | WM/TrackNumber                    |
| disk                       | 1 | Disk or media number, e.g. `{no: 1, of: 2}`                                                                    |         | TPA     | TPOS                                                        | TPOS                                                        | disk                                                    | DISCNUMBER                 | DISC, DISCNUMBER                    | WM/PartOfSet                      |
| title                      | 1 | Track title                                                                                                    | title   | TT2     | TIT2                                                        | TIT2                                                        | ©nam                                                    | TITLE                      | TITLE                               | Title                             |
| artist                     | 1 | Literal written track artist e.g.: `"Beth Hart & Joe Bonamassa"`                                               | artist  | TP1     | TPE1                                                        | TPE1                                                        | ©ART                                                    | ARTIST                     | ARTIST                              | Author                            |
| artists                    | * | Track artists e.g.: `["Beth Hart", "Joe Bonamassa"]`                                                           |         |         | TXXX:Artists                                                | TXXX:Artists                                                | ----:com.apple.iTunes:ARTISTS                           | ARTISTS                    | ARTISTS                             | WM/ARTISTS                        |
| albumartist                | 1 | Literal written album artist e.g.: `"Beth Hart & Joe Bonamassa"`                                               |         | TP2     | TPE2                                                        | TPE2                                                        | aART, ----:com.apple.iTunes:Band                        | ALBUMARTIST                | ALBUM ARTIST                        | WM/AlbumArtist                    |
| album                      | 1 | Album title                                                                                                    | album   | TAL     | TALB                                                        | TALB                                                        | ©alb                                                    | ALBUM                      | ALBUM                               | WM/AlbumTitle                     |
| date                       | 1 | Release date                                                                                                   |         |         | TDRV, TDRC                                                  | TDRV, TDRC                                                  | ©day                                                    | DATE                       | YEAR                                | WM/Year                           |
| originaldate               | 1 | Original (initial) release date, formatted like: YYYY-MM-DD                                                    |         | TOR     | TDOR                                                        | TDOR                                                        | ----:com.apple.iTunes:ORIGINALDATE                      | ORIGINALDATE               | ORIGINALDATE                        | WM/OriginalReleaseTime            |
| originalyear               | 1 | Original (initial) release year                                                                                |         |         | TORY, TXXX:originalyear                                     | TORY, TXXX:originalyear                                     | ----:com.apple.iTunes:ORIGINALYEAR                      | ORIGINALYEAR               | ORIGINALYEAR                        | WM/OriginalReleaseYear            |
| comment                    | * | Comments                                                                                                       | comment | COM     | COMM:description, COMM                                      | COMM:description, COMM                                      | ©cmt, ----:com.apple.iTunes:NOTES                       | COMMENT                    | COMMENT                             | Description                       |
| genre                      | * | Genres                                                                                                         | genre   | TCO     | TCON, TXXX:STYLE                                            | TCON, TXXX:STYLE                                            | ©gen, gnre                                              | GENRE, STYLE               | GENRE                               | WM/Genre                          |
| picture                    | * | Embedded cover art                                                                                             |         | PIC     | APIC                                                        | APIC                                                        | covr                                                    | METADATA_BLOCK_PICTURE     | COVER ART (FRONT), COVER ART (BACK) | WM/Picture                        |
| composer                   | * | Composer                                                                                                       |         | TCM     | TCOM                                                        | TCOM                                                        | ©wrt                                                    | COMPOSER                   | COMPOSER                            | WM/Composer                       |
| lyrics                     | * | Lyricist                                                                                                       |         |         | USLT:description, SYLT                                      | USLT:description, SYLT                                      | ©lyr                                                    | LYRICS                     | LYRICS                              | WM/Lyrics                         |
| albumsort                  | 1 | Album title, formatted for alphabetic ordering                                                                 |         |         | TSOA                                                        | TSOA                                                        | soal                                                    | ALBUMSORT                  | ALBUMSORT                           | WM/AlbumSortOrder                 |
| titlesort                  | 1 | Track title, formatted for alphabetic ordering                                                                 |         |         | TSOT                                                        | TSOT                                                        | sonm                                                    | TITLESORT                  | TITLESORT                           | WM/TitleSortOrder                 |
| work                       | 1 |                                                                                                                |         | TOT     |                                                             |                                                             |                                                         | WORK                       | WORK                                | WM/Work                           |
| artistsort                 | 1 | Track artist sort name                                                                                         |         |         | TSOP                                                        | TSOP                                                        | soar                                                    | ARTISTSORT                 | ARTISTSORT                          | WM/ArtistSortOrder                |
| albumartistsort            | 1 | Album artist sort name                                                                                         |         |         | TSO2                                                        | TSO2                                                        | soaa, ----:com.apple.iTunes:ALBUMARTISTSORT             | ALBUMARTISTSORT            | ALBUMARTISTSORT                     | WM/AlbumArtistSortOrder           |
| composersort               | * | Composer, formatted for alphabetic ordering                                                                    |         |         | TSOC                                                        | TSOC                                                        | soco                                                    | COMPOSERSORT               | COMPOSERSORT                        | WM/ComposerSortOrder              |
| lyricist                   | * | Lyricist, formatted for alphabetic ordering                                                                    |         | TXT     | TEXT                                                        | TEXT                                                        | ----:com.apple.iTunes:LYRICIST                          | LYRICIST                   | LYRICIST                            | WM/Writer                         |
| writer                     | * | Writer                                                                                                         |         |         | TXXX:Writer                                                 | TXXX:Writer                                                 |                                                         | WRITER                     | WRITER                              |                                   |
| conductor                  | * | Conductor                                                                                                      |         | TP3     | TPE3                                                        | TPE3                                                        | ----:com.apple.iTunes:CONDUCTOR                         | CONDUCTOR                  | CONDUCTOR                           | WM/Conductor                      |
| remixer                    | * | Remixer(s)                                                                                                     |         |         | TPE4                                                        | TPE4                                                        | ----:com.apple.iTunes:REMIXER                           | REMIXER                    | MIXARTIST                           | WM/ModifiedBy                     |
| arranger                   | * | Arranger                                                                                                       |         |         | IPLS:arranger, TIPL:arranger                                | IPLS:arranger, TIPL:arranger                                |                                                         | ARRANGER                   | ARRANGER                            |                                   |
| engineer                   | * | Engineer(s)                                                                                                    |         |         | IPLS:engineer, TIPL:engineer                                | IPLS:engineer, TIPL:engineer                                | ----:com.apple.iTunes:ENGINEER                          | ENGINEER                   | ENGINEER                            | WM/Engineer                       |
| producer                   | * | Producer(s)                                                                                                    |         |         | IPLS:producer, TIPL:producer                                | IPLS:producer, TIPL:producer                                | ----:com.apple.iTunes:PRODUCER                          | PRODUCER                   | PRODUCER                            | WM/Producer                       |
| djmixer                    | * | Mix-DJ(s)                                                                                                      |         |         | IPLS:DJ-mix, TIPL:DJ-mix                                    | IPLS:DJ-mix, TIPL:DJ-mix                                    | ----:com.apple.iTunes:DJMIXER                           | DJMIXER                    | DJMIXER                             | WM/DJMixer                        |
| mixer                      | * | Mixed by                                                                                                       |         |         | IPLS:mix, TIPL:mix                                          | IPLS:mix, TIPL:mix                                          | ----:com.apple.iTunes:MIXER                             | MIXER                      | MIXER                               | WM/Mixer                          |
| label                      | 1 | Release label name(s)                                                                                          |         | TPB     | TPUB                                                        | TPUB                                                        | ----:com.apple.iTunes:LABEL                             | LABEL                      | LABEL                               | WM/Publisher                      |
| grouping                   | 1 |                                                                                                                |         | TT1     | TIT1                                                        | TIT1                                                        | ©grp                                                    | GROUPING                   | GROUPING                            | WM/ContentGroupDescription        |
| subtitle                   | 1 |                                                                                                                |         | TT3     | TIT3                                                        | TIT3                                                        | ----:com.apple.iTunes:SUBTITLE                          | SUBTITLE                   | SUBTITLE                            | WM/SubTitle                       |
| discsubtitle               | 1 | The Media Title given to a specific disc                                                                       |         |         | TSST                                                        | TSST                                                        | ----:com.apple.iTunes:DISCSUBTITLE                      | DISCSUBTITLE               | DISCSUBTITLE                        | WM/SetSubTitle                    |
| totaltracks                | 1 |                                                                                                                |         |         |                                                             |                                                             |                                                         | TRACKTOTAL, TOTALTRACKS    |                                     |                                   |
| totaldiscs                 | 1 |                                                                                                                |         |         |                                                             |                                                             |                                                         | DISCTOTAL, TOTALDISCS      |                                     |                                   |
| compilation                | 1 |                                                                                                                |         |         | TCMP                                                        | TCMP                                                        | cpil                                                    | COMPILATION                | COMPILATION                         | WM/IsCompilation                  |
| _rating                    | 1 |                                                                                                                |         |         | POPM                                                        | POPM                                                        |                                                         | RATING:user@email          |                                     | WM/SharedUserRating               |
| bpm                        | 1 | Beats Per Minute (BPM)                                                                                         |         |         | TBPM                                                        | TBPM                                                        | tmpo                                                    | BPM                        | BPM                                 | WM/BeatsPerMinute                 |
| mood                       | 1 |                                                                                                                |         |         | TMOO                                                        | TMOO                                                        | ----:com.apple.iTunes:MOOD                              | MOOD                       | MOOD                                | WM/Mood                           |
| media                      | 1 | Release Format                                                                                                 |         |         | TMED                                                        | TMED                                                        | ----:com.apple.iTunes:MEDIA                             | MEDIA                      | MEDIA                               | WM/Media                          |
| catalognumber              | 1 | Release catalog number(s)                                                                                      |         |         | TXXX:CATALOGNUMBER, TXXX:CATALOGID                          | TXXX:CATALOGNUMBER, TXXX:CATALOGID                          | ----:com.apple.iTunes:CATALOGNUMBER                     | CATALOGNUMBER, CATALOGID   | CATALOGNUMBER                       | WM/CatalogNo                      |
| show                       | 1 |                                                                                                                |         |         |                                                             |                                                             | tvsh                                                    |                            |                                     |                                   |
| showsort                   | 1 |                                                                                                                |         |         |                                                             |                                                             | sosn                                                    |                            |                                     |                                   |
| podcast                    | 1 |                                                                                                                |         |         |                                                             |                                                             | pcst                                                    |                            |                                     |                                   |
| podcasturl                 | 1 |                                                                                                                |         |         |                                                             |                                                             | purl                                                    |                            |                                     |                                   |
| releasestatus              | 1 |                                                                                                                |         |         | TXXX:MusicBrainz Album Status                               | TXXX:MusicBrainz Album Status                               | ----:com.apple.iTunes:MusicBrainz Album Status          | RELEASESTATUS              | MUSICBRAINZ_ALBUMSTATUS             | MusicBrainz/Album Status          |
| releasetype                | * |                                                                                                                |         |         | TXXX:MusicBrainz Album Type                                 | TXXX:MusicBrainz Album Type                                 | ----:com.apple.iTunes:MusicBrainz Album Type            | RELEASETYPE                | MUSICBRAINZ_ALBUMTYPE               | MusicBrainz/Album Type            |
| releasecountry             | 1 |                                                                                                                |         |         | TXXX:MusicBrainz Album Release Country, TXXX:RELEASECOUNTRY | TXXX:MusicBrainz Album Release Country, TXXX:RELEASECOUNTRY | ----:com.apple.iTunes:MusicBrainz Album Release Country | RELEASECOUNTRY             | RELEASECOUNTRY                      | MusicBrainz/Album Release Country |
| script                     | 1 |                                                                                                                |         |         | TXXX:SCRIPT                                                 | TXXX:SCRIPT                                                 | ----:com.apple.iTunes:SCRIPT                            | SCRIPT                     | SCRIPT                              | WM/Script                         |
| language                   | 1 |                                                                                                                |         | TLA     | TLAN                                                        | TLAN                                                        | ----:com.apple.iTunes:LANGUAGE                          | LANGUAGE                   | LANGUAGE                            | WM/Language                       |
| copyright                  | 1 |                                                                                                                |         | TCR     | TCOP                                                        | TCOP                                                        | cprt                                                    | COPYRIGHT                  | COPYRIGHT                           | Copyright                         |
| license                    | 1 |                                                                                                                |         | WCP     | WCOP                                                        | WCOP                                                        | ----:com.apple.iTunes:LICENSE                           | LICENSE                    | LICENSE                             | LICENSE                           |
| encodedby                  | 1 |                                                                                                                |         | TEN     | TENC                                                        | TENC                                                        | ©too                                                    | ENCODEDBY                  | ENCODEDBY                           | WM/EncodedBy                      |
| encodersettings            | 1 |                                                                                                                |         | TSS     | TSSE                                                        | TSSE                                                        |                                                         | ENCODERSETTINGS            | ENCODERSETTINGS                     | WM/EncodingSettings               |
| gapless                    | 1 |                                                                                                                |         |         |                                                             |                                                             | pgap                                                    |                            |                                     |                                   |
| barcode                    | 1 | Release Barcode                                                                                                |         |         | TXXX:BARCODE                                                | TXXX:BARCODE                                                | ----:com.apple.iTunes:BARCODE                           | BARCODE                    | BARCODE                             | WM/Barcode                        |
| isrc                       | 1 | [ISRC](http://www.isrc.net/)                                                                                   |         |         | TSRC                                                        | TSRC                                                        | ----:com.apple.iTunes:ISRC                              | ISRC                       | ISRC                                | WM/ISRC                           |
| asin                       | 1 | Amazon Standard Identification Number (ASIN)                                                                   |         |         | TXXX:ASIN                                                   | TXXX:ASIN                                                   | ----:com.apple.iTunes:ASIN                              | ASIN                       | ASIN                                | ASIN                              |
| musicbrainz_recordingid    | 1 |                                                                                                                |         |         | UFID:http://musicbrainz.org                                 | UFID:http://musicbrainz.org                                 | ----:com.apple.iTunes:MusicBrainz Track Id              | MUSICBRAINZ_TRACKID        | MUSICBRAINZ_TRACKID                 | MusicBrainz/Track Id              |
| musicbrainz_trackid        | 1 |                                                                                                                |         |         | TXXX:MusicBrainz Release Track Id                           | TXXX:MusicBrainz Release Track Id                           | ----:com.apple.iTunes:MusicBrainz Release Track Id      | MUSICBRAINZ_RELEASETRACKID | MUSICBRAINZ_RELEASETRACKID          | MusicBrainz/Release Track Id      |
| musicbrainz_albumid        | 1 |                                                                                                                |         |         | TXXX:MusicBrainz Album Id                                   | TXXX:MusicBrainz Album Id                                   | ----:com.apple.iTunes:MusicBrainz Album Id              | MUSICBRAINZ_ALBUMID        | MUSICBRAINZ_ALBUMID                 | MusicBrainz/Album Id              |
| musicbrainz_artistid       | * |                                                                                                                |         |         | TXXX:MusicBrainz Artist Id                                  | TXXX:MusicBrainz Artist Id                                  | ----:com.apple.iTunes:MusicBrainz Artist Id             | MUSICBRAINZ_ARTISTID       | MUSICBRAINZ_ARTISTID                | MusicBrainz/Artist Id             |
| musicbrainz_albumartistid  | * |                                                                                                                |         |         | TXXX:MusicBrainz Album Artist Id                            | TXXX:MusicBrainz Album Artist Id                            | ----:com.apple.iTunes:MusicBrainz Album Artist Id       | MUSICBRAINZ_ALBUMARTISTID  | MUSICBRAINZ_ALBUMARTISTID           | MusicBrainz/Album Artist Id       |
| musicbrainz_releasegroupid | 1 |                                                                                                                |         |         | TXXX:MusicBrainz Release Group Id                           | TXXX:MusicBrainz Release Group Id                           | ----:com.apple.iTunes:MusicBrainz Release Group Id      | MUSICBRAINZ_RELEASEGROUPID | MUSICBRAINZ_RELEASEGROUPID          | MusicBrainz/Release Group Id      |
| musicbrainz_workid         | 1 |                                                                                                                |         |         | TXXX:MusicBrainz Work Id                                    | TXXX:MusicBrainz Work Id                                    | ----:com.apple.iTunes:MusicBrainz Work Id               | MUSICBRAINZ_WORKID         | MUSICBRAINZ_WORKID                  | MusicBrainz/Work Id               |
| musicbrainz_trmid          | 1 |                                                                                                                |         |         | TXXX:MusicBrainz TRM Id                                     | TXXX:MusicBrainz TRM Id                                     | ----:com.apple.iTunes:MusicBrainz TRM Id                | MUSICBRAINZ_TRMID          | MUSICBRAINZ_TRMID                   | MusicBrainz/TRM Id                |
| musicbrainz_discid         | 1 | [Disc ID](https://musicbrainz.org/doc/Disc_ID) is the code number which MusicBrainz uses to link a physical CD |         |         | TXXX:MusicBrainz Disc Id                                    | TXXX:MusicBrainz Disc Id                                    | ----:com.apple.iTunes:MusicBrainz Disc Id               | MUSICBRAINZ_DISCID         | MUSICBRAINZ_DISCID                  | MusicBrainz/Disc Id               |
| acoustid_id                | 1 | the open-source (acoustic fingerprint)[https://en.wikipedia.org/wiki/Acoustic_fingerprint] system              |         |         | TXXX:ACOUSTID_ID, TXXX:Acoustid Id                          | TXXX:ACOUSTID_ID, TXXX:Acoustid Id                          | ----:com.apple.iTunes:Acoustid Id                       | ACOUSTID_ID                | ACOUSTID_ID                         | Acoustid/Id                       |
| acoustid_fingerprint       | 1 |                                                                                                                |         |         | TXXX:Acoustid Fingerprint                                   | TXXX:Acoustid Fingerprint                                   | ----:com.apple.iTunes:Acoustid Fingerprint              | ACOUSTID_ID_FINGERPRINT    | ACOUSTID_FINGERPRINT                | Acoustid/Fingerprint              |
| musicip_puid               | 1 |                                                                                                                |         |         | TXXX:MusicIP PUID                                           | TXXX:MusicIP PUID                                           | ----:com.apple.iTunes:MusicIP PUID                      | MUSICIP_PUID               | MUSICIP_PUID                        | MusicIP/PUID                      |
| musicip_fingerprint        | 1 |                                                                                                                |         |         | TXXX:MusicMagic Fingerprint                                 | TXXX:MusicMagic Fingerprint                                 | ----:com.apple.iTunes:fingerprint                       |                            |                                     |                                   |
| website                    | 1 |                                                                                                                |         | WAR     | WOAR                                                        | WOAR                                                        |                                                         | WEBSITE                    | WEBLINK                             | WM/AuthorURL                      |
| performer:instrument       | * |                                                                                                                |         |         |                                                             |                                                             |                                                         |                            |                                     |                                   |
| averageLevel               | 1 |                                                                                                                |         |         | PRIV:AverageLevel                                           | PRIV:AverageLevel                                           |                                                         |                            |                                     |                                   |
| peakLevel                  | 1 |                                                                                                                |         |         | PRIV:PeakLevel                                              | PRIV:PeakLevel                                              |                                                         |                            |                                     |                                   |
| notes                      | * |                                                                                                                |         |         |                                                             |                                                             |                                                         | NOTES                      |                                     |                                   |
| key                        | 1 |                                                                                                                |         |         | TKEY                                                        | TKEY                                                        |                                                         |                            |                                     | WM/InitialKey                     |
| originalalbum              | 1 |                                                                                                                |         |         | TOAL                                                        | TOAL                                                        |                                                         |                            |                                     |                                   |
| originalartist             | 1 |                                                                                                                |         |         | TOPE                                                        | TOPE                                                        |                                                         |                            |                                     |                                   |
| discogs_release_id         | 1 |                                                                                                                |         |         | TXXX:DISCOGS_RELEASE_ID                                     | TXXX:DISCOGS_RELEASE_ID                                     |                                                         | DISCOGS_RELEASE_ID         |                                     |                                   |
| replaygain_track_peak      | 1 |                                                                                                                |         |         | TXXX:replaygain_track_peak                                  | TXXX:replaygain_track_peak                                  |                                                         | REPLAYGAIN_TRACK_PEAK      |                                     |                                   |
| replaygain_track_gain      | 1 |                                                                                                                |         |         | TXXX:replaygain_track_gain                                  | TXXX:replaygain_track_gain                                  |                                                                                                      |


For a live example see [parse MP3 (ID3v2.4 tags) stream with music-metadata](https://runkit.com/borewit/parse-mp3-id3v2-4-tags-stream-with-music-metadata), hosted on RunKit.

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


