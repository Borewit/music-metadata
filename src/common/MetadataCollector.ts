import {
  FormatId,
  IAudioMetadata, ICommonTagsResult,
  IFormat,
  INativeAudioMetadata,
  INativeTags, IOptions
} from '../type';

import * as _debug from "debug";
import {GenericTagId, IGenericTag, TagType, isSingleton, isUnique} from "./GenericTagTypes";
import {CombinedTagMapper} from "./CombinedTagMapper";
import {CommonTagMapper} from "./GenericTagMapper";
import {toRatio} from "./Util";

const debug = _debug("music-metadata:collector");

const TagPriority: TagType[] = ['APEv2', 'vorbis', 'ID3v2.4', 'ID3v2.3', 'ID3v2.2', 'exif', 'asf', 'iTunes', 'ID3v1'];

/**
 * Combines all generic-tag-mappers for each tag type
 */

export interface INativeMetadataCollector {

  /**
   * Only use this for reading
   */
  readonly format: IFormat;

  readonly native: INativeTags;

  /**
   * @returns {boolean} true if one or more tags have been found
   */
  hasAny(): boolean;

  setFormat(key: FormatId, value: any);

  addTag(tagType: string, tagId: string, value: any);

}

/**
 * Provided to the parser to uodate the metadata result.
 * Responsible for triggering async updates
 */
export class MetadataCollector implements INativeMetadataCollector {

  public readonly format: IFormat = {
    tagTypes: []
  };

  public readonly native: INativeTags = {};

  public readonly common: ICommonTagsResult = {
    track: {no: null, of: null},
    disk: {no: null, of: null}
  };

  /**
   * Keeps track of origin priority for each mapped id
   */
  private readonly commonOrigin: {
    [id: string]: number;
  } = {};

  /**
   * Maps a tag type to a priority
   */
  private readonly originPriority: {
    [tagType: string]: number;
  } = {};

  private tagMapper = new CombinedTagMapper();

  public constructor(private opts: IOptions) {
    let priority: number = 1;
    for (const tagType of TagPriority) {
      this.originPriority[tagType] = priority++;
    }
    this.originPriority.artificial = 500; // Filled using alternative tags
    this.originPriority.id3v1 = 600; // Consider worst due to field length limit
  }

  /**
   * @returns {boolean} true if one or more tags have been found
   */
  public hasAny() {
    for (const tagType in this.native) {
      return true;
    }
    return false;
  }

  public setFormat(key: FormatId, value: any) {
    debug(`format: ${key} = ${value}`);
    (this.format as any)[key] = value; // as any to override readonly

    if (this.opts.observer) {
      this.opts.observer({metadata: this, tag: {type: 'format', id: key, value}});
    }
  }

  public addTag(tagType: TagType, tagId: string, value: any) {
    debug(`tag ${tagType}.${tagId} = ${value}`);
    if (!this.native[tagType]) {
      this.format.tagTypes.push(tagType);
      this.native[tagType] = [];
    }
    this.native[tagType].push({id: tagId, value});

    this.toCommon(tagType, tagId, value);
  }

  public getNativeMetadata(): INativeAudioMetadata {
    return {
      format: this.format,
      native: this.native
    };
  }

