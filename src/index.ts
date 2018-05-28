'use strict';

import {TagPriority, TagType} from './common/GenericTagTypes';
import {ParserFactory} from "./ParserFactory";
import * as Stream from "stream";
import {IGenericTagMapper} from "./common/GenericTagMapper";
import {ID3v24TagMapper} from "./id3v2/ID3v24TagMapper";
import {MP4TagMapper} from "./mp4/MP4TagMapper";
import {VorbisTagMapper} from "./vorbis/VorbisTagMapper";
import {APEv2TagMapper} from "./apev2/APEv2TagMapper";
import {ID3v22TagMapper} from "./id3v2/ID3v22TagMapper";
import {ID3v1TagMapper} from "./id3v1/ID3v1TagMap";
import {AsfTagMapper} from "./asf/AsfTagMapper";
import {RiffInfoTagMapper} from "./riff/RiffInfoTagMap";

/**
 * Attached picture, typically used for cover art
 */
export interface IPicture {
  /**
   * image extension: jpg, png
   */
  format: string,
  /**
   * Image data
   */
  data: Buffer,
  /**
   * Optional description
   */
  description?: string
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
  technician?: string[],
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
  gapless?: boolean,
  barcode?: string, // ToDo: multiple??
  // International Standard Recording Code
  isrc?: string[],
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
  notes?: string[],
  originalalbum?: string,
  originalartist?: string,
  // Discogs:
  discogs_release_id?: number,
  /**
   * Track gain in dB; eg: "-7.03 dB"
   */
  replaygain_track_gain?: string,
  /**
   * Track peak [0..1]
   */
  replaygain_track_peak?: number

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
export interface INativeTags {
  [tagType: string]: ITag[];
}

/**
 * Tags ordered by tag-ID
 */
export interface INativeTagDict {
  [tagId: string]: any[];
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

  /**
   * default: `false`, if set to `true`, it will use all tag headers available to populate common. Newest header version having priority.
   */
  mergeTagHeaders?: boolean;
}

/**
 * Combines all generic-tag-mappers for each tag type
 */
export class CombinedTagMapper {

  public tagMappers: { [index: string]: IGenericTagMapper } = {};

  public constructor() {
    [
      new ID3v1TagMapper(),
      new ID3v22TagMapper(),
      new ID3v24TagMapper(),
      new MP4TagMapper(),
      new MP4TagMapper(),
      new VorbisTagMapper(),
      new APEv2TagMapper(),
      new AsfTagMapper(),
      new RiffInfoTagMapper()
    ].forEach(mapper => {
      this.registerTagMapper(mapper);
    });
  }

  /**
   * Process and set common tags
   * @param comTags Target metadata to
   * write common tags to
   * @param comTags Generic tag results (output of this function)
   * @param tag     Native tag
   */
  public setGenericTag(comTags: ICommonTagsResult, tagType: TagType, tag: ITag) {
    const tagMapper = this.tagMappers[tagType];
    if (tagMapper) {
      this.tagMappers[tagType].setGenericTag(comTags, tag);
    } else {
      throw new Error("No generic tag mapper defined for tag-format: " + tagType);
    }
  }

  private registerTagMapper(genericTagMapper: IGenericTagMapper) {
    for (const tagType of genericTagMapper.tagTypes) {
      this.tagMappers[tagType] = genericTagMapper;
    }
  }
}

export class MusicMetadataParser {

  public static getInstance(): MusicMetadataParser {
    return new MusicMetadataParser();
  }

  public static joinArtists(artists: string[]): string {
    if (artists.length > 2) {
      return artists.slice(0, artists.length - 1).join(', ') + ' & ' +  artists[artists.length - 1];
    }
    return artists.join(' & ');
  }

  private tagMapper = new CombinedTagMapper();

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
      return this.parseNativeTags(nativeData, opts.native, opts.mergeTagHeaders);
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
      return this.parseNativeTags(nativeData, opts.native, opts.mergeTagHeaders);
    });
  }

  /**
   * Convert native tags to common tags
   * @param nativeData
   * @includeNative return native tags in result
   * @returns {IAudioMetadata} Native + common tags
   */
  public parseNativeTags(nativeData: INativeAudioMetadata, includeNative?: boolean, mergeTagHeaders?: boolean): IAudioMetadata {

    const metadata: IAudioMetadata = {
      format: nativeData.format,
      native: includeNative ? nativeData.native : undefined,
      common: {} as any
    };

    metadata.format.tagTypes = [];

    for (const tagType in nativeData.native) {
      metadata.format.tagTypes.push(tagType as TagType);
    }

    for (const tagType of TagPriority) {

      if (nativeData.native[tagType]) {
        if (nativeData.native[tagType].length === 0) {
          // ToDo: register warning: empty tag header
        } else {

          const common = {
            track: {no: null, of: null},
            disk: {no: null, of: null}
          };

          for (const tag of nativeData.native[tagType]) {
            this.tagMapper.setGenericTag(common, tagType as TagType, tag);
          }

          for (const tag of Object.keys(common)) {
            if (!metadata.common[tag]) {
              metadata.common[tag] = common[tag];
            }
          }

          if (!mergeTagHeaders) {
            break;
          }
        }
      }
    }

    if (metadata.common.artists && metadata.common.artists.length > 0) {
      // common.artists explicitly by meta-data
      metadata.common.artist = !metadata.common.artist ? MusicMetadataParser.joinArtists(metadata.common.artists) : metadata.common.artist[0];
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
}

/**
 * Parse audio file
 * @param filePath Media file to read meta-data from
 * @param options Parsing options:
 *   .native=true    Will return original header in result
 *   .mergeTagHeaders=false  Populate common from data of all headers available
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
 *   .mergeTagHeaders=false  Populate common from data of all headers available
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
