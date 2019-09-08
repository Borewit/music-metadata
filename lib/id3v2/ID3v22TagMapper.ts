import {INativeTagMap} from '../common/GenericTagTypes';
import {CommonTagMapper} from '../common/GenericTagMapper';

/**
 * ID3v2.2 tag mappings
 */
export const id3v22TagMap: INativeTagMap = {
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
  WAR: 'website',
  'COM:iTunPGAP': 'gapless'
  /* ToDo: iTunes tags:
  'COM:iTunNORM': ,
  'COM:iTunSMPB': 'encoder delay',
  'COM:iTunes_CDDB_IDs'
  */
};

export class ID3v22TagMapper extends CommonTagMapper {

  public constructor() {
    super(['ID3v2.2'], id3v22TagMap);
  }
}
