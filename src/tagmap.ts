import {AsfTagMap} from "./asf/AsfTagMap";
export type HeaderType = 'vorbis' | 'id3v1.1'| 'id3v2.2' | 'id3v2.3' | 'id3v2.4' | 'APEv2' | 'asf' | 'iTunes MP4';

export type CommonTag = 'track' | 'disk' | 'year' | 'title' | 'artist' | 'artists' | 'albumartist' | 'album' | 'date' | 'originaldate' |
  'originalyear' | 'comment' | 'genre' | 'picture' | 'composer' | 'lyrics' | 'albumsort' | 'titlesort' | 'work' |
  'artistsort' | 'albumartistsort' | 'composersort' | 'lyricist' | 'writer' | 'conductor' | 'remixer' |
  'arranger' | 'engineer' | 'producer' | 'djmixer' | 'mixer' | 'label' | 'grouping' | 'subtitle' |
  'discsubtitle' | 'totaltracks' | 'totaldiscs' | 'compilation' | '_rating' | 'bpm' |
  'mood' | 'media' | 'catalognumber' | 'show' | 'showsort' | 'podcast' | 'podcasturl' |
  'releasestatus' | 'releasetype' | 'releasecountry' | 'script' | 'language' |
  'copyright' | 'license' | 'encodedby' | 'encodersettings' | 'gapless' | 'barcode' |
  'isrc' | 'asin' | 'musicbrainz_recordingid' | 'musicbrainz_trackid' | 'musicbrainz_albumid' |
  'musicbrainz_artistid' | 'musicbrainz_albumartistid' | 'musicbrainz_releasegroupid' |
  'musicbrainz_workid' | 'musicbrainz_trmid' | 'musicbrainz_discid' | 'acoustid_id' |
  'acoustid_fingerprint' | 'musicip_puid' | 'musicip_fingerprint' | 'website' | 'performer:instrument' |
  'peakLevel' | 'averageLevel' | 'notes';

export interface INativeTagMap {
  [index: string]: CommonTag;
}

export interface ITagInfo {
  multiple: boolean;
}

export interface ITagInfoMap {
  [index: string]: ITagInfo;
}

interface INativeTagMappings {
  asf: INativeTagMap,
  APEv2: INativeTagMap,
  'id3v1.1': INativeTagMap,
  'id3v2.2': INativeTagMap,
  'id3v2.3': INativeTagMap,
  'id3v2.4': INativeTagMap,
  'iTunes MP4': INativeTagMap,
  vorbis: INativeTagMap
}

/**
 * tagmap maps native meta tags to generic common types
 */
export default class TagMap {

  public static getCommonTag(tag: CommonTag): ITagInfo {
    return TagMap.commonTags[tag];
  }

  public static isCommonTag(tag: string): boolean {
    return TagMap.commonTags[tag] !== undefined;
  }

  /**
   * @param alias Name of common tag
   * @returns {boolean|*} true if given alias is mapped as a singleton', otherwise false
   */
  public static isSingleton(alias: CommonTag): boolean {
    return TagMap.commonTags.hasOwnProperty(alias) && !TagMap.commonTags[alias].multiple;
  }

