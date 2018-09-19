import {ID3v1TagMapper} from "../id3v1/ID3v1TagMap";
import {ID3v24TagMapper} from "../id3v2/ID3v24TagMapper";
import {AsfTagMapper} from "../asf/AsfTagMapper";
import {IGenericTag, TagType} from "./GenericTagTypes";
import {ID3v22TagMapper} from "../id3v2/ID3v22TagMapper";
import {APEv2TagMapper} from "../apev2/APEv2TagMapper";
import {IGenericTagMapper} from "./GenericTagMapper";
import {MP4TagMapper} from "../mp4/MP4TagMapper";
import {VorbisTagMapper} from "../ogg/vorbis/VorbisTagMapper";
import {RiffInfoTagMapper} from "../riff/RiffInfoTagMap";
import {ITag} from "../type";

export class CombinedTagMapper {

  public tagMappers: { [index: string]: IGenericTagMapper } = {};

  public constructor() {
    [
      new ID3v1TagMapper(),
      new ID3v22TagMapper(),
      new ID3v24TagMapper(),
      new MP4TagMapper(),
      new MP4TagMapper(),
      new VorbisTagMapper(),
      new APEv2TagMapper(),
      new AsfTagMapper(),
      new RiffInfoTagMapper()
    ].forEach(mapper => {
      this.registerTagMapper(mapper);
    });
  }

  /**
   * Convert native to generic (common) tags
   * @param tagType Originating tag format
   * @param tag     Native tag to map to a generic tag id
   * @return Generic tag result (output of this function)
   */
  public mapTag(tagType: TagType, tag: ITag): IGenericTag {
    const tagMapper = this.tagMappers[tagType];
    if (tagMapper) {
      return this.tagMappers[tagType].mapGenericTag(tag);
    }
    throw new Error("No generic tag mapper defined for tag-format: " + tagType);
  }

  private registerTagMapper(genericTagMapper: IGenericTagMapper) {
    for (const tagType of genericTagMapper.tagTypes) {
      this.tagMappers[tagType] = genericTagMapper;
    }
  }
}
