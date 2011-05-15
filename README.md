Installation
------------
Install via npm:

npm install musicmetadata


Supports
-----------------
mp3 (1.1, 2.2, 2.3, 2.4), m4a(mp4), vorbis (ogg, flac)


API
-----------------
```javascript
var fs = require('fs'),
    musicmetadata = require('musicmetadata');

//create a new parser from a node ReadStream
var parser = new musicmetadata(fs.createReadStream('sample.mp3'));

//listen for the metadata event
parser.on('metadata', function(result) {
  console.log(result);
});
```


This will output the standard music metadata:

```javascript
{ artist : 'Spor',
  album : 'Nightlife, Vol 5.',
  albumartist : ['Andy C', 'Spor'],
  title : 'Stronger',
  year : '2010',
  track : { no : 1, of : 44 },
  disk : { no : 1, of : 2 },
  picture : { format : 'jpg', data : <Buffer> }
}
```
        
If you just want the artist - listen for the artist event:

```javascript
parser.on('artist', function(result) {
  console.log(result);
});
```
    
You can also listen for the 'done' event, this will be raised when parsing has finished or an error has occurred. This could be
used to disconnect from the stream as soon as parsing has finished, saving bandwidth.

```javascript
parser.on('done', function(err) {
if (err) throw err;	
  stream.destroy();
});
```
    

## Changelog

### v0.1.1

* Better utf-16 handling
* Now reads iso-8859-1 encoded id3 frames correctly
* Artwork is now part of the 'metadata' event

[Commits](https://github.com/leetreveil/node-musicmetadata/compare/0.1.0...0.1.1)