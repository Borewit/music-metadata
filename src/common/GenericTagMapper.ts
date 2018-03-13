import * as generic from "./GenericTagTypes";
import {ICommonTagsResult, ITag} from "../index";
import {Genres} from "../id3v1/ID3v1Parser";

export interface IGenericTagMapper {

  /**
   * Which tagType it able to map to the generic mapping format
   */
  tagTypes: generic.TagType[];

  /**
   * Basic tag map
   */
  tagMap: generic.INativeTagMap;

  /**
   * Process and set common tags
   * @param comTags Target metadata to
   * write common tags to
   * @param type    Native tagTypes e.g.: 'iTunes MP4' | 'asf' | 'ID3v1.1' | 'ID3v2.4' | 'vorbis'
   * @param tag     Native tag
   * @param value   Native tag value
   */
  setGenericTag(comTags: ICommonTagsResult, tag: ITag);

  /**
   * Test if native tag tagTypes is a singleton
   * @param type e.g.: 'iTunes MP4' | 'asf' | 'ID3v1.1' | 'ID3v2.4' | 'vorbis'
   * @param  tag Native tag name', e.g. 'TITLE'
   * @returns {boolean} true is we can safely assume that it is a singleton
   */
  isNativeSingleton(tag: string): boolean;

}

export class CommonTagMapper implements IGenericTagMapper {

  public static parseGenre(origVal: string) {
    // match everything inside parentheses
    const split = origVal.trim().split(/\((.*?)\)/g).filter(val => {
      return val !== '';
    });

    const array = [];
    for (let cur of split) {
      if (/^\d+$/.test(cur) && !isNaN(parseInt(cur, 10))) {
        cur = Genres[cur];
      }
      array.push(cur);
    }

    return array
      .filter(val => {
        return val !== undefined;
      }).join('/');
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

  public constructor(public tagTypes: generic.TagType[], public tagMap: generic.INativeTagMap) {
  }

  /**
   * Process and set common tags
   * @param comTags Target metadata to
   * write common tags to
   * @param comTags Generic tag results (output of this function)
   * @param tag     Native tag
   * @param value   Native tag value
   */
  public setGenericTag(comTags: ICommonTagsResult, tag: ITag) {

    tag = {id: tag.id, value: tag.value}; // clone object

    this.postMap(tag);

    // Convert native tag event to generic 'alias' tag
    const alias = this.getCommonName(tag.id);

    if (alias) {
      // Common tag (alias) found

      // check if we need to do something special with common tag
      // if the event has been aliased then we need to clean it before
      // it is emitted to the user. e.g. genre (20) -> Electronic
      switch (alias) {
        case 'genre':
          tag.value = CommonTagMapper.parseGenre(tag.value);
          break;

        case 'barcode':
          tag.value = typeof tag.value === 'string' ? parseInt(tag.value, 10) : tag.value;
          break;

        case 'picture':
          tag.value = CommonTagMapper.cleanupPicture(tag.value);
          break;

        case 'totaltracks':
          comTags.track.of = CommonTagMapper.toIntOrNull(tag.value);
          return;

        case 'totaldiscs':
          comTags.disk.of = CommonTagMapper.toIntOrNull(tag.value);
          return;

        case 'track':
        case 'disk':
          const of = comTags[alias].of; // store of value, maybe maybe overwritten
          comTags[alias] = CommonTagMapper.cleanupTrack(tag.value);
          comTags[alias].of = of != null ? of : comTags[alias].of;
          return;

        case 'year':
        case 'originalyear':
          tag.value = parseInt(tag.value, 10);
          break;

        case 'date':
          // ToDo: be more strict on 'YYYY...'
          const year = parseInt(tag.value.substr(0, 4), 10);
          if (year && !isNaN(year)) {
            comTags.year = year;
          }
          break;

        case 'discogs_label_id':
        case 'discogs_release_id':
        case 'discogs_master_release_id':
        case 'discogs_artist_id':
        case 'discogs_votes':
          tag.value = typeof tag.value === 'string' ? parseInt(tag.value, 10) : tag.value;
          break;

        case 'discogs_rating':
        case 'replaygain_track_peak':
          tag.value = typeof tag.value === 'string' ? parseFloat(tag.value) : tag.value;
          break;

        case 'gapless': // iTunes gap-less flag
          tag.value = tag.value === "1"; // boolean
          break;

        default:
        // nothing to do
      }

      if (alias !== 'artist' && generic.isSingleton(alias)) {
        comTags[alias] = tag.value;
      } else {
        if (comTags.hasOwnProperty(alias)) {
          comTags[alias].push(tag.value);
        } else {
          // if we haven't previously seen this tag then
          // initialize it to an array, ready for values to be entered
          comTags[alias] = [tag.value];
        }
      }
    }
  }

  /**
   * Test if native tag tagTypes is a singleton
   * @param type e.g.: 'iTunes MP4' | 'asf' | 'ID3v1.1' | 'ID3v2.4' | 'vorbis'
   * @param  tag Native tag name', e.g. 'TITLE'
   * @returns {boolean} true is we can safely assume that it is a singleton
   */
  public isNativeSingleton(tag: string): boolean {
    const alias = this.getCommonName(tag);
    return alias && !generic.commonTags[alias].multiple;
  }

  /**
   * Convert native tag key to common tag key
   * @tag  Native header tag
   * @return common tag name (alias)
   */
  protected getCommonName(tag: string): generic.CommonTag {
    return this.tagMap[tag];
  }

  /**
   * Handle post mapping exceptions / correction
   * @param {string} tag Tag e.g. {"©alb", "Buena Vista Social Club")
   */
  protected postMap(tag: ITag): void {
    return;
  }
}
