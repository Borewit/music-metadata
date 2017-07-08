import {INativeTagMap} from "../tagmap";

/**
 * ID3v2.3 tag mappings
 */
export const ID3v24TagMap: INativeTagMap = {
  // id3v2.3
  TIT2: 'title',
  TPE1: 'artist',
  'TXXX:Artists': 'artists',
  TPE2: 'albumartist',
  TALB: 'album',
  TDRV: 'date', // [ 'date', 'year' ] ToDo: improve 'year' mapping
  /**
   * Original release year
   */
  TORY: 'originalyear',
  'COMM:description': 'comment',
  TPOS: 'disk',
  TCON: 'genre',
  APIC: 'picture',
  TCOM: 'composer',
  'USLT:description': 'lyrics',
  TSOA: 'albumsort',
  TSOT: 'titlesort',
  TOAL: 'work',
  TSOP: 'artistsort',
  TSO2: 'albumartistsort',
  TSOC: 'composersort',
  TEXT: 'lyricist',
  'TXXX:Writer': 'writer',
  TPE3: 'conductor',
  // 'IPLS:instrument': 'performer:instrument', // ToDo
  TPE4: 'remixer',
  'IPLS:arranger': 'arranger',
  'IPLS:engineer': 'engineer',
  'IPLS:producer': 'producer',
  'IPLS:DJ-mix': 'djmixer',
  'IPLS:mix': 'mixer',
  TPUB: 'label',
  TIT1: 'grouping',
  TIT3: 'subtitle',
  TRCK: 'track',
  TCMP: 'compilation',
  POPM: '_rating',
  TBPM: 'bpm',
  TMED: 'media',
  'TXXX:CATALOGNUMBER': 'catalognumber',
  'TXXX:MusicBrainz Album Status': 'releasestatus',
  'TXXX:MusicBrainz Album Type': 'releasetype',
  /**
   * Release country as documented: https://picard.musicbrainz.org/docs/mappings/#cite_note-0
   */
  'TXXX:MusicBrainz Album Release Country': 'releasecountry',
  /**
   * Release country as implemented // ToDo: report
   */
  'TXXX:RELEASECOUNTRY': 'releasecountry',
  'TXXX:SCRIPT': 'script',
  TLAN: 'language',
  TCOP: 'copyright',
  WCOP: 'license',
  TENC: 'encodedby',
  TSSE: 'encodersettings',
  'TXXX:BARCODE': 'barcode',
  TSRC: 'isrc',
  'TXXX:ASIN': 'asin',
  'TXXX:originalyear': 'originalyear',
  'UFID:http://musicbrainz.org': 'musicbrainz_recordingid',
  'TXXX:MusicBrainz Release Track Id': 'musicbrainz_trackid',
  'TXXX:MusicBrainz Album Id': 'musicbrainz_albumid',
  'TXXX:MusicBrainz Artist Id': 'musicbrainz_artistid',
  'TXXX:MusicBrainz Album Artist Id': 'musicbrainz_albumartistid',
  'TXXX:MusicBrainz Release Group Id': 'musicbrainz_releasegroupid',
  'TXXX:MusicBrainz Work Id': 'musicbrainz_workid',
  'TXXX:MusicBrainz TRM Id': 'musicbrainz_trmid',
  'TXXX:MusicBrainz Disc Id': 'musicbrainz_discid',
  'TXXX:ACOUSTID_ID': 'acoustid_id',
  'TXXX:Acoustid Id': 'acoustid_id',
  'TXXX:Acoustid Fingerprint': 'acoustid_fingerprint',
  'TXXX:MusicIP PUID': 'musicip_puid',
  'TXXX:MusicMagic Fingerprint': 'musicip_fingerprint',
  WOAR: 'website',

  // id3v2.4
  TDRC: 'date', // date YYYY-MM-DD
  TYER: 'year',
  TDOR: 'originaldate',
  // 'TMCL:instrument': 'performer:instrument',
  'TIPL:arranger': 'arranger',
  'TIPL:engineer': 'engineer',
  'TIPL:producer': 'producer',
  'TIPL:DJ-mix': 'djmixer',
  'TIPL:mix': 'mixer',
  TMOO: 'mood',

  // additional mappings:
  SYLT: 'lyrics',

  // Windows Media Player
  'PRIV:AverageLevel' : 'averageLevel',
  'PRIV:PeakLevel' : 'peakLevel'
};