  public postMap(tagType: TagType | 'artificial', tag: IGenericTag) {

    // Common tag (alias) found

    // check if we need to do something special with common tag
    // if the event has been aliased then we need to clean it before
    // it is emitted to the user. e.g. genre (20) -> Electronic
    switch (tag.id) {

      case 'artist':

        if (this.commonOrigin.artist === this.originPriority[tagType]) {
          // Assume the artist field is used as artists
          return this.postMap('artificial', {id: 'artists', value: tag.value});
        }

        if (!this.common.artists) {
          // Fill artists using artist source
          this.setGenericTag('artificial', {id: 'artists', value: tag.value});
        }
        break;

      case 'artists':
        if (!this.common.artist || this.commonOrigin.artist === this.originPriority.artificial) {
          if (!this.common.artists || this.common.artists.indexOf(tag.value) === -1) {
            // Fill artist using artists source
            const artists = (this.common.artists || []).concat([tag.value]);
            const value = joinArtists(artists);
            const artistTag: IGenericTag = {id: 'artist', value};
            this.setGenericTag('artificial', artistTag);
          }
        }
        break;

      case 'genre':
        tag.value = CommonTagMapper.parseGenre(tag.value);
        break;

      case 'picture':
        tag.value.format = CommonTagMapper.fixPictureMimeType(tag.value.format);
        break;

      case 'totaltracks':
        this.common.track.of = CommonTagMapper.toIntOrNull(tag.value);
        return;

      case 'totaldiscs':
        this.common.disk.of = CommonTagMapper.toIntOrNull(tag.value);
        return;

      case 'track':
      case 'disk':
        const of = this.common[tag.id].of; // store of value, maybe maybe overwritten
        this.common[tag.id] = CommonTagMapper.normalizeTrack(tag.value);
        this.common[tag.id].of = of != null ? of : this.common[tag.id].of;
        return;

      case 'year':
      case 'originalyear':
        tag.value = parseInt(tag.value, 10);
        break;

      case 'date':
        // ToDo: be more strict on 'YYYY...'
        const year = parseInt(tag.value.substr(0, 4), 10);
        if (year && !isNaN(year)) {
          this.common.year = year;
        }
        break;

      case 'discogs_label_id':
      case 'discogs_release_id':
      case 'discogs_master_release_id':
      case 'discogs_artist_id':
      case 'discogs_votes':
        tag.value = typeof tag.value === 'string' ? parseInt(tag.value, 10) : tag.value;
        break;

      case 'replaygain_track_gain':
      case 'replaygain_track_peak':
        tag.value = toRatio(tag.value);
        break;

      case 'gapless': // iTunes gap-less flag
        tag.value = tag.value === "1"; // boolean
        break;

      default:
      // nothing to do
    }

    this.setGenericTag(tagType, tag);
  }

  /**
   * Convert native tags to common tags
   * @returns {IAudioMetadata} Native + common tags
   */
  public toCommonMetadata(): IAudioMetadata {
    return {
      format: this.format,
      native: this.opts.native ? this.native : undefined,
      common: this.common
    };
  }

  /**
   * Convert native tag to common tags
   */
  private toCommon(tagType: TagType, tagId: string, value: any) {

    const tag = {id: tagId, value};

    const genericTag = this.tagMapper.mapTag(tagType, tag);

    if (genericTag) {
      this.postMap(tagType, genericTag);
    }
  }

  /**
   * Set generic tag
   * @param {GenericTagId} tagId
   * @param {TagType} tagType originating header type, used to prioritize concurrent mappings
   * @param value
   */
  private setGenericTag(tagType: TagType | 'artificial', tag: IGenericTag) {

    debug(`common.${tag.id} = ${tag.value}`);
    const prio0 = this.commonOrigin[tag.id] || 1000;
    const prio1 = this.originPriority[tagType];

    if (isSingleton(tag.id)) {
      if (prio1 <= prio0) {
        this.common[tag.id] = tag.value;
        this.commonOrigin[tag.id] = prio1;
      } else {
        return debug(`Ignore native tag (singleton): ${tagType}.${tag.id} = ${tag.value}`);
      }
    } else {
      if (prio1 === prio0) {
        if (!isUnique(tag.id) || this.common[tag.id].indexOf(tag.value) === -1) {
          this.common[tag.id].push(tag.value);
        } else {
          debug(`Ignore duplicate value: ${tagType}.${tag.id} = ${tag.value}`);
        }
        // no effect? this.commonOrigin[tag.id] = prio1;
      } else if (prio1 < prio0) {
        this.common[tag.id] = [tag.value];
        this.commonOrigin[tag.id] = prio1;
      } else {
        return debug(`Ignore native tag (list): ${tagType}.${tag.id} = ${tag.value}`);
      }
    }
    if (this.opts.observer) {
      this.opts.observer({metadata: this, tag: {type: 'common', id: tag.id, value: tag.value}});
    }
    // ToDo: trigger metadata event
  }
}

export function joinArtists(artists: string[]): string {
  if (artists.length > 2) {
    return artists.slice(0, artists.length - 1).join(', ') + ' & ' + artists[artists.length - 1];
  }
  return artists.join(' & ');
}
