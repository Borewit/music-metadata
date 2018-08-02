import {
  IAudioMetadata,
  IFormat,
  INativeAudioMetadata,
  INativeTags, IOptions,
  MusicMetadataParser
} from "../index";

import * as _debug from "debug";
import {TagPriority, TagType} from "./GenericTagTypes";
import {CombinedTagMapper} from "./CombinedTagMapper";

const debug = _debug("music-metadata:collector");

/**
 * Combines all generic-tag-mappers for each tag type
 */

export interface IMetadataCollector {

  /**
   * Only use this for reading
   */
  readonly format: IFormat;

  readonly native: IFormat;

  /**
   * @returns {boolean} true if one or more tags have been found
   */
  hasAny(): boolean;

  setFormat(key: string, value: any);

  addTag(tagType: string, tagId: string, value: any);

}

/**
 * Provided to the parser to uodate the metadata result.
 * Responsible for triggering async updates
 */
export class MetadataCollector implements IMetadataCollector {

  public readonly format: IFormat = {
    tagTypes: []
  };
  public readonly native: INativeTags = {};

  private tagMapper = new CombinedTagMapper();

  public constructor(private opts: IOptions) {
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

  public setFormat(key: string, value: any) {
    debug(`format: ${key} = ${value}`);
    this.format[key] = value;
  }

  public addTag(tagType: TagType, tagId: string, value: any) {
    debug(`tag ${tagType}.${tagId} = ${value}`);
    if (!this.native[tagType]) {
      this.format.tagTypes.push(tagType);
      this.native[tagType] = [];
    }
    this.native[tagType].push({id: tagId, value});
  }

  public getNativeMetadata(): INativeAudioMetadata {
    return  {
      format: this.format,
      native: this.native
    };
  }

  /**
   * Convert native tags to common tags
   * @returns {IAudioMetadata} Native + common tags
   */
  public toCommonMetadata(): IAudioMetadata {

    const metadata: IAudioMetadata = {
      format: this.format,
      native: this.opts.native ? this.native : undefined,
      common: {} as any
    };

    for (const tagType of TagPriority) {

      if (this.native[tagType]) {
        if (this.native[tagType].length === 0) {
          // ToDo: register warning: empty tag header
        } else {

          const common = {
            track: {no: null, of: null},
            disk: {no: null, of: null}
          };

          const x = this.native[tagType];

          for (const tag of this.native[tagType]) {
            this.tagMapper.setGenericTag(common, tagType as TagType, tag);
          }

          for (const tag of Object.keys(common)) {
            if (!metadata.common[tag]) {
              metadata.common[tag] = common[tag];
            }
          }

          if (!this.opts.mergeTagHeaders) {
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
