/* jshint maxlen: 300 */
'use strict';

import * as fs from 'fs-extra';
import common from './common';

import TagMap from './tagmap';
import {HeaderType} from './tagmap';
import EventEmitter = NodeJS.EventEmitter;
import {FileParser} from "./FileParser";

export interface IPicture {
  format: string,
  data: Uint8Array;
}

export interface ICommonTagsResult {
  track: { no: number, of: number },
  disk: { no: number, of: number },
  year?: number,
  title?: string,
  artist?: string, // ToDo: string[] is only used internal
  artists?: string[],
  albumartist?: string,
  album?: string,
  date?: string,
  originaldate?: string,
  originalyear?: number,
  comment?: string,
  genre?: string[];
  picture?: IPicture[];
  composer?: string[];
  lyrics?: string[],
  albumsort?: string,
  titlesort?: string,
  work?: string,
  artistsort?: string,
  albumartistsort?: string,
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
  label?: string,
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
  catalognumber?: string,
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
  barcode?: number, // ToDo: multiple??
  // International Standard Recording Code
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
  averageLevel?: number,
  peakLevel?: number;
}

export interface IFormat {

  dataformat?: string, // ToDo: make mandatory

  type?: HeaderType, // ToDo: make mandatory

  /**
   * Duration in seconds
   */
  duration?: number,

  /**
   * Number bits per second of encoded audio file
   */
  bitrate?: number,

  /**
   * Sampling rate in Samples per second (S/s)
   */
  sampleRate?: number,

  /**
   * Audio bit depth
   */
  bitsPerSample?: number,

  /**
   * Encoder name, e.g.:
   */
  encoder?: string,

  /**
   * Codec profile
   */
  codecProfile?: string,

  lossless?: boolean,

  /**
   * Number of audio channels
   */
  numberOfChannels?: number,
}

export interface IAudioMetadata {
  common: ICommonTagsResult,
  format: IFormat,
  native: {id: string, value: any}[]
}

export type ICallbackType = (error?: Error, metadata?: IAudioMetadata) => void;

export interface IOptions {
  path?: string,
  fileSize?: string,
  native?: boolean,
  duration?: boolean;
}

export interface IFileSize {
  fileSize?: (size: number) => void;
}

export class MusicMetadataParser {

  public static getInstance(): MusicMetadataParser {
    return new MusicMetadataParser();
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
  ];

  public static toIntOrNull(str: string): number {
    const cleaned = parseInt(str, 10);
    return isNaN(cleaned) ? null : cleaned;
  }

  private tagMap = new TagMap();


  /**
   * Extract metadata from the given audio file
   * @param filePath File path of the audio file to parse
   * @param opts
   *   .filesize=true  Return filesize
   *   .native=true    Will return original header in result
   * @returns {EventEmitter}
   */
  public parse(filePath: string, opts: IOptions = {}): Promise<IAudioMetadata> {

    return FileParser.parse(filePath);
  }

  /*
  private tagCallback(headerType, tag, value) {
  if (value === null) {
    this.warning.push('tag ' + tag + ' is null');
    return;
  }

  if (value === '') {
    this.warning.push('tag ' + tag + ' is empty');
    return;
  }

  if (headerType === 'format') {
    metadata.format[tag] = value;
  } else {
    self.setCommonTags(metadata.common, headerType as HeaderType, tag, value);
  }

  // Send native event, unless it's native name is the same as a common name
  if (!TagMap.isCommonTag(tag)) {
    emitter.emit(tag, value);
  }

  if (opts.native) {
    if (!metadata.hasOwnProperty(headerType)) {
      metadata[headerType] = {}; // Register new native header headerType
    }

    if (self.tagMap.isNativeSingleton(headerType, tag)) {
      metadata[headerType][tag] = value;
    } else {
      (metadata[headerType][tag] = metadata[headerType][tag] ? metadata[headerType][tag] : []).push(value);
    }
  }
}*/



