'use strict'
import * as events from 'events'
import * as strtok from 'strtok2'
import common from './common'
import vorbis from './vorbis'
import ReadableStream = NodeJS.ReadableStream
import {IStreamParser, TagCallback} from './parser'

interface IFormatInfo  {
  version: number,
  channelMode: number,
  sampleRate: number,
  bitrateMax: number,
  bitrateNominal: number,
  bitrateMin: number
}

enum State {
  header = 0,
  segments = 1,
  pageData = 2
}

enum MetaState {
  type = 0,
  vendorLength = 1,
  vendorString = 2,
  userCommentListLength = 3,
  commentLength = 4,
  comment = 5,
  vorbisInfo = 6
}

class OggParser implements IStreamParser {

  public static getInstance(): OggParser {
    return new OggParser()
  }

  private static headerType = 'vorbis'

  public parse(stream, callback, done, readDuration, fileSize) {
    let innerStream = new events.EventEmitter()

    let pageLength = 0
    let formatInfo: IFormatInfo
    let header
    let stop = false

    stream.on('end', () => {
      callback('format', 'headerType', OggParser.headerType)
      callback('format', 'sampleRate', formatInfo.sampleRate)
      callback('format', 'bitrate', formatInfo.bitrateNominal)
      callback('format', 'numberOfChannels', formatInfo.channelMode)
      if (readDuration) {
        callback('format', 'duration', header.pcm_sample_pos / formatInfo.sampleRate)
        done()
      }
    })

    // top level parser that handles the parsing of pages
    strtok.parse(stream, (v, cb) => {
      if (!v) {
        cb.state = State.header
        return new strtok.BufferType(27)
      }

      if (stop) {
        return done()
      }

      switch (cb.state) {
        case State.header: // header
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

        case State.segments: // segments
          pageLength = common.sum(v)
          cb.state++
          return new strtok.BufferType(pageLength)

        case State.pageData: // page data
          innerStream.emit('data', new Buffer(v))
          cb.state = 0
          return new strtok.BufferType(27)

        default:
          done(new Error('Illegal state'))
      }
    })

    // Second level parser that handles the parsing of metadata.
    // The top level parser emits data that this parser should
    // handle.
    strtok.parse(innerStream, (v, cb) => {
      if (!v) {
        cb.commentsRead = 0
        cb.state = MetaState.type
        return new strtok.BufferType(7)
      }

      switch (cb.state) {
        case MetaState.type: // type
          if (v.toString() === '\x01vorbis') {
            cb.state = MetaState.vorbisInfo
            return new strtok.BufferType(23)
          } else if (v.toString() === '\x03vorbis') {
            cb.state++
            return strtok.UINT32_LE
          } else {
            return done(new Error('expected vorbis header but found something else'))
          }

        case MetaState.vendorLength: // vendor length
          cb.state++
          return new strtok.BufferType(v)

        case MetaState.vendorString: // vendor string
          cb.state++
          return new strtok.BufferType(4)

        case MetaState.userCommentListLength: // user comment list length
          cb.commentsLength = v.readUInt32LE(0)
          // no metadata, stop parsing
          if (cb.commentsLength === 0) return strtok.DONE
          cb.state++
          return strtok.UINT32_LE

        case MetaState.commentLength: // comment length
          cb.state++
          return new strtok.BufferType(v)

        case MetaState.comment: // comment
          cb.commentsRead++
          v = v.toString()
          let idx = v.indexOf('=')
          let key = v.slice(0, idx).toUpperCase()
          let value = v.slice(idx + 1)

          if (key === 'METADATA_BLOCK_PICTURE') {
            value = vorbis.readPicture(new Buffer(value, 'base64'))
          }

          callback(OggParser.headerType, key, value)

          if (cb.commentsRead === cb.commentsLength) {
            // if we don't want to read the duration
            // then tell the parent stream to stop
            stop = !readDuration
            return strtok.DONE
          }

          cb.state-- // back to comment length
          return strtok.UINT32_LE

        case MetaState.vorbisInfo: // vorbis info
          formatInfo = {
            version: v.readUInt32LE(0),
            channelMode: v.readUInt8(4),
            sampleRate: v.readUInt32LE(5),
            bitrateMax: v.readUInt32LE(9),
            bitrateNominal: v.readUInt32LE(13),
            bitrateMin: v.readUInt32LE(17)
          }
          cb.state = MetaState.type
          return new strtok.BufferType(7)

        default:
          done(new Error('Illegal metadata-state: ' + cb.state))
      }
    })
  }
}

module.exports = OggParser.getInstance()
