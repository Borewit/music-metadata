/* jshint maxlen: 300 */
'use strict'
import * as events from 'events'
import * as fs from 'fs'
import * as strtok from 'strtok2'
import * as through from 'through'
import common from './common'
import {IStreamParser} from './parser'
import TagMap from './tagmap'
import {HeaderType} from './tagmap'
import EventEmitter = NodeJS.EventEmitter

export interface IPicture {
  format: string,
  data: Uint8Array
}

export interface ICommonTagsResult {
  track: { no?: number, of?: number },
  disk: { no?: number, of?: number },
  year?: string,
  title?: string,
  artist?: string[]
  albumartist: string[]
  album?: string,
  date?: string,
  originaldate?: string,
  originalyear?: string,
  comment?: string,
  genre?: string[]
  picture?: IPicture[]
  composer?: string[]
  lyrics?: string[],
  albumsort?: string,
  titlesort?: string,
  work?: string,
  artistsort?: string[],
  albumartistsort?: string[],
  composersort?: string[],
  lyricist?: string[],
  writer?: string[],
  conductor?: string[],
  remixer?: string[],
  arranger?: string[],
  engineer?: string[],
  producer?: string[],
  djmixer?: string[],
  mixer?: string[],
  label?: string[],
  grouping?: string[],
  subtitle?: string[],
  discsubtitle?: string[],
  totaltracks?: string,
  totaldiscs?: string,
  compilation?: string,
  _rating?: string,
  bpm?: string,
  mood?: string,
  media?: string,
  catalognumber?: string[],
  show?: string,
  showsort?: string,
  podcast?: string,
  podcasturl?: string,
  releasestatus?: string,
  releasetype?: string[],
  releasecountry?: string,
  script?: string,
  language?: string,
  copyright?: string,
  license?: string,
  encodedby?: string,
  encodersettings?: string,
  gapless?: string,
  barcode?: string, // ToDo: multiple??
  isrc?: string,
  asin?: string,
  musicbrainz_recordingid?: string,
  musicbrainz_trackid?: string,
  musicbrainz_albumid?: string,
  musicbrainz_artistid?: string[],
  musicbrainz_albumartistid?: string[],
  musicbrainz_releasegroupid?: string,
  musicbrainz_workid?: string,
  musicbrainz_trmid?: string,
  musicbrainz_discid?: string,
  acoustid_id?: string,
  acoustid_fingerprint?: string,
  musicip_puid?: string,
  musicip_fingerprint?: string,
  website?: string,
  'performer:instrument'?: string[],
}

interface IResult {
  common: ICommonTagsResult,
  format: {
    type?: HeaderType, // ToDo: make mandatory
    duration?: number,
    bitrate?
  }
}

interface IOptions {
  path?: string,
  fileSize?: string,
  native?: boolean,
  duration?: boolean
}

export class MusicMetadataParser {

  public static getInstance(): MusicMetadataParser {
    return new MusicMetadataParser()
  }

