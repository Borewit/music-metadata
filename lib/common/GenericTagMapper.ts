import type { ITag } from "../type";
import type { GenericTagId } from "./GenericTagId";
import type * as generic from "./GenericTagTypes";
import type { INativeMetadataCollector, IWarningCollector } from "./INativeMetadataCollector";

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
   * Map native tag to generic tag
   * @param tag       Native tag
   * @param warnings  Register warnings
   * @returns Generic tag, if native tag could be mapped
   */
  mapGenericTag(tag: ITag, warnings: INativeMetadataCollector): generic.IGenericTag | null;
}

export class CommonTagMapper implements IGenericTagMapper {
  public static maxRatingScore = 1;

  public static toIntOrNull(str: string): number | null {
    const cleaned = Number.parseInt(str, 10);
    return Number.isNaN(cleaned) ? null : cleaned;
  }

  // TODO: a string of 1of1 would fail to be converted
  // converts 1/10 to no : 1, of : 10
  // or 1 to no : 1, of : 0
  public static normalizeTrack(origVal: number | string) {
    const split = origVal.toString().split("/");
    return {
      no: Number.parseInt(split[0], 10) || null,
      of: Number.parseInt(split[1], 10) || null,
    };
  }

  public constructor(public tagTypes: generic.TagType[], public tagMap: generic.INativeTagMap) {}

  /**
   * Process and set common tags
   * write common tags to
   * @param tag Native tag
   * @param warnings Register warnings
   * @returns common name
   */
  public mapGenericTag(tag: ITag, warnings: IWarningCollector): generic.IGenericTag | null {
    tag = { id: tag.id, value: tag.value }; // clone object

    this.postMap(tag, warnings);

    // Convert native tag event to generic 'alias' tag
    const id = this.getCommonName(tag.id);
    return id ? { id, value: tag.value } : null;
  }

  /**
   * Convert native tag key to common tag key
   * @param tag Native header tag
   * @returns common tag name (alias)
   */
  protected getCommonName(tag: string): GenericTagId {
    return this.tagMap[tag];
  }

  /**
   * Handle post mapping exceptions / correction
   * @param _tag Tag e.g. {"©alb", "Buena Vista Social Club")
   * @param _warnings Used to register warnings
   */
  protected postMap(_tag: ITag, _warnings: IWarningCollector): void {
    return;
  }
}