  private static commonTags: ITagInfoMap =
  {
    year: {multiple: false},
    track: {multiple: false},
    disk: {multiple: false},

    title: {multiple: false},
    artist: {multiple: false},
    artists: {multiple: true},
    albumartist: {multiple: false},
    album: {multiple: false},
    date: {multiple: false},
    originaldate: {multiple: false},
    originalyear: {multiple: false},
    comment: {multiple: true},
    genre: {multiple: true},
    picture: {multiple: true},
    composer: {multiple: true},
    lyrics: {multiple: true},
    albumsort: {multiple: false},
    titlesort: {multiple: false},
    work: {multiple: false},
    artistsort: {multiple: false},
    albumartistsort: {multiple: false},
    composersort: {multiple: true},
    lyricist: {multiple: true},
    writer: {multiple: true},
    conductor: {multiple: true},
    remixer: {multiple: true},
    arranger: {multiple: true},
    engineer: {multiple: true},
    producer: {multiple: true},
    djmixer: {multiple: true},
    mixer: {multiple: true},
    label: {multiple: false},
    grouping: {multiple: false},
    subtitle: {multiple: false},
    discsubtitle: {multiple: false},
    totaltracks: {multiple: false},
    totaldiscs: {multiple: false},
    compilation: {multiple: false},
    _rating: {multiple: false},
    bpm: {multiple: false},
    mood: {multiple: false},
    media: {multiple: false},
    catalognumber: {multiple: false},
    show: {multiple: false},
    showsort: {multiple: false},
    podcast: {multiple: false},
    podcasturl: {multiple: false},
    releasestatus: {multiple: false},
    releasetype: {multiple: true},
    releasecountry: {multiple: false},
    script: {multiple: false},
    language: {multiple: false},
    copyright: {multiple: false},
    license: {multiple: false},
    encodedby: {multiple: false},
    encodersettings: {multiple: false},
    gapless: {multiple: false},
    barcode: {multiple: false},
    isrc: {multiple: false},
    asin: {multiple: false},
    musicbrainz_recordingid: {multiple: false},
    musicbrainz_trackid: {multiple: false},
    musicbrainz_albumid: {multiple: false},
    musicbrainz_artistid: {multiple: true},
    musicbrainz_albumartistid: {multiple: true},
    musicbrainz_releasegroupid: {multiple: false},
    musicbrainz_workid: {multiple: false},
    musicbrainz_trmid: {multiple: false},
    musicbrainz_discid: {multiple: false},
    acoustid_id: {multiple: false},
    acoustid_fingerprint: {multiple: false},
    musicip_puid: {multiple: false},
    musicip_fingerprint: {multiple: false},
    website: {multiple: false},
    'performer:instrument': {multiple: true},
    averageLevel: {multiple: false},
    peakLevel: {multiple: false},
    notes: {multiple: true},

    key: {multiple: false}
  };

  /**
   * Mapping from native header format to one or possibly more 'common' entries
   * The common entries aim to read the same information from different media files
   * independent of the underlying format
   */
  private static vorbis: INativeTagMap = {
    TITLE: 'title',
    ARTIST: 'artist',
    ARTISTS: 'artists',
    ALBUMARTIST: 'albumartist',
    ALBUM: 'album',
    DATE: 'date',
    ORIGINALDATE: 'originaldate',
    ORIGINALYEAR: 'originalyear',
    COMMENT: 'comment',
    TRACKNUMBER: 'track',
    DISCNUMBER: 'disk',
    GENRE: 'genre',
    METADATA_BLOCK_PICTURE: 'picture',
    COMPOSER: 'composer',
    LYRICS: 'lyrics',
    ALBUMSORT: 'albumsort',
    TITLESORT: 'titlesort',
    WORK: 'work',
    ARTISTSORT: 'artistsort',
    ALBUMARTISTSORT: 'albumartistsort',
    COMPOSERSORT: 'composersort',
    LYRICIST: 'lyricist',
    WRITER: 'writer',
    CONDUCTOR: 'conductor',
    // 'PERFORMER=artist (instrument)': 'performer:instrument', // ToDo
    REMIXER: 'remixer',
    ARRANGER: 'arranger',
    ENGINEER: 'engineer',
    PRODUCER: 'producer',
    DJMIXER: 'djmixer',
    MIXER: 'mixer',
    LABEL: 'label',
    GROUPING: 'grouping',
    SUBTITLE: 'subtitle',
    DISCSUBTITLE: 'discsubtitle',
    TRACKTOTAL: 'totaltracks',
    DISCTOTAL: 'totaldiscs',
    COMPILATION: 'compilation',
    'RATING:user@email': '_rating',
    BPM: 'bpm',
    MOOD: 'mood',
    MEDIA: 'media',
    CATALOGNUMBER: 'catalognumber',
    RELEASESTATUS: 'releasestatus',
    RELEASETYPE: 'releasetype',
    RELEASECOUNTRY: 'releasecountry',
    SCRIPT: 'script',
    LANGUAGE: 'language',
    COPYRIGHT: 'copyright',
    LICENSE: 'license',
    ENCODEDBY: 'encodedby',
    ENCODERSETTINGS: 'encodersettings',
    BARCODE: 'barcode',
    ISRC: 'isrc',
    ASIN: 'asin',
    MUSICBRAINZ_TRACKID: 'musicbrainz_recordingid',
    MUSICBRAINZ_RELEASETRACKID: 'musicbrainz_trackid',
    MUSICBRAINZ_ALBUMID: 'musicbrainz_albumid',
    MUSICBRAINZ_ARTISTID: 'musicbrainz_artistid',
    MUSICBRAINZ_ALBUMARTISTID: 'musicbrainz_albumartistid',
    MUSICBRAINZ_RELEASEGROUPID: 'musicbrainz_releasegroupid',
    MUSICBRAINZ_WORKID: 'musicbrainz_workid',
    MUSICBRAINZ_TRMID: 'musicbrainz_trmid',
    MUSICBRAINZ_DISCID: 'musicbrainz_discid',
    ACOUSTID_ID: 'acoustid_id',
    ACOUSTID_FINGERPRINT: 'acoustid_fingerprint',
    MUSICIP_PUID: 'musicip_puid',
    // 'FINGERPRINT=MusicMagic Fingerprint {fingerprint}': 'musicip_fingerprint', // ToDo
    WEBSITE: 'website',
    NOTES: 'notes',
    TOTALTRACKS: 'totaltracks',
    TOTALDISCS: 'totaldiscs'
  };

