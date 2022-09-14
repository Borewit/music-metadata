import { CommonTagMapper } from "./GenericTagMapper";

import type { INativeTagMap, TagType } from "./GenericTagTypes";

export class CaseInsensitiveTagMap extends CommonTagMapper {
  public constructor(tagTypes: TagType[], tagMap: INativeTagMap) {
    const upperCaseMap: INativeTagMap = {};
    for (const tag of Object.keys(tagMap)) {
      upperCaseMap[tag.toUpperCase()] = tagMap[tag];
    }

    super(tagTypes, upperCaseMap);
  }

  /**
   * @param tag Native header tag
   * @returns common tag name (alias)
   */
  protected override getCommonName(tag: string) {
    return this.tagMap[tag.toUpperCase()];
  }
}
