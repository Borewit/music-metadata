var util = require('util');
var events = require('events');
var common = require('./common');
var strtok = require('strtok2');

var MusicMetadata = module.exports = function (stream) {
  events.EventEmitter.call(this);
  this.stream = stream;
  this.parse();
};

util.inherits(MusicMetadata, events.EventEmitter);

MusicMetadata.prototype.parse = function () {
  this.metadata = {
    title: '',
    artist: [],
    albumartist: [],
    album: '',
    year: "",
    track: { no: 0, of: 0 },
    genre: [],
    disk: { no: 0, of: 0 },
    picture: {}
  }

  this.aliased = {};

  var self = this;
  this.stream.once('data', function (result) {
    var tag = common.detectMediaType(result);
    require('./' + tag)(self.stream, self.readEvent.bind(self), done);
    // re-emitting the first data chunk so the
    // parser picks the stream up from the start
    self.stream.emit('data', result);
  });

  this.stream.on('close', onClose);

  function onClose () {
    done(new Error('Unexpected end of stream'));
  }

  function done (exception) {
    self.stream.removeListener('close', onClose);
    self.readEvent('done', exception);
    return strtok.DONE;
  }
};

MusicMetadata.prototype.readEvent = function (event, value) {
  // We only emit aliased events once the 'done' event has been raised,
  // this is because an alias like 'artist' could have values split
  // over many data chunks.
  if (event === 'done') {
    for (var alias in this.aliased) {
      if (this.aliased.hasOwnProperty(alias)) {
        var val;
        if (alias === 'title' || alias === 'album' || alias === 'year') {
          val = this.aliased[alias][0];
        } else {
          val = this.aliased[alias];
        }

        this.emit(alias, val);

        if (this.metadata.hasOwnProperty(alias)) {
          this.metadata[alias] = val;
        }
      }
    }

    // don't emit the metadata event if nothing
    // ever gets added to the metadata object
    if (Object.keys(this.aliased).length > 0) {
      this.emit('metadata', this.metadata);
    }

    this.emit('done', value);
    return;
  }

  // lookup alias
  var alias;
  for (var i = 0; i < MAPPINGS.length; i++) {
    for (var j = 0; j < MAPPINGS[i].length; j++) {
      var cur = MAPPINGS[i][j];
      if (cur.toUpperCase() === event.toUpperCase()) {
        alias = MAPPINGS[i][0];
        break;
      }
    }
  }

  // emit original event & value
  if (event !== alias) {
    this.emit(event, value);
  }
  if (value == null) return;

  // we need to do something special for these events
  if (event === 'TRACKTOTAL' || event === 'DISCTOTAL') {
    var evt;
    if (event === 'TRACKTOTAL') evt = 'track';
    if (event === 'DISCTOTAL') evt = 'disk';

    var cleaned = parseInt(value, 10);
    if (isNaN(cleaned)) cleaned = 0;
    if (!this.aliased.hasOwnProperty(evt)) {
      this.aliased[evt] = { no: 0, of: cleaned };
    } else {
      this.aliased[evt]['of'] = cleaned;
    }
  }

  // if the event has been aliased then we need to clean it before
  // it is emitted to the user. e.g. genre (20) -> Electronic
  if (alias) {
    var cleaned = value;
    if (alias === 'genre') cleaned = common.parseGenre(value);
    if (alias === 'picture') cleaned = cleanupPicture(value);

    if (alias === 'track' || alias === 'disk') {
      cleaned = cleanupTrack(value);

      if (this.aliased[alias]) {
        this.aliased[alias].no = cleaned.no;
        return;
      } else {
        this.aliased[alias] = cleaned;
        return;
      }
    }

    // many tagging libraries use forward slashes to separate artists etc
    // within a string, this code separates those strings into an array
    if (cleaned.constructor === String) {
      // limit to these three aliases, we don't want to be splitting anything else
      if (alias === 'artist' || alias === 'albumartist' || alias === 'genre') {
        cleaned = cleaned.split('/');
        if (cleaned.length === 1) cleaned = cleaned[0];
      }
    }

    // if we haven't previously seen this tag then
    // initialize it to an array, ready for values to be entered
    if (!this.aliased.hasOwnProperty(alias)) {
      this.aliased[alias] = [];
    }

    if (cleaned.constructor === Array) {
      this.aliased[alias] = cleaned;
    } else {
      this.aliased[alias].push(cleaned);
    }
  }
}

function cleanupArtist (origVal) {
  return origVal.split('/');
}

// TODO: a string of 1of1 would fail to be converted
// converts 1/10 to no : 1, of : 10
// or 1 to no : 1, of : 0
function cleanupTrack (origVal) {
  var split = origVal.toString().split('/');
  var number = parseInt(split[0], 10) || 0;
  var total = parseInt(split[1], 10) || 0;
  return { no: number, of: total }
}

function cleanupPicture (picture) {
  var newFormat;
  if (picture.format) {
    var split = picture.format.toLowerCase().split('/');
    newFormat = (split.length > 1) ? split[1] : split[0];
    if (newFormat === 'jpeg') newFormat = 'jpg';
  } else {
    newFormat = 'jpg';
  }
  return { format: newFormat, data: picture.data }
}

// mappings for common metadata types(id3v2.3, id3v2.2, id4, vorbis, APEv2)
var MAPPINGS = [
  ['title', 'TIT2', 'TT2', '©nam', 'TITLE', 'Title'],
  ['artist', 'TPE1', 'TP1', '©ART', 'ARTIST', 'Author'],
  ['albumartist', 'TPE2', 'TP2', 'aART', 'ALBUMARTIST', 'ENSEMBLE', 'WM/AlbumArtist'],
  ['album', 'TALB', 'TAL', '©alb', 'ALBUM', 'WM/AlbumTitle'],
  ['year', 'TDRC', 'TYER', 'TYE', '©day', 'DATE', 'Year', 'WM/Year'],
  ['comment', 'COMM', 'COM', '©cmt', 'COMMENT'],
  ['track', 'TRCK', 'TRK', 'trkn', 'TRACKNUMBER', 'Track', 'WM/TrackNumber'],
  ['disk', 'TPOS', 'TPA', 'disk', 'DISCNUMBER', 'Disk'],
  ['genre', 'TCON', 'TCO', '©gen', 'gnre', 'GENRE', 'WM/Genre'],
  ['picture', 'APIC', 'PIC', 'covr', 'METADATA_BLOCK_PICTURE',
    'Cover Art (Front)', 'Cover Art (Back)'],
  ['composer', 'TCOM', 'TCM', '©wrt', 'COMPOSER']
];
