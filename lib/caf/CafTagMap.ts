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
  'track number': 'track',
  year: 'year',
  composer: 'composer',
  lyricist: 'lyricist',
  genre: 'genre',
  title: 'title',
  'recorded date': 'date',
  comments: 'comment',
  copyright: 'copyright',
  'source encoder': 'encodersettings',
  'encoding application': 'encodedby'
};

const commaSeparatedKeys = new Set(['artist', 'composer', 'lyricist', 'genre']);

export class CafTagMapper extends CommonTagMapper {
  public constructor() {
    super(['CAF'], infoTagMap);
  }

  public mapGenericTag(tag: ITag, warnings: IWarningCollector): IGenericTag | null {
    if (commaSeparatedKeys.has(tag.id) && typeof tag.value === 'string') {
      tag = { id: tag.id, value: tag.value.split(',') };
    }
    return super.mapGenericTag(tag, warnings);
  }
}