  private static headerTypes = [
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

  private static toIntOrZero(str: string): number {
    let cleaned = parseInt(str, 10)
    return isNaN(cleaned) ? 0 : cleaned
  }

  private tagMap = new TagMap()

  /**
   * @param stream
   * @param opts
   *   .filesize=true  Return filesize
   *   .native=true    Will return original header in result
   * @param callback
   * @returns {EventEmitter}
   */
  public parse(stream, opts: IOptions, callback): EventEmitter {
    if (typeof opts === 'function') {
      callback = opts
      opts = {}
    }

    let emitter = new events.EventEmitter()

    let fsize = (cb) => {
      if (opts.fileSize) {
        process.nextTick( () => {
          cb(opts.fileSize)
        })
      } else if (stream.hasOwnProperty('path')) {
        fs.stat(stream.path, (err, stats) => {
          if (err) throw err
          cb(stats.size)
        })
      } else if (stream.hasOwnProperty('fileSize')) {
        stream.fileSize(cb)
      } else if (opts.duration) {
        emitter.emit('done', new Error('for non file streams, specify the size of the stream with a fileSize option'))
      }
    }

    // pipe to an internal stream so we aren't messing
    // with the stream passed to us by our users
    let istream = stream.pipe(through(null, null, {autoDestroy: false}))

    /**
     * Default present metadata properties
     */
    let metadata: IResult = {
      common: {
        albumartist: [],
        track: {no: 0, of: 0},
        disk: {no: 0, of: 0}
      },
      format: {
        duration: 0
      }
    }

    let self = this

    let hasReadData = false
    istream.once('data', (result) => {
      hasReadData = true
      let streamParser: IStreamParser = common.getParserForMediaType(MusicMetadataParser.headerTypes, result)
      streamParser.parse(istream, (headerType, tag, value) => {
        if (value === null) return

        if (headerType === 'format') {
          metadata.format[tag] = value
        } else {
          this.setCommonTags(metadata.common, <HeaderType> headerType, tag, value)
        }

        // Send native event, unless it's native name is the same as a common name
        if (!TagMap.isCommonTag(tag)) {
          emitter.emit(tag, value)
        }

        if (opts.native) {
          if (!metadata.hasOwnProperty(headerType)) {
            metadata[headerType] = {} // Register new native header headerType
          }

          if (this.tagMap.isNativeSingleton(headerType, tag)) {
            metadata[headerType][tag] = value
          } else {
            if (metadata[headerType].hasOwnProperty(tag)) {
              metadata[headerType][tag].push(value)
            } else {
              metadata[headerType][tag] = [value]
            }
          }
        }
      }, done, opts.duration, fsize)
      // re-emitting the first data chunk so the
      // parser picks the stream up from the start
      istream.emit('data', result)
    })

    istream.on('end', () => {
      if (!hasReadData) {
        done(new Error('Could not read any data from this stream'))
      }
    })

    istream.on('close', onClose)

    function onClose() {
      done(new Error('Unexpected end of stream'))
    }

    function done(exception) {
      istream.removeListener('close', onClose)

      // We only emit aliased events once the 'done' event has been raised,
      // this is because an alias like 'artist' could have values split
      // over many data chunks.
      for (let _alias in metadata.common) {
        if ( metadata.common.hasOwnProperty(_alias) ) {
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

  /**
   * Process and set common tags
   * @param comTags Target metadata to wrote common tags to
   * @param type    Native headerType e.g.: 'm4a' | 'asf' | 'id3v1.1' | 'id3v2.4' | 'vorbis'
   * @param tag     Native tag
   * @param value   Native tag value
   */
  private setCommonTags(comTags, type: HeaderType, tag: string, value: any) {

    switch (type) {
      case 'vorbis':
        switch (tag) {

          case 'TRACKTOTAL':
          case 'TOTALTRACKS': // rare tag
            comTags.track.of = MusicMetadataParser.toIntOrZero(value)
            return

          case 'DISCTOTAL':
          case 'TOTALDISCS': // rare tag
            comTags.disk.of = MusicMetadataParser.toIntOrZero(value)
            return
          default:
        }
        break

      case 'id3v2.3':
      case 'id3v2.4':
        switch (tag) {

          case 'TXXX':
            tag += ':' + value.description
            value = value.text
            break

          case 'UFID': // decode MusicBrainz Recording Id
            if (value.owner_identifier === 'http://musicbrainz.org') {
              tag += ':' + value.owner_identifier
              value = common.decodeString(value.identifier, 'iso-8859-1')
            }
            break

          default:
            // nothing to do
        }
        break
      default:
        // nothing to do
    }

    // Convert native tag event to common (aliased) event
    let alias = this.tagMap.getCommonName(type, tag)

    if (alias) {
      // Common tag (alias) found

      // check if we need to do something special with common tag
      // if the event has been aliased then we need to clean it before
      // it is emitted to the user. e.g. genre (20) -> Electronic
      switch (alias) {
        case 'genre':
          value = common.parseGenre(value)
          break

        case 'picture':
          value = this.cleanupPicture(value)
          break

        case 'track':
        case 'disk':
          let of = comTags[alias].of // store of value, maybe maybe overwritten
          comTags[alias] = this.cleanupTrack(value)
          comTags[alias].of = Math.max(of, comTags[alias].of)
          return

        case 'date':
          // ToDo: be more strict on 'YYYY...'
          // if (/^\d{4}\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01])$/.test(value)) {
          comTags.year = value.substr(0, 4)
          break

        default:
          // nothing to do
      }

      if (TagMap.isSingleton(alias)) {
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
    }
  }

  // TODO: a string of 1of1 would fail to be converted
  // converts 1/10 to no : 1, of : 10
  // or 1 to no : 1, of : 0
  private cleanupTrack(origVal: number | string) {
    let split = origVal.toString().split('/')
    return {
      no: parseInt(split[0], 10) || 0,
      of: parseInt(split[1], 10) || 0
    }
  }

  private cleanupPicture(picture) {
    let newFormat
    if (picture.format) {
      let split = picture.format.toLowerCase().split('/')
      newFormat = (split.length > 1) ? split[1] : split[0]
      if (newFormat === 'jpeg') newFormat = 'jpg'
    } else {
      newFormat = 'jpg'
    }
    return {format: newFormat, data: picture.data}
  }
}

/**
 * @param stream
 * @param opts
 *   .filesize=true  Return filesize
 *   .native=true    Will return original header in result
 * @param callback
 * @returns {*|EventEmitter}
 */

let parser = MusicMetadataParser.getInstance()

module.exports = (stream, opts: IOptions, callback) => {
  return MusicMetadataParser.getInstance().parse(stream, opts, callback)
}