  private static id3v1_1: INativeTagMap = {
    title: 'title',
    artist: 'artist',
    album: 'album',
    year: 'year',
    comment: 'comment',
    track: 'track',
    genre: 'genre'
  };

  private static id3v2_2: INativeTagMap = {
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

  private static id3v2_3: INativeTagMap = {
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
  // ToDo: capitalization tricky
  private static ape: INativeTagMap = {
    // MusicBrainz tag mappings:
    Title: 'title',
    Artist: 'artist',
    Artists: 'artists',
    'Album Artist': 'albumartist',
    Album: 'album',
    Year: 'date',
    Originalyear: 'originalyear',
    Originaldate: 'originaldate',
    Comment: 'comment',
    Track: 'track',
    Disc: 'disk',
    DISCNUMBER: 'disk', // ToDo: backwards compatibility', valid tag?
    Genre: 'genre',
    'Cover Art (Front)': 'picture',
    'Cover Art (Back)': 'picture',
    Composer: 'composer',
    Lyrics: 'lyrics',
    ALBUMSORT: 'albumsort',
    TITLESORT: 'titlesort',
    WORK: 'work',
    ARTISTSORT: 'artistsort',
    ALBUMARTISTSORT: 'albumartistsort',
    COMPOSERSORT: 'composersort',
    Lyricist: 'lyricist',
    Writer: 'writer',
    Conductor: 'conductor',
    // 'Performer=artist (instrument)': 'performer:instrument',
    MixArtist: 'remixer',
    Arranger: 'arranger',
    Engineer: 'engineer',
    Producer: 'producer',
    DJMixer: 'djmixer',
    Mixer: 'mixer',
    Label: 'label',
    Grouping: 'grouping',
    Subtitle: 'subtitle',
    DiscSubtitle: 'discsubtitle',
    Compilation: 'compilation',
    BPM: 'bpm',
    Mood: 'mood',
    Media: 'media',
    CatalogNumber: 'catalognumber',
    MUSICBRAINZ_ALBUMSTATUS: 'releasestatus',
    MUSICBRAINZ_ALBUMTYPE: 'releasetype',
    RELEASECOUNTRY: 'releasecountry',
    Script: 'script',
    Language: 'language',
    Copyright: 'copyright',
    LICENSE: 'license',
    EncodedBy: 'encodedby',
    EncoderSettings: 'encodersettings',
    Barcode: 'barcode',
    ISRC: 'isrc',
    ASIN: 'asin',
    MUSICBRAINZ_TRACKID: 'musicbrainz_recordingid',
    MUSICBRAINZ_RELEASETRACKID: 'musicbrainz_trackid',
    MUSICBRAINZ_ALBUMID: 'musicbrainz_albumid',
    MUSICBRAINZ_ARTISTID: 'musicbrainz_artistid',
    MUSICBRAINZ_ALBUMARTISTID: 'musicbrainz_albumartistid',
    MUSICBRAINZ_RELEASEGROUPID: 'musicbrainz_releasegroupid',
    MUSICBRAINZ_WORKID: 'musicbrainz_workid',
    MUSICBRAINZ_TRMID: 'musicbrainz_trmid',
    MUSICBRAINZ_DISCID: 'musicbrainz_discid',
    ACOUSTID_ID: 'acoustid_id',
    ACOUSTID_FINGERPRINT: 'acoustid_fingerprint',
    MUSICIP_PUID: 'musicip_puid',
    Weblink: 'website'
  };

  private static iTunes_MP4: INativeTagMap = {
    '©nam': 'title',
    '©ART': 'artist',
    aART: 'albumartist',
    /**
     * ToDo: Album artist seems to be stored here while Picard documentation says: aART
     */
    '----:com.apple.iTunes:Band': 'albumartist',
    '©alb': 'album',
    '©day': 'date',
    '©cmt': 'comment',
    trkn: 'track',
    disk: 'disk',
    '©gen': 'genre',
    covr: 'picture',
    '©wrt': 'composer',
    '©lyr': 'lyrics',
    soal: 'albumsort',
    sonm: 'titlesort',
    soar: 'artistsort',
    soaa: 'albumartistsort',
    soco: 'composersort',
    '----:com.apple.iTunes:LYRICIST': 'lyricist',
    '----:com.apple.iTunes:CONDUCTOR': 'conductor',
    '----:com.apple.iTunes:REMIXER': 'remixer',
    '----:com.apple.iTunes:ENGINEER': 'engineer',
    '----:com.apple.iTunes:PRODUCER': 'producer',
    '----:com.apple.iTunes:DJMIXER': 'djmixer',
    '----:com.apple.iTunes:MIXER': 'mixer',
    '----:com.apple.iTunes:LABEL': 'label',
    '©grp': 'grouping',
    '----:com.apple.iTunes:SUBTITLE': 'subtitle',
    '----:com.apple.iTunes:DISCSUBTITLE': 'discsubtitle',
    cpil: 'compilation',
    tmpo: 'bpm',
    '----:com.apple.iTunes:MOOD': 'mood',
    '----:com.apple.iTunes:MEDIA': 'media',
    '----:com.apple.iTunes:CATALOGNUMBER': 'catalognumber',
    tvsh: 'show',
    sosn: 'showsort',
    pcst: 'podcast',
    purl: 'podcasturl',
    '----:com.apple.iTunes:MusicBrainz Album Status': 'releasestatus',
    '----:com.apple.iTunes:MusicBrainz Album Type': 'releasetype',
    '----:com.apple.iTunes:MusicBrainz Album Release Country': 'releasecountry',
    '----:com.apple.iTunes:SCRIPT': 'script',
    '----:com.apple.iTunes:LANGUAGE': 'language',
    cprt: 'copyright',
    '----:com.apple.iTunes:LICENSE': 'license',
    '©too': 'encodedby',
    pgap: 'gapless',
    '----:com.apple.iTunes:BARCODE': 'barcode',
    '----:com.apple.iTunes:ISRC': 'isrc',
    '----:com.apple.iTunes:ASIN': 'asin',
    '----:com.apple.iTunes:MusicBrainz Track Id': 'musicbrainz_recordingid',
    '----:com.apple.iTunes:MusicBrainz Release Track Id': 'musicbrainz_trackid',
    '----:com.apple.iTunes:MusicBrainz Album Id': 'musicbrainz_albumid',
    '----:com.apple.iTunes:MusicBrainz Artist Id': 'musicbrainz_artistid',
    '----:com.apple.iTunes:MusicBrainz Album Artist Id': 'musicbrainz_albumartistid',
    '----:com.apple.iTunes:MusicBrainz Release Group Id': 'musicbrainz_releasegroupid',
    '----:com.apple.iTunes:MusicBrainz Work Id': 'musicbrainz_workid',
    '----:com.apple.iTunes:MusicBrainz TRM Id': 'musicbrainz_trmid',
    '----:com.apple.iTunes:MusicBrainz Disc Id': 'musicbrainz_discid',
    '----:com.apple.iTunes:Acoustid Id': 'acoustid_id',
    '----:com.apple.iTunes:Acoustid Fingerprint': 'acoustid_fingerprint',
    '----:com.apple.iTunes:MusicIP PUID': 'musicip_puid',
    '----:com.apple.iTunes:fingerprint': 'musicip_fingerprint',
    // Additional mappings:
    gnre: 'genre', // ToDo: check mapping

    '----:com.apple.iTunes:ALBUMARTISTSORT': 'albumartistsort',
    '----:com.apple.iTunes:ARTISTS': 'artists',
    '----:com.apple.iTunes:ORIGINALDATE': 'originaldate',
    '----:com.apple.iTunes:ORIGINALYEAR': 'originalyear'
    // '----:com.apple.iTunes:PERFORMER': 'performer'
  };

  private static capitalizeTags(map: INativeTagMap): INativeTagMap {
    const newMap: INativeTagMap = {};
    for (const tag in map) {
      if (map.hasOwnProperty(tag)) {
        newMap[tag.toUpperCase()] = map[tag];
      }
    }
    return newMap;
  }

  private mappings: INativeTagMappings;

  constructor() {
    // Normalize (post-process) common tag mappings
    this.mappings = {
      // capitalize 'APEv2' tags for case insensitive tag matching
      asf: AsfTagMap,
      APEv2: TagMap.capitalizeTags(TagMap.ape),
      'id3v1.1': TagMap.id3v1_1,
      'id3v2.2': TagMap.id3v2_2,
      'id3v2.3': TagMap.id3v2_3,
      'id3v2.4': TagMap.id3v2_3,
      'iTunes MP4': TagMap.iTunes_MP4,
      vorbis: TagMap.vorbis
    };

    this.mappings.APEv2 = TagMap.capitalizeTags(this.mappings.APEv2);

    this.mappings['id3v2.3'] = this.mappings['id3v2.4'];
  }

  /**
   * Test if native tag headerType is a singleton
   * @param type e.g.: 'iTunes MP4' | 'asf' | 'id3v1.1' | 'id3v2.4' | 'vorbis'
   * @param  tag Native tag name', e.g. 'TITLE'
   * @returns {boolean} true is we can safely assume that it is a  singleton
   */
  public isNativeSingleton(type, tag): boolean {
    switch (type) {
      case 'format':
        return true;
      case 'id3v2.3':
        switch (tag) {
          case 'IPLS':
            return true;
        }
      case 'id3v2.4':
        switch (tag) {
          case 'TIPL':
          case 'TMCL':
            return true;
        }
    }
    const alias = this.getCommonName(type, tag);
    return alias && !TagMap.commonTags[alias].multiple;
  }

  /**
   * @headerType Native header headerType: e.g.: 'm4a' | 'asf' | 'id3v1.1' | 'vorbis'
   * @tag  Native header tag
   * @return common tag name (alias)
   */
  public getCommonName(type: HeaderType, tag: string): CommonTag {
    if (!this.mappings[type]) {
      throw new Error('Illegal header headerType: ' + type);
    }
    return this.mappings[type][type === 'APEv2' ? tag.toUpperCase() : tag];
  }
}
