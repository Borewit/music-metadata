import { CommonTagMapper } from '../common/GenericTagMapper.js';
import type { INativeTagMap } from '../common/GenericTagTypes.js';

// "time signature", "nominal bit rate" and "channel layout" have no common
// equivalent and stay native. Undocumented keys are always kept natively too.
// Values may hold comma separated values, so they are never split.
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

export class CafTagMapper extends CommonTagMapper {
  public constructor() {
    super(['CAF'], infoTagMap);
  }
}
