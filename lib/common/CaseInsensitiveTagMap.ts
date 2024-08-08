import type { INativeTagMap, TagType } from './GenericTagTypes.js';
import { CommonTagMapper } from './GenericTagMapper.js';

export class CaseInsensitiveTagMap extends CommonTagMapper {

  public constructor(tagTypes: TagType[], tagMap: INativeTagMap) {

    const upperCaseMap: INativeTagMap = {};
    for (const tag of Object.keys(tagMap)) {
      upperCaseMap[tag.toUpperCase()] = tagMap[tag];
    }

    super(tagTypes, upperCaseMap);
  }

  /**
   * @tag  Native header tag
   * @return common tag name (alias)
   */
  protected getCommonName(tag: string) {
    return this.tagMap[tag.toUpperCase()];
  }

}
