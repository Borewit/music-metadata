import { INativeTagMap } from '../common/GenericTagTypes.js';
import { CommonTagMapper } from '../common/GenericTagMapper.js';

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

