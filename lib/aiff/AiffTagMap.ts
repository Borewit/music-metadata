import { INativeTagMap } from '../common/GenericTagTypes';
import { CommonTagMapper } from '../common/GenericTagMapper';

/**
 * ID3v1 tag mappings
 */
const tagMap: INativeTagMap = {
  NAME: 'title',
  AUTH: 'artist',
  '(c) ': 'copyright',
  ANNO: 'comment'
};

export class AiffTagMapper extends CommonTagMapper {

  public constructor() {
    super(['AIFF'], tagMap);
  }
}

