'use strict'
var strtok = require('strtok2')
var common = require('./common')

module.exports = function (stream, callback, done, readDuration) {
  strtok.parse(stream, function (v, cb) {
    // the very first thing we expect to see is the first atom's length
    if (!v) {
      cb.metaAtomsTotalLength = 0
      cb.state = 0
      return strtok.UINT32_BE
    }

    switch (cb.state) {
      case -1: // skip
        cb.state = 0
        return strtok.UINT32_BE

      case 0: // atom length
        cb.atomLength = v
        cb.state++
        return new strtok.StringType(4, 'binary')

      case 1: // atom name
        cb.atomName = v

        // meta has 4 bytes padding at the start (skip)
        if (v === 'meta') {
          cb.state = -1
          return new strtok.IgnoreType(4)
        }

        if (readDuration) {
          if (v === 'mdhd') {
            cb.state = 3
            return new strtok.BufferType(cb.atomLength - 8)
          }
        }

        if (!~CONTAINER_ATOMS.indexOf(v)) {
          if (cb.atomContainer === 'ilst') {
            cb.state = 2
            return new strtok.BufferType(cb.atomLength - 8)
          }
          cb.state = -1
          return new strtok.IgnoreType(cb.atomLength - 8)
        }

        // dig into container atoms
        cb.atomContainer = v
        cb.atomContainerLength = cb.atomLength
        cb.state--
        return strtok.UINT32_BE

      case 2: // ilst atom
        cb.metaAtomsTotalLength += cb.atomLength
        var result = processMetaAtom(v, cb.atomName, cb.atomLength - 8)
        if (result.length > 0) {
          for (var i = 0; i < result.length; i++) {
            callback(cb.atomName, result[i])
          }
        }

        // we can stop processing atoms once we get to the end of the ilst atom
        if (cb.metaAtomsTotalLength >= cb.atomContainerLength - 8) {
          return done()
        }

        cb.state = 0
        return strtok.UINT32_BE

      case 3: // mdhd atom
        // TODO: support version 1
        var sampleRate = v.readUInt32BE(12)
        var duration = v.readUInt32BE(16)
        callback('duration', duration / sampleRate)
        cb.state = 0
        return strtok.UINT32_BE
    }

    // if we ever get this this point something bad has happened
    return done(new Error('error parsing'))
  })
}

function processMetaAtom (data, atomName, atomLength) {
  var result = []
  var offset = 0

  // ignore proprietary iTunes atoms (for now)
  if (atomName === '----') return result

  while (offset < atomLength) {
    var length = strtok.UINT32_BE.get(data, offset)
    var type = TYPES[strtok.UINT32_BE.get(data, offset + 8)]

    var content = processMetaDataAtom(data.slice(offset + 12, offset + length), type, atomName)

    result.push(content)
    offset += length
  }

  return result

  function processMetaDataAtom (data, type, atomName) {
    switch (type) {
      case 'text':
        return data.toString('utf8', 4)

      case 'uint8':
        if (atomName === 'gnre') {
          var genreInt = strtok.UINT8.get(data, 5)
          return common.GENRES[genreInt - 1]
        }
        if (atomName === 'trkn' || atomName === 'disk') {
          return data[7] + '/' + data[9]
        }

        return strtok.UINT8.get(data, 4)

      case 'jpeg':
      case 'png':
        return {
          format: 'image/' + type,
          data: new Buffer(data.slice(4))
        }
    }
  }
}

var TYPES = {
  '0': 'uint8',
  '1': 'text',
  '13': 'jpeg',
  '14': 'png',
  '21': 'uint8'
}

var CONTAINER_ATOMS = ['moov', 'udta', 'meta', 'ilst', 'trak', 'mdia']
