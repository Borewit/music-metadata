'use strict';

import {GenericTagId, TagType} from './common/GenericTagTypes';
import {ITokenParser, ParserFactory} from "./ParserFactory";
import * as Stream from "stream";
import {Promise} from "es6-promise";

/**
 * Attached picture, typically used for cover art
 */
export interface IPicture {
  /**
   * Image mime type
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

/**
 * Abstract interface to access rating information
 */
export interface IRating {
  /**
   * Rating source, could be an e-mail address
   */
  source?: string,
  /**
   * Rating [0..1]
   */
  rating: number
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
  rating?: IRating[],
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

export type FormatId = 'dataformat' | 'duration' | 'bitrate' | 'sampleRate' | 'bitsPerSample' | 'encoder' | 'codecProfile' | 'lossless' | 'numberOfChannels' | 'numberOfSamples' | 'audioMD5';

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
   * default: `false`, if set to `true`, it will not search all the entire track for additional headers.
   * Only recommenced to use in combination with streams.
   */
  skipPostHeaders?: boolean;

  /**
   * Allow custom loading of modules
   * @param {string} moduleName module name
   * @return {Promise<ITokenParser>} parser
   */
  loadParser?: (moduleName: string) => Promise<ITokenParser>;

  /**
   * Set observer for async callbacks to common or format.
   */
  observer?: Observer;
}

/**
 * Event definition send after each change to common/format metadata change to observer.
 */
export interface IMetadataEvent {

  /**
   * Tag which has been updated.
   */
  tag: {

    /**
     * Either 'common' if it a generic tag event, or 'format' for format related updates
     */
    type: 'common' | 'format'

    /**
     * Tag id
     */
    id: GenericTagId | FormatId

    /**
     * Tag value
     */
    value: any
  };

  /**
   * Metadata model including the attached tag
   */
  metadata: IAudioMetadata
}

export type Observer = (update: IMetadataEvent) => void;

export class MusicMetadataParser {

  public static joinArtists(artists: string[]): string {
    if (artists.length > 2) {
      return artists.slice(0, artists.length - 1).join(', ') + ' & ' +  artists[artists.length - 1];
    }
    return artists.join(' & ');
  }

  /**
   * Extract metadata from the given audio file
   * @param filePath File path of the audio file to parse
   * @param opts
   *   .filesize=true  Return filesize
   *   .native=true    Will return original header in result
   * @returns {Promise<IAudioMetadata>}
   */
  public parseFile(filePath: string, opts: IOptions = {}): Promise<IAudioMetadata> {
    return ParserFactory.parseFile(filePath, opts);
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
    return ParserFactory.parseStream(stream, mimeType, opts);
  }

}

/**
 * Parse audio file
 * @param filePath Media file to read meta-data from
 * @param options Parsing options
 * @returns {Promise<IAudioMetadata>}
 */
export function parseFile(filePath: string, options?: IOptions): Promise<IAudioMetadata> {
  return new MusicMetadataParser().parseFile(filePath, options);
}

/**
 * Parse audio Stream
 * @param stream
 * @param mimeType
 * @param options Parsing options
 * @returns {Promise<IAudioMetadata>}
 */
export function parseStream(stream: Stream.Readable, mimeType?: string, opts?: IOptions): Promise<IAudioMetadata> {
  return new MusicMetadataParser().parseStream(stream, mimeType, opts);
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

/**
 * Convert rating to 1-5 star rating
 * @param {number} rating Normalized rating [0..1] (common.rating[n].rating)
 * @returns {number} Number of stars: 1, 2, 3, 4 or 5 stars
 */
export function ratingToStars(rating: number): number {
  return rating === undefined ? 0 : 1 + Math.round(rating * 4);
}
