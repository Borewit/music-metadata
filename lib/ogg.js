'use strict'
var events = require('events')
var strtok = require('strtok2')
var common = require('./common')
var sum = require('sum-component')

module.exports = function (stream, callback, done, readDuration) {
  var innerStream = new events.EventEmitter()

  var pageLength = 0
  var sampleRate = 0
  var header
  var stop = false

  stream.on('end', function () {
    if (readDuration) {
      callback('duration', header.pcm_sample_pos / sampleRate)
      done()
    }
  })

  // top level parser that handles the parsing of pages
  strtok.parse(stream, function (v, cb) {
    if (!v) {
      cb.state = 0
      return new strtok.BufferType(27)
    }

    if (stop) {
      return done()
    }

    switch (cb.state) {
      case 0: // header
        header = {
          type: v.toString('ascii', 0, 4),
          version: v[4],
          packet_flag: v[5],
          pcm_sample_pos: (v.readUInt32LE(10) << 32) + v.readUInt32LE(6),
          stream_serial_num: strtok.UINT32_LE.get(v, 14),
          page_number: strtok.UINT32_LE.get(v, 18),
          check_sum: strtok.UINT32_LE.get(v, 22),
          segments: v[26]
        }
        if (header.type !== 'OggS') {
          return done(new Error('expected ogg header but was not found'))
        }
        cb.pageNumber = header.page_number
        cb.state++
        return new strtok.BufferType(header.segments)

      case 1: // segments
        pageLength = sum(v)
        cb.state++
        return new strtok.BufferType(pageLength)

      case 2: // page data
        innerStream.emit('data', new Buffer(v))
        cb.state = 0
        return new strtok.BufferType(27)
    }
  })

  // Second level parser that handles the parsing of metadata.
  // The top level parser emits data that this parser should
  // handle.
  strtok.parse(innerStream, function (v, cb) {
    if (!v) {
      cb.commentsRead = 0
      cb.state = 0
      return new strtok.BufferType(7)
    }

    switch (cb.state) {
      case 0: // type
        if (v.toString() === '\x01vorbis') {
          cb.state = 6
          return new strtok.BufferType(23)
        } else if (v.toString() === '\x03vorbis') {
          cb.state++
          return strtok.UINT32_LE
        } else {
          return done(new Error('expected vorbis header but found something else'))
        }
      break

      case 1: // vendor length
        cb.state++
        return new strtok.BufferType(v)

      case 2: // vendor string
        cb.state++
        return new strtok.BufferType(4)

      case 3: // user comment list length
        cb.commentsLength = v.readUInt32LE(0)
        // no metadata, stop parsing
        if (cb.commentsLength === 0) return strtok.DONE
        cb.state++
        return strtok.UINT32_LE

      case 4: // comment length
        cb.state++
        return new strtok.BufferType(v)

      case 5: // comment
        cb.commentsRead++
        v = v.toString()
        var idx = v.indexOf('=')
        var key = v.slice(0, idx).toUpperCase()
        var value = v.slice(idx + 1)

        if (key === 'METADATA_BLOCK_PICTURE') {
          value = common.readVorbisPicture(new Buffer(value, 'base64'))
        }

        callback(key, value)

        if (cb.commentsRead === cb.commentsLength) {
          // if we don't want to read the duration
          // then tell the parent stream to stop
          stop = !readDuration
          return strtok.DONE
        }

        cb.state-- // back to comment length
        return strtok.UINT32_LE

      case 6: // vorbis info
        var info = {
          'version': v.readUInt32LE(0),
          'channel_mode': v.readUInt8(4),
          'sample_rate': v.readUInt32LE(5),
          'bitrate_nominal': v.readUInt32LE(13)
        }
        sampleRate = info.sample_rate
        cb.state = 0
        return new strtok.BufferType(7)
    }
  })
}
