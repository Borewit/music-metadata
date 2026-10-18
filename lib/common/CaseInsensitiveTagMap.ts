import { CommonTagMapper } from './GenericTagMapper.js';
import type { INativeTagMap, TagType } from './GenericTagTypes.js';

export class CaseInsensitiveTagMap extends CommonTagMapper {
  public constructor(tagTypes: TagType[], tagMap: INativeTagMap) {
    const upperCaseMap: INativeTagMap = {};
    for (const [tag, commonName] of Object.entries(tagMap)) {
      upperCaseMap[tag.toUpperCase()] = commonName;
    }

    super(tagTypes, upperCaseMap);
  }

  /**
   * @tag  Native header tag
   * @return common tag name (alias)
   */
  protected getCommonName(tag: string) {
    return super.getCommonName(tag.toUpperCase());
  }
}
