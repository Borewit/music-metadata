import { CommonTagMapper } from '../common/GenericTagMapper.js';
import type { IGenericTag, INativeTagMap } from '../common/GenericTagTypes.js';
import type { IWarningCollector } from '../common/MetadataCollector.js';
import type { ITag } from '../type.js';

// "time signature", "nominal bit rate" and "channel layout" have no common
// equivalent and stay native. Undocumented keys are always kept natively too.
const infoTagMap: INativeTagMap = {
  tempo: 'bpm',
  'key signature': 'key',
  artist: 'artist',
  album: 'album',
  'track number': 'trackNumber',
  year: 'year',
  composer: 'composers',
  lyricist: 'lyricists',
  genre: 'genres',
  title: 'title',
  'recorded date': 'date',
  comments: 'comments',
  copyright: 'copyright',
  'source encoder': 'encoderSettings',
  'encoding application': 'encodedBy'
};

const commaSeparatedKeys = new Set(['artist', 'composer', 'lyricist', 'genre']);

export class CafTagMapper extends CommonTagMapper {
  public constructor() {
    super(['CAF'], infoTagMap);
  }

  public mapGenericTag(tag: ITag, warnings: IWarningCollector): IGenericTag | null {
    if (commaSeparatedKeys.has(tag.id) && typeof tag.value === 'string') {
      tag = {
        id: tag.id,
        value: tag.value
          .split(',')
          .map(value => value.trim())
          .filter(value => value.length > 0)
      };
    }
    return super.mapGenericTag(tag, warnings);
  }
}
