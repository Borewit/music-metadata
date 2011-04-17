var common = require('./common');

var MusicMetadata = module.exports = function(stream) {
  this.stream = stream;
  this.parse();
};

MusicMetadata.prototype = new process.EventEmitter();

MusicMetadata.prototype.parse = function() {
  var self = this;

  this.stream.once('data', function(result) {
    //default to id3v1.1 if we cannot detect any other tags
    var version = 'id3v1'; 

    if ('ID3' === result.toString('binary', 0, 3)) {
      version = 'id3v2';
    } else if ('ftypM4A' === result.toString('binary', 4, 11)) {
      version = 'id4';
    } else if ('OggS' === result.toString('binary', 0, 4)) {
      version = 'vorbis';
    }
        
    var module = require('./' + version);
    var parser = new module(self.stream);
    //hijack the processors emit function so we can see what the event is
    parser.emit = emitClosure(self);

    //re-emitting the same data event so the correct id3 processor picks up the stream from the start
    //is it possible that the id3 processor could pick up the NEXT event before the first one is re-emitted?
    self.stream.emit('data', result);
  });
};

var emitClosure = function(self) {
  var metadata = STDMETADATA;
  
  function emit() {
    var event = arguments[0];
    var value = arguments[1];
    
    debugger;
          
    if (event === 'done') {
      self.emit('metadata', metadata);
      self.emit('done');
      return emit;
    }
    
    //lookup alias
    var alias;
    for (var i=0; i < MAPPINGS.length; i++) {
      if (MAPPINGS[i].indexOf(event) > -1) {
        alias = MAPPINGS[i][0];
      } 
    }
    
    //emit original event & value
    if(event !== alias) {
      self.emit(event, value);
    }

    //if the event has been aliased then we need to clean it before
    //it is emitted to the user. e.g. genre (20) -> Electronic
    if (alias) {
      if (alias === 'genre') value = common.parseGenre(value);
      self.emit(alias, value);
    }
    
    if (STDMETADATA.hasOwnProperty(alias)) {
      //cleanup the values that are part of the standard metadata
      var cleaned = value;
      if (alias === 'year') cleaned = cleanupYear(value);
      if (alias === 'track') cleaned = cleanupTrack(value, 0);
      if (alias === 'disk') cleaned = cleanupTrack(value, 1);
      
      //populate the metadata object
      if (metadata[alias].constructor === Array) {
        if (cleaned.constructor === String) {
          cleaned = cleaned.split('/');
        }

        if (cleaned.constructor === Array) {
          for (var i=0; i < cleaned.length; i++) {
            metadata[alias].push(cleaned[i]);
          }
        } else {
          metadata[alias].push(cleaned);
        }
      } else {
        metadata[alias] = cleaned; 
      }
    }
  } 
  return emit;
};

function cleanupArtist(origVal) {
  return origVal.split('/');
}

//TODO: a string of 1of1 would fail to be converted
//converts 1/1 to [1,1]
//or 1 to [1,0]
function cleanupTrack(origVal, totalDefault) {
  var split = origVal.toString().split('/');
  if (split.length === 1) split[1] = totalDefault;
  return [parseInt(split[0]), parseInt(split[1])];
}

function cleanupYear(origVal) {
  return parseInt(origVal);
}
      
var STDMETADATA = { title : '', artist : [], albumartist : [], album : '',
                    year : 0, track : [], disk : [], genre : [] };
                        
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
    ['composer',    'TCOM', 'TCM', '©wrt', 'COMPOSER']
];