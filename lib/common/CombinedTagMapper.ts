import { AiffTagMapper } from "../aiff/AiffTagMap.js";
import { APEv2TagMapper } from "../apev2/APEv2TagMapper";
import { AsfTagMapper } from "../asf/AsfTagMapper";
import { ID3v1TagMapper } from "../id3v1/ID3v1TagMap";
import { ID3v22TagMapper } from "../id3v2/ID3v22TagMapper";
import { ID3v24TagMapper } from "../id3v2/ID3v24TagMapper";
import { MatroskaTagMapper } from "../matroska/MatroskaTagMapper";
import { MP4TagMapper } from "../mp4/MP4TagMapper";
import { VorbisTagMapper } from "../ogg/vorbis/VorbisTagMapper";
import { RiffInfoTagMapper } from "../riff/RiffInfoTagMap";

import type { ITag } from "../type";
import type { IGenericTagMapper } from "./GenericTagMapper";
import type { IGenericTag, TagType } from "./GenericTagTypes";
import type { INativeMetadataCollector } from "./INativeMetadataCollector";

export class CombinedTagMapper {
  public tagMappers: Record<string, IGenericTagMapper> = {};

  public constructor() {
    for (const mapper of [
      new ID3v1TagMapper(),
      new ID3v22TagMapper(),
      new ID3v24TagMapper(),
      new MP4TagMapper(),
      new MP4TagMapper(),
      new VorbisTagMapper(),
      new APEv2TagMapper(),
      new AsfTagMapper(),
      new RiffInfoTagMapper(),
      new MatroskaTagMapper(),
      new AiffTagMapper(),
    ]) {
      this.registerTagMapper(mapper);
    }
  }

  /**
   * Convert native to generic (common) tags
   * @param tagType Originating tag format
   * @param tag     Native tag to map to a generic tag id
   * @param warnings
   * @returns Generic tag result (output of this function)
   */
  public mapTag(tagType: TagType, tag: ITag, warnings: INativeMetadataCollector): IGenericTag {
    const tagMapper = this.tagMappers[tagType];
    if (tagMapper) {
      return this.tagMappers[tagType].mapGenericTag(tag, warnings);
    }
    throw new Error("No generic tag mapper defined for tag-format: " + tagType);
  }

  private registerTagMapper(genericTagMapper: IGenericTagMapper) {
    for (const tagType of genericTagMapper.tagTypes) {
      this.tagMappers[tagType] = genericTagMapper;
    }
  }
}
