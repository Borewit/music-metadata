'use strict'
var common = require('./common')
var strtok = require('strtok2')

module.exports = function (stream, callback, done) {
  var ApeDescriptor = {
    len: 44,

    get: function (buf, off) {
      return {
        ID: new strtok.StringType(4, 'ascii').get(buf, off),
        version: strtok.UINT32_LE.get(buf, off + 4) / 1000,
        descriptorBytes: strtok.UINT32_LE.get(buf, off + 8),
        headerDataBytes: strtok.UINT32_LE.get(buf, off + 12),
        APEFrameDataBytes: strtok.UINT32_LE.get(buf, off + 16),
        APEFrameDataBytesHigh: strtok.UINT32_LE.get(buf, off + 20),
        terminatingDataBytes: strtok.UINT32_LE.get(buf, off + 24),
        fileMD5: new strtok.BufferType(16).get(buf, 28)
      }
    }
  }

  // headerDataBytes = 24

  var ApeHeader = {
    len: 24,

    get: function (buf, off) {
      return {
        compressionLevel: strtok.UINT16_LE.get(buf, off),
        formatFlags: strtok.UINT16_LE.get(buf, off + 2),
        blocksPerFrame: strtok.UINT32_LE.get(buf, off + 4),
        finalFrameBlocks: strtok.UINT32_LE.get(buf, off + 8),
        totalFrames: strtok.UINT32_LE.get(buf, off + 12),
        bitsPerSample: strtok.UINT16_LE.get(buf, off + 16),
        channel: strtok.UINT16_LE.get(buf, off + 18),
        sampleRate: strtok.UINT32_LE.get(buf, off + 20)
      }
    }
  }

  strtok.parse(stream, function (v, cb) {
    if (v === undefined) {
      cb.state = 0
      return ApeDescriptor
    }

    switch (cb.state) {
      case 0:
        if (v.ID !== 'MAC ') {
          throw new Error('Expected MAC on beginning of file')
        }
        cb.state = 1
        return new strtok.BufferType(v.descriptorBytes - 44)

      case 1:
        cb.state = 2
        return ApeHeader

      case 2:
        callback('duration', calculateDuration(v))
        return -1
    }
  })

  return readMetadata(stream, callback, done)
}

/**
 * Calculate the media file duration
 * @param ah ApeHeader
 * @return {number} duration in seconds
 */
function calculateDuration (ah) {
  var duration = ah.totalFrames > 1 ? ah.blocksPerFrame * (ah.totalFrames - 1) : 0
  duration += ah.finalFrameBlocks
  return duration / ah.sampleRate
}

function readMetadata (stream, callback, done) {
  var bufs = []

  // TODO: need to be able to parse the tag if its at the start of the file
  stream.on('data', function (data) {
    bufs.push(data)
  })

  common.streamOnRealEnd(stream, function () {
    var buffer = Buffer.concat(bufs)
    var offset = buffer.length - 32

    if (buffer.toString('utf8', offset, offset += 8) !== 'APETAGEX') {
      done(new Error("expected APE header but wasn't found"))
    }

    var footer = {
      version: strtok.UINT32_LE.get(buffer, offset, offset + 4),
      size: strtok.UINT32_LE.get(buffer, offset + 4, offset + 8),
      count: strtok.UINT32_LE.get(buffer, offset + 8, offset + 12)
    }

    // go 'back' to where the 'tags' start
    offset = buffer.length - footer.size

    for (var i = 0; i < footer.count; i++) {
      var size = strtok.UINT32_LE.get(buffer, offset, offset += 4)
      var flags = strtok.UINT32_LE.get(buffer, offset, offset += 4)
      var kind = (flags & 6) >> 1

      var zero = common.findZero(buffer, offset, buffer.length)
      var key = buffer.toString('ascii', offset, zero)
      offset = zero + 1

      if (kind === 0) { // utf-8 textstring
        var value = buffer.toString('utf8', offset, offset += size)
        var values = value.split(/\x00/g)

        /*jshint loopfunc:true */
        values.forEach(function (val) {
          callback(key, val)
        })
      } else if (kind === 1) { // binary (probably artwork)
        if (key === 'Cover Art (Front)' || key === 'Cover Art (Back)') {
          var picData = buffer.slice(offset, offset + size)

          var off = 0
          zero = common.findZero(picData, off, picData.length)
          var description = picData.toString('utf8', off, zero)
          off = zero + 1

          var picture = {
            description: description,
            data: new Buffer(picData.slice(off))
          }

          offset += size
          callback(key, picture)
        }
      }
    }
    return done()
  })
}
