var ID3File = function(stream) {
    this.stream = stream;
};

module.exports = ID3File;

ID3File.prototype = new process.EventEmitter();

ID3File.prototype.parse = function() {
    var self = this,
        metadata = {};
        
    this.stream.once('data', function(result) {
        var version = 'id3v1'; //default to id3v1.1 if we cannot detect any other tags

        if ('ID3' === result.toString('binary', 0, 3)) {
            version = 'id3v2';
        } else if ('ftypM4A' === result.toString('binary', 4, 11)) {
            version = 'id4';
        } else if ('OggS' === result.toString('binary', 0, 4)) {
			version = 'vorbis';
		}
        
        var module = require('./' + version);
        var processor = new module(self.stream);

        processor.emit = function() {
            //debugger;
            var event = arguments[0];
            var value = arguments[1];
            
            if(event === 'done') {
                self.emit('metadata', metadata);
                self.emit('done');
                return;
            }
            
            self.emit(event, value); //emit original event
            
            //rewrite to new alias
            var mappedTo;
            for(var i in MAPPINGS) {
                if(MAPPINGS[i].indexOf(event) > -1) {
                    mappedTo = MAPPINGS[i][0];
                    break;
                } 
            }
            
             //don't emit events that have already been emitted
            if(mappedTo !== event && mappedTo !== undefined) {
                self.emit(mappedTo, value);
            }
            
            var mdataObj = metadata[mappedTo]; 
            //if we are adding a new value to the metadata for one that exists already
            if(mdataObj !== undefined) {
                //convert into array and add new value on
                if (Object.prototype.toString.call(mdataObj) === '[object String]') {
                    var old = mdataObj;
                    mdataObj = [];
                    mdataObj.push(old);
                    mdataObj.push(value)
                }else if (Object.prototype.toString.call(mdataObj) === '[object Array]') {
                    mdataObj.push(value);
                }
            //this will be the first time the object is added to the metadata
            }else if (STANDARDMETADATA.indexOf(mappedTo) > -1) {
                //debugger;
                if (Object.prototype.toString.call(value) === '[object String]') {
                    var split = value.split('/');
                    
                    if (split.length > 1) {
                        value = split;
                    }
                }
                
                mdataObj = value;
            }
            
            if(mdataObj !== undefined) {
                metadata[mappedTo] = mdataObj;
            }
        };
            
        processor.parse();
      
        //re-emitting the same data event so the correct id3 processor picks up the stream from the start
        //is it possible that the id3 processor could pick up the NEXT event before the first one is re-emitted?
        self.stream.emit('data', result);
    });
};

var STANDARDMETADATA = ['title', 'artist', 'albumartist' , 'album', 
                        'year', 'track', 'disk', 'genre'];
                        
                        

//mappings for common metadata types(id3v2.3, id3v2.2, id4, vorbis)
var MAPPINGS = [
    ['title',       'TIT2', 'TT2', '©nam', 'TITLE'],
    ['artist',      'TPE1', 'TP1', '©ART', 'ARTIST'], 
    ['albumartist', 'TPE2', 'TP2', 'aART', 'ALBUMARTIST'], 
    ['album',       'TALB', 'TAL', '©alb', 'ALBUM'], 
    ['year',        'TDRC', 'TYER', 'TYE', '©day', 'DATE'], 
    ['comment',     'COMM', 'COM', '©cmt', 'COMMENT'], 
    ['track',       'TRCK', 'TRK', 'trkn', 'TRACKNUMBER'], 
    ['disk',        'TPOS', 'TPA', 'disk', 'DISCNUMBER'], 
    ['genre',       'TCON', 'TCO', '©gen', 'gnre', 'GENRE'], 
    ['picture',     'APIC', 'PIC', 'covr', 'METADATA_BLOCK_PICTURE'], 
    ['composer',    'TCOM', 'TCM', '©wrt']
];