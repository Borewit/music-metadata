Installation
------------

Install via npm:

npm install musicmetadata

API
-----------------

    var fs = require('fs');
    var musicmetadata = require('musicmetadata');
    
    //create a new parser from a node ReadStream
    var parser = new musicmetadata(fs.createReadStream('sample.mp3'));
    
    //listen for the metadata event
    parser.on('metadata', function(result) {
        console.log(result);
    });
    
    //start the parser
    parser.parse();


This will output the standard music metadata:

    { artist: 'Spor',
      album: 'Nightlife, Vol 5.',
      albumartist: 'Andy C',
      title: 'Stronger',
      year: 2010,
      track: [1,44],
      disk: [1,2] }
      
If you just want the artist - listen for the artist event:

    parser.on('artist', function(result) {
        console.log(result);
    });