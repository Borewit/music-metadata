import { INativeTagMap } from "../common/GenericTagTypes";
import { CommonTagMapper } from "../common/GenericTagMapper";

/**
 * ID3v1 tag mappings
 */
const id3v1TagMap: INativeTagMap = {
  title: "title",
  artist: "artist",
  album: "album",
  year: "year",
  comment: "comment",
  track: "track",
  genre: "genre",
};

export class ID3v1TagMapper extends CommonTagMapper {
  public constructor() {
    super(["ID3v1"], id3v1TagMap);
  }
}
