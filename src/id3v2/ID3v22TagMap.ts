import {INativeTagMap} from "../tagmap";

/**
 * ID3v2.2 tag mappings
 */
export const ID3v22TagMap: INativeTagMap = {
  TT2: 'title',
  TP1: 'artist',
  TP2: 'albumartist',
  TAL: 'album',
  TYE: 'year',
  COM: 'comment',
  TRK: 'track',
  TPA: 'disk',
  TCO: 'genre',
  PIC: 'picture',
  TCM: 'composer',

  TOR: 'originaldate',
  TOT: 'work',
  TXT: 'lyricist',
  TP3: 'conductor',
  TPB: 'label',
  TT1: 'grouping',
  TT3: 'subtitle',
  TLA: 'language',
  TCR: 'copyright',
  WCP: 'license',
  TEN: 'encodedby',
  TSS: 'encodersettings',
  WAR: 'website'
};
