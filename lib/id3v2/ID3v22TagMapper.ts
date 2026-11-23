import { CaseInsensitiveTagMap } from '../common/CaseInsensitiveTagMap.js';
import type { INativeTagMap } from '../common/GenericTagTypes.js';

/**
 * ID3v2.2 tag mappings
 */
export const id3v22TagMap: INativeTagMap = {
  TT2: 'title',
  TP1: 'artist',
  TP2: 'albumArtist',
  TAL: 'album',
  TYE: 'year',
  COM: 'comments',
  ULT: 'lyrics',
  'IPL:arranger': 'arrangers',
  'IPL:engineer': 'engineers',
  'IPL:producer': 'producers',
  'IPL:DJ-mix': 'djMixers',
  'IPL:mix': 'mixers',
  TRK: 'trackNumber',
  TPA: 'discNumber',
  TCO: 'genres',
  PIC: 'picture',
  TCM: 'composers',

  TOR: 'originalDate',
  TOT: 'originalAlbum',
  TXT: 'lyricists',
  TP3: 'conductors',
  TPB: 'labels',
  TT1: 'grouping',
  TT3: 'subtitles',
  TLA: 'language',
  TCR: 'copyright',
  WCP: 'license',
  TEN: 'encodedBy',
  TSS: 'encoderSettings',
  WAR: 'website',

  PCS: 'podcast',
  TCP: 'compilation',
  TDR: 'date',
  TS2: 'albumArtistSort',
  TSA: 'albumSort',
  TSC: 'composerSort',
  TSP: 'artistSort',
  TST: 'titleSort',
  WFD: 'podcastUrl',

  TBP: 'bpm',

  GP1: 'grouping'
};

export class ID3v22TagMapper extends CaseInsensitiveTagMap {
  public constructor() {
    super(['ID3v2.2'], id3v22TagMap);
  }
}
