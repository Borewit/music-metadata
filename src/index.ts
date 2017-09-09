/* jshint maxlen: 300 */
'use strict';

import common from './common';
import TagMap, {TagPriority, TagType} from './tagmap';
import EventEmitter = NodeJS.EventEmitter;
import {ParserFactory} from "./ParserFactory";
import * as Stream from "stream";

export interface IPicture {
  format: string,
  data: Buffer;
}

export interface ICommonTagsResult {
  track: { no: number, of: number },
  disk: { no: number, of: number },
  /**
   * Release year
   */
  year?: number,
  title?: string,
  artist?: string, // ToDo: string[] is only used internal
  artists?: string[],
  albumartist?: string,
  album?: string,
  /**
   * Release data
   */
  date?: string,
  /**
   * Original release date
   */
  originaldate?: string,
  /**
   * Original release yeat
   */
  originalyear?: number,
  comment?: string[],
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
  peakLevel?: number,
  notes: string[],
  originalalbum: string,
  originalartist: string
}

export interface IFormat {

  /**
   * E.g.: 'flac'
   */
  dataformat?: string, // ToDo: make mandatory

  /**
   * List of tags found in parsed audio file
   */
  tagTypes?: TagType[],

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

  /**
   * Number of samples frames.
   * One sample contains all channels
   * The duration is: numberOfSamples / sampleRate
   */
  numberOfSamples?: number

  /**
   * 16-byte MD5 of raw audio
   */
  audioMD5?: Buffer;
}

export interface ITag {
  id: string,
  value: any
}

/**
 * Flat list of tags
 */
export interface INativeTags { [tagType: string]: ITag[];
}

/**
 * Tags ordered by tag-ID
 */
export interface INativeTagDict { [tagId: string]: any[];
}

export interface INativeAudioMetadata {
  format: IFormat,
  native: INativeTags
}

export interface IAudioMetadata extends INativeAudioMetadata {
  common: ICommonTagsResult,
}

export interface IOptions {
  path?: string,

  /**
   *  default: `undefined`, pass the
   */
  fileSize?: number,

  /**
   *  default: `false`, if set to `true`, it will return native tags in addition to the `common` tags.
   */
  native?: boolean,

  /**
   * default: `false`, if set to `true`, it will parse the whole media file if required to determine the duration.
   */
  duration?: boolean;

  /**
   * default: `false`, if set to `true`, it will skip parsing covers.
   */
  skipCovers?: boolean;
}

export class MusicMetadataParser {

  public static getInstance(): MusicMetadataParser {
    return new MusicMetadataParser();
  }

  public static toIntOrNull(str: string): number {
    const cleaned = parseInt(str, 10);
    return isNaN(cleaned) ? null : cleaned;
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

  /**
   * ToDo: move to respective format implementations
   */
  /*
  private static headerTypes = [
    {
      buf: GUID.HeaderObject.toBin(),
      tag: require('./asf/AsfParser')
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
  ];*/

  private tagMap = new TagMap();

  /**
   * Extract metadata from the given audio file
   * @param filePath File path of the audio file to parse
   * @param opts
   *   .filesize=true  Return filesize
   *   .native=true    Will return original header in result
   * @returns {Promise<IAudioMetadata>}
   */
  public parseFile(filePath: string, opts: IOptions = {}): Promise<IAudioMetadata> {

    return ParserFactory.parseFile(filePath, opts).then(nativeData => {
      return this.parseNativeTags(nativeData, opts.native);
    });

  }

  /**
   * Extract metadata from the given audio file
   * @param stream Audio ReadableStream
   * @param mimeType Mime-Type of Stream
   * @param opts
   *   .filesize=true  Return filesize
   *   .native=true    Will return original header in result
   * @returns {Promise<IAudioMetadata>}
   */
  public parseStream(stream: Stream.Readable, mimeType: string, opts: IOptions = {}): Promise<IAudioMetadata> {
    return ParserFactory.parseStream(stream, mimeType, opts).then(nativeData => {
      return this.parseNativeTags(nativeData, opts.native);
    });
  }

  /**
   * Convert native tags to common tags
   * @param nativeData
   * @includeNative return native tags in result
   * @returns {IAudioMetadata} Native + common tags
   */
  public parseNativeTags(nativeData: INativeAudioMetadata, includeNative?: boolean): IAudioMetadata {

    const metadata: IAudioMetadata = {
      format: nativeData.format,
      native: includeNative ? nativeData.native : undefined,
      common: {
        track: {no: null, of: null},
        disk: {no: null, of: null}
      } as any
    };

    metadata.format.tagTypes = [];

    for (const tagType in nativeData.native) {
      metadata.format.tagTypes.push(tagType as TagType);
    }
    for (const tagType of TagPriority) {
      if (nativeData.native[tagType]) {
        for (const tag of nativeData.native[tagType]) {
          this.setCommonTags(metadata.common, tagType as TagType, tag.id, tag.value);
        }
        break;
      }
    }

    if (metadata.common.artists && metadata.common.artists.length > 0) {
      metadata.common.artist = metadata.common.artist[0];
    } else {
      if (metadata.common.artist) {
        metadata.common.artists = metadata.common.artist as any;
        if (metadata.common.artist.length > 1) {
          delete metadata.common.artist;
        } else {
          metadata.common.artist = metadata.common.artist[0];
        }
      }
    }
    return metadata;
  }

  /**
   * Process and set common tags
   * @param comTags Target metadata to wrote common tags to
   * @param type    Native tagTypes e.g.: 'iTunes MP4' | 'asf' | 'ID3v1.1' | 'ID3v2.4' | 'vorbis'
   * @param tag     Native tag
   * @param value   Native tag value
   */
  private setCommonTags(comTags, type: TagType, tag: string, value: any) {

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

      case 'ID3v2.3':
      case 'ID3v2.4':
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
                value = value.data.readUInt32LE();
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
          value = MusicMetadataParser.cleanupPicture(value);
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
          comTags[alias] = MusicMetadataParser.cleanupTrack(value);
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
}

/**
 * Parse audio file
 * @param filePath Media file to read meta-data from
 * @param options Parsing options:
 *   .native=true    Will return original header in result
 * @returns {Promise<IAudioMetadata>}
 */
export function parseFile(filePath: string, options?: IOptions): Promise<IAudioMetadata> {
  return MusicMetadataParser.getInstance().parseFile(filePath, options);
}

/**
 * Parse audio Stream
 * @param stream
 * @param mimeType
 * @param opts Parsing options
 *   .native=true    Will return original header in result
 * @returns {Promise<IAudioMetadata>}
 */
export function parseStream(stream: Stream.Readable, mimeType: string, opts?: IOptions): Promise<IAudioMetadata> {
  return MusicMetadataParser.getInstance().parseStream(stream, mimeType, opts);
}

/**
 * Create a dictionary ordered by their tag id (key)
 * @param nativeTags list of tags
 * @returns tags indexed by id
 */
export function orderTags(nativeTags: ITag[]): INativeTagDict {
  const tags = {};
  for (const tag of nativeTags) {
    (tags[tag.id] = (tags[tag.id] || [])).push(tag.value);
  }
  return tags;
}
