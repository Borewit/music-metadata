import { INativeTagMap } from "../common/GenericTagTypes";
import { CaseInsensitiveTagMap } from "../common/CaseInsensitiveTagMap";

/**
 * ID3v2.2 tag mappings
 */
export const id3v22TagMap: INativeTagMap = {
  TT2: "title",
  TP1: "artist",
  TP2: "albumartist",
  TAL: "album",
  TYE: "year",
  COM: "comment",
  TRK: "track",
  TPA: "disk",
  TCO: "genre",
  PIC: "picture",
  TCM: "composer",

  TOR: "originaldate",
  TOT: "originalalbum",
  TXT: "lyricist",
  TP3: "conductor",
  TPB: "label",
  TT1: "grouping",
  TT3: "subtitle",
  TLA: "language",
  TCR: "copyright",
  WCP: "license",
  TEN: "encodedby",
  TSS: "encodersettings",
  WAR: "website",
  "COM:iTunPGAP": "gapless",
  /* ToDo: iTunes tags:
  'COM:iTunNORM': ,
  'COM:iTunSMPB': 'encoder delay',
  'COM:iTunes_CDDB_IDs'
  */ PCS: "podcast",
  TCP: "compilation",
  TDR: "date",
  TS2: "albumartistsort",
  TSA: "albumsort",
  TSC: "composersort",
  TSP: "artistsort",
  TST: "titlesort",
  WFD: "podcasturl",

  TBP: "bpm",
};

export class ID3v22TagMapper extends CaseInsensitiveTagMap {
  public constructor() {
    super(["ID3v2.2"], id3v22TagMap);
  }
}
