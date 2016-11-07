/* jshint maxlen: 300 */
'use strict'
var events = require('events')
var common = require('./common')
var strtok = require('strtok2')
var through = require('through')
var fs = require('fs')
var tagmap = require('./tagmap')

/**
 * @param stream
 * @param opts
 *   .filesize=true  Return filesize
 *   .native=true    Will return original header in result
 * @param callback
 * @returns {*|EventEmitter}
 */
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
  var istream = stream.pipe(through(null, null, { autoDestroy: false }))

  /**
   * Default present metadata properties
   */
  var metadata = {
    common: {
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
  }
  /**
   * Find out if native tag can be safely flatten is a singleton
   * @param the aliases found for the native tag
   * @returns {boolean} true if it can be stored as a singleton
   */
  function isSingleton (aliases) {
    if (aliases !== undefined) {
      for (var i = 0; i < aliases.length; ++i) {
        var info = tagmap.common.hasOwnProperty(aliases[i])
        if (info !== undefined) {
          if (!info.singleton) {
            return false
          }
        } else {
          throw new Error('Common type not registered: ' + aliases[i])
        }
      }
      return true
    }
    return false
  }

  var aliased = {}

  var hasReadData = false
  istream.once('data', function (result) {
    hasReadData = true
    var parser = common.getParserForMediaType(headerTypes, result)
    parser(istream, function (type, tag, value) {
      if (value === null) return

      var aliases = tagmap.getCommonName(type, tag)
      // Convert native tag event to common (aliased) event
      if (aliases !== undefined) {
        if (aliases.indexOf(tag) === -1) {
          // emit original event & value
          emitter.emit(tag, value)
        }
        aliases.forEach(function (alias) {
          // emit common/alias event & value
          buildAliases(alias, tag, value, aliased)
        })
      } else {
        // emit original event & value
        emitter.emit(tag, value)
      }

      if (opts.native) {
        if (!metadata.hasOwnProperty(type)) {
          metadata[ type ] = {} // Register new native header type
        }

        if (isSingleton(aliases)) {
          metadata[type][tag] = value
        } else {
          if (metadata[type].hasOwnProperty(tag)) {
            metadata[type][tag].push(value)
          } else {
            metadata[type][tag] = [value]
          }
        }
      }
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
        // Can we assume common tag '_alias' is a singleton?
        var isSingleton = tagmap.isSingleton(_alias)
        if (isSingleton && aliased[ _alias ].length > 1) {
          console.log('Warning: multiple entries for singleton-tag: ' + _alias)
        }

        // Check if _alias is a singleton and if so store a singleton
        var val = isSingleton ? aliased[_alias][0] : aliased[_alias]

        if (isSingleton && _alias === 'date' && !metadata.hasOwnProperty('year')) {
          metadata.common.year = val.substr(0, 4)
          emitter.emit('year', metadata.common.year)
        }

        emitter.emit(_alias, val)

        metadata.common[ _alias ] = val
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
  if (event === 'TRACKTOTAL' || event === 'TOTALTRACKS' ||
    event === 'DISCTOTAL' || events === 'TOTALDISCS') {
    var evt
    if (event === 'TRACKTOTAL' || event === 'TOTALTRACKS') evt = 'track'
    if (event === 'DISCTOTAL' || event === 'TOTALDISCS') evt = 'disk'

    cleaned = parseInt(value, 10)
    if (isNaN(cleaned)) cleaned = 0
    if (!aliased.hasOwnProperty(evt)) {
      aliased[ evt ] = { no: 0, of: cleaned }
    } else {
      aliased[ evt ].of = cleaned
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

      if (aliased[ alias ]) {
        aliased[ alias ].no = cleaned.no
        return
      } else {
        aliased[ alias ] = cleaned
        return
      }
    }

    // if we haven't previously seen this tag then
    // initialize it to an array, ready for values to be entered
    if (!aliased.hasOwnProperty(alias)) {
      aliased[ alias ] = []
    }

    if (cleaned.constructor === Array) {
      aliased[ alias ] = cleaned
    } else {
      aliased[ alias ].push(cleaned)
    }
  }
}

// TODO: a string of 1of1 would fail to be converted
// converts 1/10 to no : 1, of : 10
// or 1 to no : 1, of : 0
function cleanupTrack (origVal) {
  var split = origVal.toString().split('/')
  return {
    no: parseInt(split[ 0 ], 10) || 0,
    of: parseInt(split[ 1 ], 10) || 0
  }
}

function cleanupPicture (picture) {
  var newFormat
  if (picture.format) {
    var split = picture.format.toLowerCase().split('/')
    newFormat = (split.length > 1) ? split[ 1 ] : split[ 0 ]
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
