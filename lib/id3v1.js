'use strict'
var common = require('./common')

module.exports = function (stream, callback, done) {
  var endData = null
  var type = 'id3v1.1'
  stream.on('data', function (data) {
    endData = data
  })
  common.streamOnRealEnd(stream, function () {
    var offset = endData.length - 128
    var header = endData.toString('ascii', offset, offset += 3)
    if (header !== 'TAG') {
      return done(new Error('Could not find metadata header'))
    }

    callback('format', 'tagType', type)

    var title = endData.toString('ascii', offset, offset += 30)
    callback(type, 'title', title.trim().replace(/\x00/g, ''))

    var artist = endData.toString('ascii', offset, offset += 30)
    callback(type, 'artist', artist.trim().replace(/\x00/g, ''))

    var album = endData.toString('ascii', offset, offset += 30)
    callback(type, 'album', album.trim().replace(/\x00/g, ''))

    var year = endData.toString('ascii', offset, offset += 4)
    callback(type, 'year', year.trim().replace(/\x00/g, ''))

    var comment = endData.toString('ascii', offset, offset += 28)
    callback(type, 'comment', comment.trim().replace(/\x00/g, ''))

    var track = endData[endData.length - 2]
    callback(type, 'track', track)

    if (endData[endData.length - 1] in common.GENRES) {
      var genre = common.GENRES[endData[endData.length - 1]]
      callback(type, 'genre', genre)
    }
    return done()
  })
}
