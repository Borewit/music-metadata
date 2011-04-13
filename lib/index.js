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
    parser.emit = emitClosure(self);

    //re-emitting the same data event so the correct id3 processor picks up the stream from the start
    //is it possible that the id3 processor could pick up the NEXT event before the first one is re-emitted?
    self.stream.emit('data', result);
  });
};

//hijack the processors emit function so we can see what the event is
var emitClosure = function(self) {
  var metadata = {};
  function emit() {
    var event = arguments[0];
    var value = arguments[1];
          
    if (event === 'done') {
      self.emit('metadata', metadata);
      self.emit('done');
      return;
    }
    
    //lookup alias
    var alias;
    for (var i=0; i < MAPPINGS.length; i++) {
      if (MAPPINGS[i].indexOf(event) > -1) {
        alias = MAPPINGS[i][0];
        break;
      } 
    }
    
    //cleanup the values that are part of the standard metadata
    if (STANDARDMETADATA.indexOf(alias) > -1) {
      var cleaned = value;
      
      if (alias === 'year') {
        cleaned = cleanupYear(value);
      }
      if (alias === 'artist' || alias === 'albumartist') {
        cleaned = cleanupArtist(value);
      }
      if (alias === 'track' || alias === 'disk') {
        cleaned = cleanupTrack(value);
      }
      if (alias === 'genre') {
        cleaned = cleanupGenre(value);
      }
      
      //TODO: find a better way to do this
      //need all this to handle multiple events with the same name
      //being emitted
      if (metadata[alias] && metadata[alias].constructor === Array) {
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
    
    if(metadata[alias]) {
      self.emit(alias, metadata[alias]); //emit stdmetadata & value
    } else if (alias) {
      self.emit(alias, value); //emit mapped event & value
    }
    
    //emit original event & value
    if(event !== alias) {
      self.emit(event, value);
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
function cleanupTrack(origVal) {
  var split = origVal.toString().split('/');
  if (split.length === 1) split[1] = 0;
  return [parseInt(split[0]), parseInt(split[1])];
}

function cleanupYear(origVal) {
  return parseInt(origVal);
}

//returns as an array
function cleanupGenre(origVal) {
  debugger;
  var split = origVal.trim().split(/\((.*?)\)/g).filter(function(val) { return val !== ''; });	
  //match everything inside parentheses	
  var paired = [];
    for (var i=0; i <= split.length; i++) {
      if (split.hasOwnProperty(i)) {
        var cur = split[i];
        if (!isNaN(parseInt(cur))) {
          var result = common.GENRES[cur];
            i++;
            cur = split[i];
            //if we can't convert the string to an int then we know its a proper string
            if (cur !== undefined && isNaN(parseInt(cur))) {
              //we have found a proper string next to a number, probably the refinement
              if (cur[0] === '(') {
                cur = cur.substring(1);
              }
              result = cur;
            }
            paired.push(result);
          } else {
            return split;
          }
      }
    }
    return paired;
}

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
    ['composer',    'TCOM', 'TCM', '©wrt', 'COMPOSER']
];