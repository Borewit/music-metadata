import {ID3v1TagMapper} from "../id3v1/ID3v1TagMap";
import {ICommonTagsResult, ITag} from "../index";
import {ID3v24TagMapper} from "../id3v2/ID3v24TagMapper";
import {AsfTagMapper} from "../asf/AsfTagMapper";
import {TagType} from "./GenericTagTypes";
import {ID3v22TagMapper} from "../id3v2/ID3v22TagMapper";
import {APEv2TagMapper} from "../apev2/APEv2TagMapper";
import {IGenericTagMapper} from "./GenericTagMapper";
import {MP4TagMapper} from "../mp4/MP4TagMapper";
import {VorbisTagMapper} from "../vorbis/VorbisTagMapper";
import {RiffInfoTagMapper} from "../riff/RiffInfoTagMap";


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
   * Process and set common tags
   * @param comTags Target metadata to
   * write common tags to
   * @param comTags Generic tag results (output of this function)
   * @param tag     Native tag
   */
  public setGenericTag(comTags: ICommonTagsResult, tagType: TagType, tag: ITag) {
    const tagMapper = this.tagMappers[tagType];
    if (tagMapper) {
      this.tagMappers[tagType].setGenericTag(comTags, tag);
    } else {
      throw new Error("No generic tag mapper defined for tag-format: " + tagType);
    }
  }

  private registerTagMapper(genericTagMapper: IGenericTagMapper) {
    for (const tagType of genericTagMapper.tagTypes) {
      this.tagMappers[tagType] = genericTagMapper;
    }
  }
}