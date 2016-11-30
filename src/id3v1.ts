'use strict'
import common from './common'
import {IStreamParser, TagCallback} from './parser'

class Id3v1Parser implements IStreamParser {

  public static getInstance(): Id3v1Parser {
    return new Id3v1Parser()
  }

  public parse(stream, callback: TagCallback, done?, readDuration?, fileSize?) {

    let endData = null
    let type = 'id3v1.1'

    stream.on('data', (data) => {
      endData = data
    })
    common.streamOnRealEnd(stream, () => {
      let offset = endData.length - 128
      let header = endData.toString('ascii', offset, offset += 3)
      if (header !== 'TAG') {
        return done(new Error('Could not find metadata header'))
      }

      callback('format', 'headerType', type)

      let title = endData.toString('ascii', offset, offset += 30)
      callback(type, 'title', title.trim().replace(/\x00/g, ''))

      let artist = endData.toString('ascii', offset, offset += 30)
      callback(type, 'artist', artist.trim().replace(/\x00/g, ''))

      let album = endData.toString('ascii', offset, offset += 30)
      callback(type, 'album', album.trim().replace(/\x00/g, ''))

      let year = endData.toString('ascii', offset, offset += 4)
      callback(type, 'year', year.trim().replace(/\x00/g, ''))

      let comment = endData.toString('ascii', offset, offset += 28)
      callback(type, 'comment', comment.trim().replace(/\x00/g, ''))

      let track = endData[endData.length - 2]
      callback(type, 'track', track)

      if (endData[endData.length - 1] in common.GENRES) {
        let genre = common.GENRES[endData[endData.length - 1]]
        callback(type, 'genre', genre)
      }
      return done()
    })
  }
}

module.exports = Id3v1Parser.getInstance()
