var common = require('./common'),
    strtok = require('strtok');

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
      version = 'ogg';
    } else if ('fLaC' === result.toString('binary', 0, 4)) {
      version = 'flac';
    }

    var module = require('./' + version);
    var parser = new module(self.stream);
    //hijack the processors emit function so we can see what the event is
    parser.emit = emitClosure(self);

    //re-emitting the same event so the processor picks the
    //stream up from the start
    self.stream.emit('data', result);
  });
};

var emitClosure = function(self) {
  var metadata = { title : '', artist : [], albumartist : [], album : '',
                   year : 0, track : { no : 0, of : 0 }, genre : [],
                   disk : { no : 0, of : 0 }, picture : {} };
  
  var aliased = {};
  
  function emit() {
    var event = arguments[0];
    var value = arguments[1];
    
    if (event === 'done') { 
      for (var alias in aliased) {
        if (aliased.hasOwnProperty(alias)) {
        
          if (alias === 'title' || alias === 'album' || alias === 'year') {
            self.emit(alias, aliased[alias][0]);
            if (metadata.hasOwnProperty(alias)) {
              metadata[alias] = aliased[alias][0];
            }
          } else {
            self.emit(alias, aliased[alias]);
            if (metadata.hasOwnProperty(alias)) {
              metadata[alias] = aliased[alias];
            }
          }
          
        }
      }
      
      self.emit('metadata', metadata);
      self.emit('done', value);
      return;
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
    
    //we need to do something special for these events
    //TODO: parseInt will return NaN for strings
    if (event === 'TRACKTOTAL' || event === 'DISCTOTAL') {
      var evt;
      if (event === 'TRACKTOTAL') evt = 'track';
      if (event === 'DISCTOTAL') evt = 'disk';
      var cleaned = parseInt(value)
      if (!aliased.hasOwnProperty(evt)) {
        aliased[evt] = { no : 0, of : cleaned };
      } else {
        aliased[evt][1] = cleaned;
      }
    }
    
    //if the event has been aliased then we need to clean it before
    //it is emitted to the user. e.g. genre (20) -> Electronic
    if (alias) {
      var cleaned = value;
      if (alias === 'genre') cleaned = common.parseGenre(value);
      if (alias === 'year') cleaned = cleanupYear(value);
      if (alias === 'picture') cleaned = cleanupPicture(value);
      
      if (alias === 'track' || alias === 'disk') {
        cleaned = cleanupTrack(value);
        
        if (aliased[alias]) {
          aliased[alias].no = cleaned.no;
          return;
        } else {
          aliased[alias] = cleaned;
          return;
        }
      }
      
      if (cleaned.constructor === String) {
        cleaned = cleaned.split('/');
        if (cleaned.length === 1) cleaned = cleaned[0];
      }
      
      if (!aliased.hasOwnProperty(alias)) {
        aliased[alias] = [];
      }
      if (cleaned.constructor === Array) {
        aliased[alias] = cleaned;
      } else {
        aliased[alias].push(cleaned);
      }
    }
  };
  
  return emit;
};

function cleanupArtist(origVal) {
  return origVal.split('/');
}

//TODO: a string of 1of1 would fail to be converted
//converts 1/10 to no : 1, of : 10
//or 1 to no : 1, of : 0
function cleanupTrack(origVal) {
  var split = origVal.toString().split('/');
  var number = parseInt(split[0]) || 0;
  var total = parseInt(split[1]) || 0;
  return { no : number, of : total }
}

function cleanupYear(origVal) {
  return parseInt(origVal);
}

function cleanupPicture(origPicture) {
  var split = origPicture.format.toLowerCase().split('/');
  var newFormat = (split.length > 1) ? split[1] : split[0];
  if (newFormat === 'jpeg') newFormat = 'jpg';
  return { format : newFormat, data : origPicture.data };
}
                        
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

strtok.UINT24_BE = {
  len : 3,
  get : function(buf, off) {
    return (((buf[off] << 8) + buf[off + 1]) << 8) + buf[off + 2];
  }
};

strtok.BITSET = {
  len : 1,
  get : function(buf, off, bit) {
    return (buf[off] & (1 << bit)) !== 0;
  }
};

strtok.INT32SYNCSAFE = {
  len : 4,
  get : function (buf, off) {
    return buf[off + 3]   & 0x7f | 
         ((buf[off + 2]) << 7)   | 
         ((buf[off + 1]) << 14)  | 
         ((buf[off])     << 21);
  }
};