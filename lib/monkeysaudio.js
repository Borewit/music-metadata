'use strict'
var common = require('./common')
var strtok = require('strtok2')

module.exports = function (stream, callback, done) {
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
