import {
  FormatId,
  IFormat,
  INativeTags,
  IQualityInformation,
  ITrackInfo,
} from "../type";

import { TagType } from "./GenericTagTypes";

/**
 * Combines all generic-tag-mappers for each tag type
 */

export interface IWarningCollector {
  /**
   * Register parser warning
   * @param warning
   */
  addWarning(warning: string);
}

export interface INativeMetadataCollector extends IWarningCollector {
  /**
   * Only use this for reading
   */
  readonly format: IFormat;

  readonly native: INativeTags;

  readonly quality: IQualityInformation;

  /**
   * @returns {boolean} true if one or more tags have been found
   */
  hasAny(): boolean;

  setFormat(key: FormatId, value: any): void;

  addTag(tagType: TagType, tagId: string, value: any): void;

  addStreamInfo(streamInfo: ITrackInfo): void;
}