  /**
   * Process and set common tags
   * @param comTags Target metadata to wrote common tags to
   * @param type    Native headerType e.g.: 'm4a' | 'asf' | 'id3v1.1' | 'id3v2.4' | 'vorbis'
   * @param tag     Native tag
   * @param value   Native tag value
   */
  private setCommonTags(comTags, type: HeaderType, tag: string, value: any) {

    switch (type) {
      /*
       case 'vorbis':
       switch (tag) {

       case 'TRACKTOTAL':
       case 'TOTALTRACKS': // rare tag
       comTags.track.of = MusicMetadataParser.toIntOrNull(value)
       return

       case 'DISCTOTAL':
       case 'TOTALDISCS': // rare tag
       comTags.disk.of = MusicMetadataParser.toIntOrNull(value)
       return
       default:
       }
       break
       */

      case 'id3v2.3':
      case 'id3v2.4':
        switch (tag) {

          /*
           case 'TXXX':
           tag += ':' + value.description
           value = value.text
           break*/

          case 'UFID': // decode MusicBrainz Recording Id
            if (value.owner_identifier === 'http://musicbrainz.org') {
              tag += ':' + value.owner_identifier;
              value = common.decodeString(value.identifier, 'iso-8859-1');
            }
            break;

          case 'PRIV':
            switch (value.owner_identifier) {
              // decode Windows Media Player
              case 'AverageLevel':
              case 'PeakValue':
                tag += ':' + value.owner_identifier;
                value = common.strtokUINT32_LE.get(value.data, 0);
                break;
              default:
              // Unknown PRIV owner-identifier
            }
            break;

          default:
          // nothing to do
        }
        break;
      default:
      // nothing to do
    }

    // Convert native tag event to common (aliased) event
    const alias = this.tagMap.getCommonName(type, tag);

    if (alias) {
      // Common tag (alias) found

      // check if we need to do something special with common tag
      // if the event has been aliased then we need to clean it before
      // it is emitted to the user. e.g. genre (20) -> Electronic
      switch (alias) {
        case 'genre':
          value = common.parseGenre(value);
          break;

        case 'barcode':
          value = typeof value === 'string' ? parseInt(value, 10) : value;
          break;

        case 'picture':
          value = this.cleanupPicture(value);
          break;

        case 'totaltracks':
          comTags.track.of = MusicMetadataParser.toIntOrNull(value);
          return;

        case 'totaldiscs':
          comTags.disk.of = MusicMetadataParser.toIntOrNull(value);
          return;

        case 'track':
        case 'disk':
          const of = comTags[alias].of; // store of value, maybe maybe overwritten
          comTags[alias] = this.cleanupTrack(value);
          comTags[alias].of = of != null ? of : comTags[alias].of;
          return;

        case 'year':
        case 'originalyear':
          value = parseInt(value, 10);
          break;

        case 'date':
          // ToDo: be more strict on 'YYYY...'
          // if (/^\d{4}\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01])$/.test(value)) {
          comTags.year = parseInt(value.substr(0, 4), 10);
          break;

        default:
        // nothing to do
      }

      if (alias !== 'artist' && TagMap.isSingleton(alias)) {
        comTags[alias] = value;
      } else {
        if (comTags.hasOwnProperty(alias)) {
          comTags[alias].push(value);
        } else {
          // if we haven't previously seen this tag then
          // initialize it to an array, ready for values to be entered
          comTags[alias] = [value];
        }
      }
    }
  }

  // TODO: a string of 1of1 would fail to be converted
  // converts 1/10 to no : 1, of : 10
  // or 1 to no : 1, of : 0
  public static cleanupTrack(origVal: number | string) {
    const split = origVal.toString().split('/');
    return {
      no: parseInt(split[0], 10) || null,
      of: parseInt(split[1], 10) || null
    };
  }

  public static cleanupPicture(picture) {
    let newFormat;
    if (picture.format) {
      const split = picture.format.toLowerCase().split('/');
      newFormat = (split.length > 1) ? split[1] : split[0];
      if (newFormat === 'jpeg') newFormat = 'jpg';
    } else {
      newFormat = 'jpg';
    }
    return {format: newFormat, data: picture.data};
  }
}

/**
 * Parse audio stream
 * @param stream
 * @param opts
 *   .filesize=true  Return filesize
 *   .native=true    Will return original header in result
 * @param callback
 * @returns {*|EventEmitter}
 */
export function parseFile(filePath: string, opts: IOptions): Promise<IAudioMetadata> {
  return MusicMetadataParser.getInstance().parse(filePath, opts);
}
