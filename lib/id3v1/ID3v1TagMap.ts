import { CommonTagMapper } from '../common/GenericTagMapper.js';
import type { INativeTagMap } from '../common/GenericTagTypes.js';

/**
 * ID3v1 tag mappings
 */
const id3v1TagMap: INativeTagMap = {
  title: 'title',
  artist: 'artist',
  album: 'album',
  year: 'year',
  comment: 'comments',
  track: 'trackNumber',
  genre: 'genres'
};

export class ID3v1TagMapper extends CommonTagMapper {
  public constructor() {
    super(['ID3v1'], id3v1TagMap);
  }
}
