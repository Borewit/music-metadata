'use strict'
var events = require('events')
var common = require('./common')
var strtok = require('strtok2')
var through = require('through')
var fs = require('fs')

module.exports = function (stream, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts
    opts = {}
  }

  var emitter = new events.EventEmitter()

  var fsize = function (cb) {
    if (opts.fileSize) {
      process.nextTick(function () {
        cb(opts.fileSize)
      })
    } else if (stream.hasOwnProperty('path')) {
      fs.stat(stream.path, function (err, stats) {
        if (err) throw err
        cb(stats.size)
      })
    } else if (stream.hasOwnProperty('fileSize')) {
      stream.fileSize(cb)
    } else if (opts.duration) {
      emitter.emit(
        'done',
        new Error('for non file streams, specify the size of the stream with a fileSize option'))
    }
  }

  // pipe to an internal stream so we aren't messing
  // with the stream passed to us by our users
  var istream = stream.pipe(through(null, null, {autoDestroy: false}))

  var metadata = {
    title: '',
    artist: [],
    albumartist: [],
    album: '',
    year: '',
    track: { no: 0, of: 0 },
    genre: [],
    disk: { no: 0, of: 0 },
    picture: [],
    duration: 0
  }

  var aliased = {}

  var hasReadData = false
  istream.once('data', function (result) {
    hasReadData = true
    var parser = common.getParserForMediaType(headerTypes, result)
    parser(istream, function (event, value) {
      if (value === null) return
      var alias = lookupAlias(event)
      // emit original event & value
      if (event !== alias) {
        emitter.emit(event, value)
      }
      buildAliases(alias, event, value, aliased)
    }, done, opts.hasOwnProperty('duration'), fsize)
    // re-emitting the first data chunk so the
    // parser picks the stream up from the start
    istream.emit('data', result)
  })

  istream.on('end', function () {
    if (!hasReadData) {
      done(new Error('Could not read any data from this stream'))
    }
  })

  istream.on('close', onClose)

  function onClose () {
    done(new Error('Unexpected end of stream'))
  }

  function done (exception) {
    istream.removeListener('close', onClose)

    // We only emit aliased events once the 'done' event has been raised,
    // this is because an alias like 'artist' could have values split
    // over many data chunks.
    for (var _alias in aliased) {
      if (aliased.hasOwnProperty(_alias)) {
        var val
        if (_alias === 'title' || _alias === 'album' ||
          _alias === 'year' || _alias === 'duration') {
          val = aliased[_alias][0]
        } else {
          val = aliased[_alias]
        }

        emitter.emit(_alias, val)

        if (metadata.hasOwnProperty(_alias)) {
          metadata[_alias] = val
        }
      }
    }

    if (callback) {
      callback(exception, metadata)
    }
    return strtok.DONE
  }

  return emitter
}

function buildAliases (alias, event, value, aliased) {
  // we need to do something special for these events
  var cleaned
  if (event === 'TRACKTOTAL' || event === 'DISCTOTAL') {
    var evt
    if (event === 'TRACKTOTAL') evt = 'track'
    if (event === 'DISCTOTAL') evt = 'disk'

    cleaned = parseInt(value, 10)
    if (isNaN(cleaned)) cleaned = 0
    if (!aliased.hasOwnProperty(evt)) {
      aliased[evt] = { no: 0, of: cleaned }
    } else {
      aliased[evt].of = cleaned
    }
  }

  // if the event has been aliased then we need to clean it before
  // it is emitted to the user. e.g. genre (20) -> Electronic
  if (alias) {
    cleaned = value
    if (alias === 'genre') cleaned = common.parseGenre(value)
    if (alias === 'picture') cleaned = cleanupPicture(value)

    if (alias === 'track' || alias === 'disk') {
      cleaned = cleanupTrack(value)

      if (aliased[alias]) {
        aliased[alias].no = cleaned.no
        return
      } else {
        aliased[alias] = cleaned
        return
      }
    }

    // if we haven't previously seen this tag then
    // initialize it to an array, ready for values to be entered
    if (!aliased.hasOwnProperty(alias)) {
      aliased[alias] = []
    }

    if (cleaned.constructor === Array) {
      aliased[alias] = cleaned
    } else {
      aliased[alias].push(cleaned)
    }
  }
}

function lookupAlias (event) {
  // mappings for common metadata types(id3v2.3, id3v2.2, id4, vorbis, APEv2)
  var mappings = [
    ['title', 'TIT2', 'TT2', '©nam', 'TITLE', 'Title'],
    ['artist', 'TPE1', 'TP1', '©ART', 'ARTIST', 'Author'],
    ['albumartist', 'TPE2', 'TP2', 'aART', 'ALBUMARTIST', 'ENSEMBLE', 'WM/AlbumArtist'],
    ['album', 'TALB', 'TAL', '©alb', 'ALBUM', 'WM/AlbumTitle'],
    ['year', 'TDRC', 'TYER', 'TYE', '©day', 'DATE', 'Year', 'WM/Year'],
    ['comment', 'COMM', 'COM', '©cmt', 'COMMENT'],
    ['track', 'TRCK', 'TRK', 'trkn', 'TRACKNUMBER', 'Track', 'WM/TrackNumber'],
    ['disk', 'TPOS', 'TPA', 'disk', 'DISCNUMBER', 'Disk'],
    ['genre', 'TCON', 'TCO', '©gen', 'gnre', 'GENRE', 'WM/Genre'],
    ['picture', 'APIC', 'PIC', 'covr', 'METADATA_BLOCK_PICTURE', 'Cover Art (Front)',
    'Cover Art (Back)'],
    ['composer', 'TCOM', 'TCM', '©wrt', 'COMPOSER'],
    ['duration'],
    ['lyrics', 'SYLT']
  ]

  return mappings.reduce(function (a, b) {
    if (a !== undefined) return a

    var hasAlias = b.map(function (val) {
      return val.toUpperCase()
    }).indexOf(event.toUpperCase())

    if (hasAlias > -1) {
      return b[0]
    }
  }, undefined)
}

// TODO: a string of 1of1 would fail to be converted
// converts 1/10 to no : 1, of : 10
// or 1 to no : 1, of : 0
function cleanupTrack (origVal) {
  var split = origVal.toString().split('/')
  return {
    no: parseInt(split[0], 10) || 0,
    of: parseInt(split[1], 10) || 0
  }
}

function cleanupPicture (picture) {
  var newFormat
  if (picture.format) {
    var split = picture.format.toLowerCase().split('/')
    newFormat = (split.length > 1) ? split[1] : split[0]
    if (newFormat === 'jpeg') newFormat = 'jpg'
  } else {
    newFormat = 'jpg'
  }
  return { format: newFormat, data: picture.data }
}

var headerTypes = [
  {
    buf: common.asfGuidBuf,
    tag: require('./asf')
  },
  {
    buf: new Buffer('ID3'),
    tag: require('./id3v2')
  },
  {
    buf: new Buffer('ftypM4A'),
    tag: require('./id4'),
    offset: 4
  },
  {
    buf: new Buffer('ftypmp42'),
    tag: require('./id4'),
    offset: 4
  },
  {
    buf: new Buffer('OggS'),
    tag: require('./ogg')
  },
  {
    buf: new Buffer('fLaC'),
    tag: require('./flac')
  },
  {
    buf: new Buffer('MAC'),
    tag: require('./monkeysaudio')
  }
]
