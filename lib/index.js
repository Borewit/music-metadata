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

  var hasReadData = false
  istream.once('data', function (result) {
    hasReadData = true
    var parser = common.getParserForMediaType(headerTypes, result)
    parser(istream, function (type, tag, value) {
      if (value === null) return

      setCommonTags(metadata.common, type, tag, value)

      // Send native event, unless it's native name is the same as a common name
      if (!tagmap.common.hasOwnProperty(tag)) {
        emitter.emit(tag, value)
      }

      if (opts.native) {
        if (!metadata.hasOwnProperty(type)) {
          metadata[ type ] = {} // Register new native header type
        }

        if (tagmap.isNativeSingleton(type, tag)) {
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
    for (var _alias in metadata.common) {
      if (metadata.common.hasOwnProperty(_alias)) {
        emitter.emit(_alias, metadata.common[_alias])
      }
    }

    if (callback) {
      callback(exception, metadata)
    }
    return strtok.DONE
  }

  return emitter
}

function toIntOrZero (str) {
  var cleaned = parseInt(str, 10)
  return isNaN(cleaned) ? 0 : cleaned
}

/**
 * Process and set common tags
 * @param comTags Target metadata to wrote common tags to
 * @param type    Native type e.g.: 'm4a' | 'asf' | 'id3v1.1' | 'id3v2.4' | 'vorbis'
 * @param tag     Native tag
 * @param value   Native tag value
 */

function setCommonTags (comTags, type, tag, value) {

  // check if we need to do something special with native tags
  switch (type) {
    case 'vorbis':
      switch (tag) {
        case 'TRACKTOTAL':
        case 'TOTALTRACKS': // rare tag
          comTags.track.of = toIntOrZero(value)
          return

        case 'DISCTOTAL':
        case 'TOTALDISCS': // rare tag
          comTags.disk.of = toIntOrZero(value)
          return
      }
  }

  // Convert native tag event to common (aliased) event
  var alliases = tagmap.getCommonName(type, tag)

  if (alliases === undefined) {
    return // No common tag mapping found
  }

  alliases.forEach(function (alias) {

    // check if we need to do something special with common tag
    // if the event has been aliased then we need to clean it before
    // it is emitted to the user. e.g. genre (20) -> Electronic
    switch (alias) {
      case 'genre':
        value = common.parseGenre(value)
        break

      case 'picture':
        value = cleanupPicture(value)
        break

      case 'track':
      case 'disk':
        var of = comTags[alias].of // store of value, maybe maybe overwritten
        comTags[alias] = cleanupTrack(value)
        comTags[alias].of = Math.max(of, comTags[alias].of)
        return

      case 'date':
        // ToDo: be more strict on 'YYYY...'
        // if (/^\d{4}\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01])$/.test(value)) {
        comTags.year = value.substr(0, 4)
        break
    }

    if (tagmap.isSingleton(alias)) {
      comTags[alias] = value
    } else {
      if (comTags.hasOwnProperty(alias)) {
        comTags[alias].push(value)
      } else {
        // if we haven't previously seen this tag then
        // initialize it to an array, ready for values to be entered
        comTags[alias] = [value]
      }
    }
  })
  return
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
