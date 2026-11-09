import type { IFooter } from './apev2/APEv2Token.js';
import type { IWmPicture } from './asf/AsfObject.js';
import type { AttributeParser } from './asf/AsfUtil.js';
import type { IChannelDescription } from './caf/CafToken.js';
import type { TagType } from './common/GenericTagTypes.js';
import type {
  ICustomDataTag,
  Chapter as ID3v2Chapter,
  TableOfContents as ID3v2TableOfContents,
  IGeneralEncapsulatedObject,
  IIdentifierTag,
  IPopularimeter
} from './id3v2/FrameParser.js';
import type { LyricsContentType, TimestampFormat } from './id3v2/ID3v2Token.js';
import type { IVorbisPicture } from './ogg/vorbis/Vorbis.js';
import type { IBroadcastAudioExtensionChunk } from './wav/BwfChunk.js';

export { LyricsContentType, TimestampFormat } from './id3v2/ID3v2Token.js';
/** Container-independent track types. Existing Matroska values are preserved. */
export const TrackType = {
  video: 0x01,
  audio: 0x02,
  complex: 0x03,
  logo: 0x04,
  subtitle: 0x11,
  button: 0x12,
  control: 0x20,
  /** Timed metadata (library extension to the Matroska track types). */
  metadata: 0x21
};
export type TrackType = (typeof TrackType)[keyof typeof TrackType];
export type TrackTypeKey = keyof typeof TrackType;
export const TrackTypeValueToKeyMap: Record<TrackType, TrackTypeKey> = {
  [TrackType.video]: 'video',
  [TrackType.audio]: 'audio',
  [TrackType.complex]: 'complex',
  [TrackType.logo]: 'logo',
  [TrackType.subtitle]: 'subtitle',
  [TrackType.button]: 'button',
  [TrackType.control]: 'control',
  [TrackType.metadata]: 'metadata'
};

export type AnyTagValue = unknown;

/**
 * Attached picture, typically used for cover art
 */
export interface IPicture {
  /**
   * Image mime type
   */
  format: string;
  /**
   * Image data
   */
  data: Uint8Array;
  /**
   * Optional description
   */
  description?: string;
  /**
   * Picture type
   */
  type?: string;
  /**
   * File name
   */
  name?: string;
}

/**
 * Abstract interface to access rating information
 */
export interface IRating {
  /**
   * Rating source, could be an e-mail address
   */
  source?: string;
  /**
   * Rating [0..1]
   */
  rating?: number;
}

export interface ICommonTagsResult {
  track: { no: number | null; of: number | null };
  disk: { no: number | null; of: number | null };
  /**
   * Release year
   */
  year?: number;
  /**
   * Track title
   */
  title?: string;
  /**
   * Track, maybe several artists written in a single string.
   */
  artist?: string;
  /**
   * Track artists, aims to capture every artist in a different string.
   */
  artists?: string[];
  /**
   * Track album artist/s. Contains the first album artist if multiple tags exist, or maybe several album artists written in a single string.
   */
  albumartist?: string;
  /**
   * Track album artists, aims to capture every album artist in a different string.
   */
  albumartists?: string[];
  /**
   * Album title
   */
  album?: string;
  /**
   * Date
   */
  date?: string;
  /**
   * Original release date
   */
  originaldate?: string;
  /**
   * Original release year
   */
  originalyear?: number;
  /**
   * Release date
   */
  releasedate?: string;
  /**
   * List of comments
   */
  comment?: IComment[];
  /**
   * Genre
   */
  genre?: string[];
  /**
   * Embedded album art
   */
  picture?: IPicture[];
  /**
   * Track composer
   */
  composer?: string[];
  /**
   * Synchronized lyrics
   */
  lyrics?: ILyricsTag[];
  /**
   * Album title, formatted for alphabetic ordering
   */
  albumsort?: string;
  /**
   * Track title, formatted for alphabetic ordering
   */
  titlesort?: string;
  /**
   * The canonical title of the work
   */
  work?: string;
  /**
   * Track artist, formatted for alphabetic ordering
   */
  artistsort?: string;
  /**
   * Album artist, formatted for alphabetic ordering
   */
  albumartistsort?: string;
  /**
   * Composer, formatted for alphabetic ordering
   */
  composersort?: string;
  /**
   * Lyricist(s)
   */
  lyricist?: string[];
  /**
   * Writer(s)
   */
  writer?: string[];
  /**
   * Conductor(s)
   */
  conductor?: string[];
  /**
   * Remixer(s)
   */
  remixer?: string[];
  /**
   * Arranger(s)
   */
  arranger?: string[];
  /**
   * Engineer(s)
   */
  engineer?: string[];
  /**
   * Publisher(s)
   */
  publisher?: string[];
  /**
   * Producer(s)
   */
  producer?: string[];
  /**
   * Mix-DJ(s)
   */
  djmixer?: string[];
  /**
   * Mixed by
   */
  mixer?: string[];
  technician?: string[];
  label?: string[];
  grouping?: string;
  subtitle?: string[];
  description?: string[];
  longDescription?: string;
  discsubtitle?: string[];
  totaltracks?: string;
  totaldiscs?: string;
  movementTotal?: number;
  compilation?: boolean;
  rating?: IRating[];
  bpm?: number;
  /**
   * Keywords to reflect the mood of the audio, e.g. 'Romantic' or 'Sad'
   */
  mood?: string;
  /**
   * Release format, e.g. 'CD'
   */
  media?: string;
  /**
   * Release catalog number(s)
   */
  catalognumber?: string[];
  /**
   * TV show title
   */
  tvShow?: string;
  /**
   * TV show title, formatted for alphabetic ordering
   */
  tvShowSort?: string;
  /**
   * TV season title sequence number
   */
  tvSeason?: number;
  /**
   * TV Episode sequence number
   */
  tvEpisode?: number;
  /**
   * TV episode ID
   */
  tvEpisodeId?: string;
  /**
   * TV network
   */
  tvNetwork?: string;
  podcast?: boolean;
  podcasturl?: string;
  releasestatus?: string;
  releasetype?: string[];
  releasecountry?: string;
  script?: string;
  language?: string;
  copyright?: string;
  license?: string;
  encodedby?: string;
  encodersettings?: string;
  gapless?: boolean;
  barcode?: string; // ToDo: multiple??
  // International Standard Recording Code
  isrc?: string[];
  asin?: string;
  musicbrainz_recordingid?: string;
  musicbrainz_trackid?: string;
  musicbrainz_albumid?: string;
  musicbrainz_artistid?: string[];
  musicbrainz_albumartistid?: string[];
  musicbrainz_releasegroupid?: string;
  musicbrainz_workid?: string;
  musicbrainz_trmid?: string;
  musicbrainz_discid?: string;
  acoustid_id?: string;
  acoustid_fingerprint?: string;
  musicip_puid?: string;
  musicip_fingerprint?: string;
  website?: string;
  'performer:instrument'?: string[];
  averageLevel?: number;
  peakLevel?: number;
  notes?: string[];
  originalalbum?: string;
  originalartist?: string;
  // Discogs:
  discogs_artist_id?: number[];
  discogs_release_id?: number;
  discogs_label_id?: number;
  discogs_master_release_id?: number;
  discogs_votes?: number;
  discogs_rating?: number;

  /**
   * Track gain ratio [0..1]
   */
  replaygain_track_gain_ratio?: number;
  /**
   * Track peak ratio [0..1]
   */
  replaygain_track_peak_ratio?: number;

  /**
   * Track gain ratio
   */
  replaygain_track_gain?: IRatio;

  /**
   * Track peak ratio
   */
  replaygain_track_peak?: IRatio;

  /**
   * Album gain ratio
   */
  replaygain_album_gain?: IRatio;

  /**
   * Album peak ratio
   */
  replaygain_album_peak?: IRatio;

  /**
   * minimum & maximum global gain values across a set of files scanned as an album
   */
  replaygain_undo?: {
    leftChannel: number;
    rightChannel: number;
  };

  /**
   * minimum & maximum global gain values across a set of file
   */
  replaygain_track_minmax?: number[];

  /**
   * minimum & maximum global gain values across a set of files scanned as an album
   */
  replaygain_album_minmax?: number[];

  /**
   * The initial key of the music in the file, e.g. "A Minor".
   * Ref: https://docs.microsoft.com/en-us/windows/win32/wmformat/wm-initialkey
   */
  key?: string;

  /**
   * Podcast Category
   */
  category?: string[];
  /**
   * iTunes Video Quality
   *
   * 2: Full HD
   * 1: HD
   * 0: SD
   */
  hdVideo?: number;
  /**
   * Podcast Keywords
   */
  keywords?: string[];
  /**
   * Movement
   */
  movement?: string;
  /**
   * Movement Index/Total
   */
  movementIndex: { no: number | null; of: number | null };
  /**
   * Podcast Identifier
   */
  podcastId?: string;
  /**
   * Show Movement
   */
  showMovement?: boolean;
  /**
   * iTunes Media Type
   *
   * 1: Normal
   * 2: Audiobook
   * 6: Music Video
   * 9: Movie
   * 10: TV Show
   * 11: Booklet
   * 14: Ringtone
   *
   * https://github.com/sergiomb2/libmp4v2/wiki/iTunesMetadata#user-content-media-type-stik
   */
  stik?: number;

  playCounter?: number;
}

export interface IRatio {
  /**
   * [0..1]
   */
  ratio: number;

  /**
   * Decibel
   */
  dB: number;
}

export type FormatId = keyof IFormat;

export interface IAudioTrack {
  /** Number of decoded audio samples, when known. */
  numberOfSamples?: number;
  samplingFrequency?: number;
  outputSamplingFrequency?: number;
  channels?: number;
  channelPositions?: Uint8Array;
  bitDepth?: number;
}

export interface IVideoTrack {
  /** Frames per second, when known. */
  frameRate?: number;
  flagInterlaced?: boolean;
  stereoMode?: number;
  pixelWidth?: number;
  pixelHeight?: number;
  displayWidth?: number;
  displayHeight?: number;
  displayUnit?: number;
  aspectRatioType?: number;
  colourSpace?: Uint8Array;
  gammaValue?: number;
}

export interface ITrackInfo {
  /** Container track ID/number, or Ogg logical stream serial number. */
  id?: number;
  type?: TrackType;
  /** Container-specific codec identifier, e.g. 'mp4a' or 'A_AAC'. */
  codecId?: string;
  codecName?: string;
  codecProfile?: string;
  /** Duration in seconds. */
  duration?: number;
  /** Positive, finite encoded track bitrate in bits per second; omitted when unknown. */
  bitrate?: number;
  lossless?: boolean;
  codecSettings?: string;
  flagEnabled?: boolean;
  flagDefault?: boolean;
  /** Track must be displayed even when not explicitly selected (e.g. forced subtitles). */
  flagForced?: boolean;
  flagLacing?: boolean;
  name?: string;
  language?: string;
  audio?: IAudioTrack;
  video?: IVideoTrack;
}

export interface IFormat {
  /** One entry per discovered track, including single-track audio files. */
  readonly trackInfo: ITrackInfo[];

  /**
   * E.g.: 'flac'
   */
  readonly container?: string; // ToDo: make mandatory

  /**
   * List of tags found in parsed audio file
   */
  readonly tagTypes: TagType[];

  /**
   * Duration in seconds
   */
  readonly duration?: number;

  /** Duration of the complete media presentation in seconds, including video. */
  readonly containerDuration?: number;

  /** Average bitrate of the entire file in bits per second, including container overhead. */
  readonly overallBitrate?: number;

  /**
   * Number bits per second of encoded audio file
   */
  readonly bitrate?: number;

  /**
   * Sampling rate in Samples per second (S/s)
   */
  readonly sampleRate?: number;

  /**
   * Audio bit depth
   */
  readonly bitsPerSample?: number;

  /**
   * Encoder brand, e.g.: LAME3.99r
   */
  readonly tool?: string;

  /**
   * Encoder name / compressionType, e.g.: 'PCM', 'ITU-T G.711 mu-law'
   */
  readonly codec?: string;

  /**
   * Codec profile
   */
  readonly codecProfile?: string;

  readonly lossless?: boolean;

  /**
   * Number of audio channels
   */
  readonly numberOfChannels?: number;

  /**
   * Number of samples frames.
   * One sample contains all channels
   * The duration is: numberOfSamples / sampleRate
   */
  readonly numberOfSamples?: number;

  /**
   * 16-byte MD5 of raw audio
   */
  readonly audioMD5?: Uint8Array;

  /**
   * Chapters in audio stream
   */
  readonly chapters?: IChapter[];

  /**
   * Time file was created
   */
  readonly creationTime?: Date;

  /**
   * Time file was modified
   */
  readonly modificationTime?: Date;

  readonly trackGain?: number;
  readonly trackPeakLevel?: number;
  readonly albumGain?: number;

  /**
   * Indicates if the audio files contains an audio stream
   */
  hasAudio?: boolean;

  /**
   * Indicates if the media files contains a video stream
   */
  hasVideo?: boolean;
}

/**
 * A native tag as emitted by a parser.
 */
export interface ITag<TValue = AnyTagValue> {
  id: string;
  value: TValue;
}

/**
 * Native ID3v1 tag values, keyed by tag identifier.
 */
export interface IID3v1NativeTagMap {
  title: string;
  artist: string;
  album: string;
  year: string;
  comment: string;
  track: number;
  genre: string;
}

/**
 * Native ID3v2.2 tag values, keyed by tag identifier.
 */
export interface IID3v22NativeTagMap {
  TT1: string;
  TT2: string;
  TT3: string;
  TP1: string;
  TP2: string;
  TP3: string;
  TP4: string;
  TAL: string;
  TBP: string;
  TCM: string;
  TCO: string;
  TCP: string;
  TCR: string;
  TDA: string;
  TDY: string;
  TEN: string;
  TFT: string;
  TIM: string;
  TKE: string;
  TLA: string;
  TLE: string;
  TMT: string;
  TOA: string;
  TOF: string;
  TOL: string;
  TOR: string;
  TOT: string;
  TPA: string;
  TPB: string;
  TRC: string;
  TRD: string;
  TRK: string;
  TSI: string;
  TSS: string;
  TXT: string;
  TYE: string;
  GP1: string;
  COM: IComment;
  ULT: IComment;
  PIC: IPicture;
  CNT: number;
  IPL: Record<string, string[]>;
  PCS: number;
}

/**
 * Text information frames shared by ID3v2.3 and ID3v2.4.
 *
 * ID3v2 parsers add one native tag per decoded text value, so these values
 * are strings even when the frame itself contains a list.
 */
interface IID3v2TextNativeTagMap {
  TALB: string;
  TBPM: string;
  TCAT: string;
  TCMP: string;
  TCOM: string;
  TCON: string;
  TCOP: string;
  TDAT: string;
  TDEN: string;
  TDES: string;
  TDLY: string;
  TDOR: string;
  TDRC: string;
  TDRL: string;
  TDRV: string;
  TDTG: string;
  TEXT: string;
  TFLT: string;
  TGID: string;
  TIME: string;
  TIT1: string;
  TIT2: string;
  TIT3: string;
  TKEY: string;
  TKWD: string;
  TLAN: string;
  TLEN: string;
  TMED: string;
  TMOO: string;
  TOAL: string;
  TOFN: string;
  TOLY: string;
  TOPE: string;
  TORY: string;
  TOWN: string;
  TPE1: string;
  TPE2: string;
  TPE3: string;
  TPE4: string;
  TPOS: string;
  TPRO: string;
  TPUB: string;
  TRCK: string;
  TRDA: string;
  TRSN: string;
  TRSO: string;
  TSIZ: string;
  TSOA: string;
  TSOC: string;
  TSOP: string;
  TSO2: string;
  TSOT: string;
  TSRC: string;
  TSSE: string;
  TSST: string;
  TYER: string;
  GRP1: string;
  MVIN: string;
  MVNM: string;
  WFD: string;
  WFED: string;
}

/**
 * Structured ID3v2.3 and ID3v2.4 frames shared by both versions.
 */
interface IID3v2CommonNativeTagMap {
  APIC: IPicture;
  COMM: IComment;
  GEOB: IGeneralEncapsulatedObject;
  MCDI: Uint8Array;
  PCNT: number;
  POPM: IPopularimeter;
  PRIV: ICustomDataTag;
  SYLT: ILyricsTag;
  UFID: IIdentifierTag;
  USLT: IComment;
  WCOM: string;
  WCOP: string;
  WOAF: string;
  WOAR: string;
  WOAS: string;
  WORS: string;
  WPAY: string;
  WPUB: string;
  WXXX: { description: string; url: string };
  CHAP: ID3v2Chapter;
  CTOC: ID3v2TableOfContents;
  TXXX: string;

  [id: `TXXX:${string}`]: string;
}

/**
 * Native ID3v2.3 tag values, keyed by tag identifier.
 */
export interface IID3v23NativeTagMap extends IID3v2TextNativeTagMap, IID3v2CommonNativeTagMap {
  IPLS: Record<string, string[]>;
  TIPL: Record<string, string[]>;
  TMCL: Record<string, string[]>;
  PCS: number;
  PCST: number;
}

/**
 * Native ID3v2.4 tag values, keyed by tag identifier.
 */
export interface IID3v24NativeTagMap extends IID3v2TextNativeTagMap, IID3v2CommonNativeTagMap {
  IPLS: Record<string, string[]>;
  TIPL: Record<string, string[]>;
  TMCL: Record<string, string[]>;
  PCS: number;
  PCST: number;
}

/**
 * Native Vorbis comments (also used by FLAC, Opus and Speex).
 * Text values remain strings, including numeric-looking comments.
 */
export type IVorbisNativeTagMap = Record<
  | 'TITLE'
  | 'ARTIST'
  | 'ARTISTS'
  | 'ALBUMARTIST'
  | 'ALBUM ARTIST'
  | 'ALBUM'
  | 'DATE'
  | 'ORIGINALDATE'
  | 'ORIGINALYEAR'
  | 'RELEASEDATE'
  | 'COMMENT'
  | 'DESCRIPTION'
  | 'TRACKNUMBER'
  | 'DISCNUMBER'
  | 'GENRE'
  | 'COMPOSER'
  | 'LYRICS'
  | 'UNSYNCEDLYRICS'
  | 'ALBUMSORT'
  | 'TITLESORT'
  | 'WORK'
  | 'ARTISTSORT'
  | 'ALBUMARTISTSORT'
  | 'COMPOSERSORT'
  | 'LYRICIST'
  | 'WRITER'
  | 'CONDUCTOR'
  | 'REMIXER'
  | 'ARRANGER'
  | 'ENGINEER'
  | 'PRODUCER'
  | 'DJMIXER'
  | 'MIXER'
  | 'LABEL'
  | 'ORGANIZATION'
  | 'PUBLISHER'
  | 'GROUPING'
  | 'SUBTITLE'
  | 'DISCSUBTITLE'
  | 'TRACKTOTAL'
  | 'DISCTOTAL'
  | 'COMPILATION'
  | 'RATING'
  | 'BPM'
  | 'KEY'
  | 'MOOD'
  | 'MEDIA'
  | 'CATALOGNUMBER'
  | 'RELEASESTATUS'
  | 'RELEASETYPE'
  | 'RELEASECOUNTRY'
  | 'SCRIPT'
  | 'LANGUAGE'
  | 'COPYRIGHT'
  | 'LICENSE'
  | 'ENCODEDBY'
  | 'ENCODERSETTINGS'
  | 'BARCODE'
  | 'ISRC'
  | 'ASIN'
  | 'MUSICBRAINZ_TRACKID'
  | 'MUSICBRAINZ_RELEASETRACKID'
  | 'MUSICBRAINZ_ALBUMID'
  | 'MUSICBRAINZ_ARTISTID'
  | 'MUSICBRAINZ_ALBUMARTISTID'
  | 'MUSICBRAINZ_RELEASEGROUPID'
  | 'MUSICBRAINZ_WORKID'
  | 'MUSICBRAINZ_TRMID'
  | 'MUSICBRAINZ_DISCID'
  | 'ACOUSTID_ID'
  | 'ACOUSTID_ID_FINGERPRINT'
  | 'MUSICIP_PUID'
  | 'WEBSITE'
  | 'NOTES'
  | 'TOTALTRACKS'
  | 'TOTALDISCS'
  | 'DISCOGS_ARTIST_ID'
  | 'DISCOGS_ARTISTS'
  | 'DISCOGS_ARTIST_NAME'
  | 'DISCOGS_ALBUM_ARTISTS'
  | 'DISCOGS_CATALOG'
  | 'DISCOGS_COUNTRY'
  | 'DISCOGS_DATE'
  | 'DISCOGS_LABEL'
  | 'DISCOGS_LABEL_ID'
  | 'DISCOGS_MASTER_RELEASE_ID'
  | 'DISCOGS_RATING'
  | 'DISCOGS_RELEASED'
  | 'DISCOGS_RELEASE_ID'
  | 'DISCOGS_VOTES'
  | 'CATALOGID'
  | 'STYLE'
  | 'REPLAYGAIN_TRACK_GAIN'
  | 'REPLAYGAIN_TRACK_PEAK'
  | 'REPLAYGAIN_ALBUM_GAIN'
  | 'REPLAYGAIN_ALBUM_PEAK'
  | 'REPLAYGAIN_MINMAX'
  | 'REPLAYGAIN_ALBUM_MINMAX'
  | 'REPLAYGAIN_UNDO'
  | 'ENCODER'
  | 'COVERART'
  | 'COVERARTMIME',
  string
> & {
  METADATA_BLOCK_PICTURE: IVorbisPicture;
};

/** Binary APEv2 items are emitted as description/data pairs, without a MIME type. */
export interface IAPEv2Picture {
  description: string;
  data: Uint8Array;
}

/**
 * Native APEv2 values. The item datatype, not its name, selects text or binary.
 * Names retain their original casing; unlisted variants remain unknown.
 */
export type IAPEv2NativeTagMap = Record<
  | 'Title'
  | 'Artist'
  | 'Artists'
  | 'Album Artist'
  | 'Album'
  | 'Year'
  | 'Date'
  | 'Originalyear'
  | 'Originaldate'
  | 'Releasedate'
  | 'Comment'
  | 'Track'
  | 'Disc'
  | 'DISCNUMBER'
  | 'Genre'
  | 'Cover Art (Front)'
  | 'Cover Art (Back)'
  | 'Composer'
  | 'Lyrics'
  | 'ALBUMSORT'
  | 'TITLESORT'
  | 'WORK'
  | 'ARTISTSORT'
  | 'ALBUMARTISTSORT'
  | 'COMPOSERSORT'
  | 'Lyricist'
  | 'Writer'
  | 'Conductor'
  | 'MixArtist'
  | 'Arranger'
  | 'Engineer'
  | 'Producer'
  | 'DJMixer'
  | 'Mixer'
  | 'Label'
  | 'Grouping'
  | 'Subtitle'
  | 'DiscSubtitle'
  | 'Compilation'
  | 'BPM'
  | 'Mood'
  | 'Media'
  | 'CatalogNumber'
  | 'MUSICBRAINZ_ALBUMSTATUS'
  | 'MUSICBRAINZ_ALBUMTYPE'
  | 'RELEASECOUNTRY'
  | 'Script'
  | 'Language'
  | 'Copyright'
  | 'LICENSE'
  | 'EncodedBy'
  | 'EncoderSettings'
  | 'Barcode'
  | 'ISRC'
  | 'ASIN'
  | 'musicbrainz_trackid'
  | 'musicbrainz_releasetrackid'
  | 'MUSICBRAINZ_ALBUMID'
  | 'MUSICBRAINZ_ARTISTID'
  | 'MUSICBRAINZ_ALBUMARTISTID'
  | 'MUSICBRAINZ_RELEASEGROUPID'
  | 'MUSICBRAINZ_WORKID'
  | 'MUSICBRAINZ_TRMID'
  | 'MUSICBRAINZ_DISCID'
  | 'Acoustid_Id'
  | 'ACOUSTID_FINGERPRINT'
  | 'MUSICIP_PUID'
  | 'Weblink'
  | 'REPLAYGAIN_TRACK_GAIN'
  | 'REPLAYGAIN_TRACK_PEAK'
  | 'MP3GAIN_MINMAX'
  | 'MP3GAIN_UNDO'
  | 'ENSEMBLE'
  | 'Publisher'
  | 'REPLAYGAIN_ALBUM_GAIN'
  | 'REPLAYGAIN_ALBUM_PEAK',
  string | IAPEv2Picture
>;

/**
 * Native ASF attributes. Except for WM/Picture, the stored datatype determines
 * the value, so even familiar names may contain text, numbers, booleans or bytes.
 */
export type IAsfNativeTagMap = Record<
  | 'Title'
  | 'Author'
  | 'WM/AlbumArtist'
  | 'WM/AlbumTitle'
  | 'WM/Year'
  | 'WM/OriginalReleaseTime'
  | 'WM/OriginalReleaseYear'
  | 'Description'
  | 'WM/TrackNumber'
  | 'TotalTracks'
  | 'WM/PartOfSet'
  | 'WM/Genre'
  | 'WM/Composer'
  | 'WM/Lyrics'
  | 'WM/AlbumSortOrder'
  | 'WM/TitleSortOrder'
  | 'WM/ArtistSortOrder'
  | 'WM/AlbumArtistSortOrder'
  | 'WM/ComposerSortOrder'
  | 'WM/Writer'
  | 'WM/Conductor'
  | 'WM/ModifiedBy'
  | 'WM/Engineer'
  | 'WM/Producer'
  | 'WM/DJMixer'
  | 'WM/Mixer'
  | 'WM/Publisher'
  | 'WM/ContentGroupDescription'
  | 'WM/SubTitle'
  | 'WM/SetSubTitle'
  | 'REPLAYGAIN_TRACK_GAIN'
  | 'REPLAYGAIN_TRACK_PEAK'
  | 'REPLAYGAIN_ALBUM_GAIN'
  | 'REPLAYGAIN_ALBUM_PEAK'
  | 'replaygain_track_gain'
  | 'replaygain_track_peak'
  | 'replaygain_album_gain'
  | 'replaygain_album_peak'
  | 'WM/IsCompilation'
  | 'WM/SharedUserRating'
  | 'POPULARIMETER'
  | 'WM/BeatsPerMinute'
  | 'WM/Mood'
  | 'WM/Media'
  | 'WM/CatalogNo'
  | 'MusicBrainz/Album Status'
  | 'MusicBrainz/Album Type'
  | 'MusicBrainz/Album Release Country'
  | 'WM/Script'
  | 'WM/Language'
  | 'Copyright'
  | 'LICENSE'
  | 'WM/EncodedBy'
  | 'WM/EncodingSettings'
  | 'WM/Barcode'
  | 'WM/ISRC'
  | 'MusicBrainz/Track Id'
  | 'MusicBrainz/Release Track Id'
  | 'MusicBrainz/Album Id'
  | 'MusicBrainz/Artist Id'
  | 'MusicBrainz/Album Artist Id'
  | 'MusicBrainz/Release Group Id'
  | 'MusicBrainz/Work Id'
  | 'MusicBrainz/TRM Id'
  | 'MusicBrainz/Disc Id'
  | 'Acoustid/Id'
  | 'Acoustid/Fingerprint'
  | 'MusicIP/PUID'
  | 'WM/ARTISTS'
  | 'WM/InitialKey'
  | 'ASIN'
  | 'WM/Work'
  | 'WM/AuthorURL'
  | 'Rating'
  | 'WM/Track'
  | 'WM/WMADRCAverageReference'
  | 'WM/WMADRCPeakReference',
  ReturnType<AttributeParser>
> & {
  'WM/Picture': IWmPicture;
};

/**
 * Native MP4/iTunes values, including indexed mdta metadata.
 * The data atom type determines the value, independently of the tag identifier.
 */
export type IITunesNativeTagMap = Record<
  | 'mdta:title'
  | 'mdta:album'
  | 'mdta:artist'
  | 'mdta:album_artist'
  | 'mdta:albumartist'
  | 'mdta:composer'
  | 'mdta:date'
  | 'mdta:comment'
  | 'mdta:description'
  | 'mdta:synopsis'
  | 'mdta:genre'
  | 'mdta:track'
  | 'mdta:disc'
  | 'mdta:publisher'
  | 'mdta:subtitle'
  | 'mdta:language'
  | 'mdta:copyright'
  | 'mdta:encoder'
  | 'mdta:asin'
  | 'mdta:com.apple.quicktime.title'
  | 'mdta:com.apple.quicktime.album'
  | 'mdta:com.apple.quicktime.artist'
  | 'mdta:com.apple.quicktime.creationdate'
  | 'mdta:com.apple.quicktime.comment'
  | 'mdta:com.apple.quicktime.description'
  | 'mdta:com.apple.quicktime.genre'
  | 'mdta:com.apple.quicktime.copyright'
  | '©nam'
  | '©ART'
  | 'aART'
  | '----:com.apple.iTunes:Band'
  | '©alb'
  | '©day'
  | '©cmt'
  | '©com'
  | 'trkn'
  | 'disk'
  | '©gen'
  | 'covr'
  | '©wrt'
  | '©lyr'
  | 'soal'
  | 'sonm'
  | 'soar'
  | 'soaa'
  | 'soco'
  | '----:com.apple.iTunes:LYRICIST'
  | '----:com.apple.iTunes:CONDUCTOR'
  | '----:com.apple.iTunes:REMIXER'
  | '----:com.apple.iTunes:ENGINEER'
  | '----:com.apple.iTunes:PRODUCER'
  | '----:com.apple.iTunes:DJMIXER'
  | '----:com.apple.iTunes:MIXER'
  | '----:com.apple.iTunes:LABEL'
  | '©grp'
  | '----:com.apple.iTunes:SUBTITLE'
  | '----:com.apple.iTunes:DISCSUBTITLE'
  | 'cpil'
  | 'tmpo'
  | '----:com.apple.iTunes:MOOD'
  | '----:com.apple.iTunes:MEDIA'
  | '----:com.apple.iTunes:CATALOGNUMBER'
  | 'tvsh'
  | 'tvsn'
  | 'tves'
  | 'sosn'
  | 'tven'
  | 'tvnn'
  | 'pcst'
  | 'purl'
  | '----:com.apple.iTunes:MusicBrainz Album Status'
  | '----:com.apple.iTunes:MusicBrainz Album Type'
  | '----:com.apple.iTunes:MusicBrainz Album Release Country'
  | '----:com.apple.iTunes:SCRIPT'
  | '----:com.apple.iTunes:LANGUAGE'
  | 'cprt'
  | '©cpy'
  | '----:com.apple.iTunes:LICENSE'
  | '©too'
  | 'pgap'
  | '----:com.apple.iTunes:BARCODE'
  | '----:com.apple.iTunes:ISRC'
  | '----:com.apple.iTunes:ASIN'
  | '----:com.apple.iTunes:NOTES'
  | '----:com.apple.iTunes:MusicBrainz Track Id'
  | '----:com.apple.iTunes:MusicBrainz Release Track Id'
  | '----:com.apple.iTunes:MusicBrainz Album Id'
  | '----:com.apple.iTunes:MusicBrainz Artist Id'
  | '----:com.apple.iTunes:MusicBrainz Album Artist Id'
  | '----:com.apple.iTunes:MusicBrainz Release Group Id'
  | '----:com.apple.iTunes:MusicBrainz Work Id'
  | '----:com.apple.iTunes:MusicBrainz TRM Id'
  | '----:com.apple.iTunes:MusicBrainz Disc Id'
  | '----:com.apple.iTunes:Acoustid Id'
  | '----:com.apple.iTunes:Acoustid Fingerprint'
  | '----:com.apple.iTunes:MusicIP PUID'
  | '----:com.apple.iTunes:fingerprint'
  | '----:com.apple.iTunes:replaygain_track_gain'
  | '----:com.apple.iTunes:replaygain_track_peak'
  | '----:com.apple.iTunes:replaygain_album_gain'
  | '----:com.apple.iTunes:replaygain_album_peak'
  | '----:com.apple.iTunes:replaygain_track_minmax'
  | '----:com.apple.iTunes:replaygain_album_minmax'
  | '----:com.apple.iTunes:replaygain_undo'
  | '----:com.apple.iTunes:Movement Name'
  | '----:com.apple.iTunes:Movement'
  | '----:com.apple.iTunes:Movement Total'
  | '----:com.apple.iTunes:ALBUMARTISTSORT'
  | '----:com.apple.iTunes:ARTISTS'
  | '----:com.apple.iTunes:ORIGINALDATE'
  | '----:com.apple.iTunes:ORIGINALYEAR'
  | '----:com.apple.iTunes:RELEASEDATE'
  | 'desc'
  | 'ldes'
  | '©mvn'
  | '©mvi'
  | '©mvc'
  | '©wrk'
  | 'catg'
  | 'egid'
  | 'hdvd'
  | 'keyw'
  | 'shwm'
  | 'stik'
  | 'rate'
  | '----:com.apple.iTunes:iTunNORM'
  | '----:com.apple.iTunes:iTunSMPB',
  string | number | IPicture
> & {
  /** An out-of-range proprietary genre index can produce undefined. */
  gnre: string | number | IPicture | undefined;
  date: string | number | IPicture;
};

/**
 * Native RIFF INFO text and Broadcast Wave extension fields (under exif).
 */
export type IRiffNativeTagMap = Record<
  | 'IART'
  | 'ICRD'
  | 'INAM'
  | 'TITL'
  | 'IPRD'
  | 'ITRK'
  | 'IPRT'
  | 'COMM'
  | 'ICMT'
  | 'ICOP'
  | 'ICNT'
  | 'GNRE'
  | 'IWRI'
  | 'RATE'
  | 'YEAR'
  | 'ISFT'
  | 'CODE'
  | 'TURL'
  | 'IGNR'
  | 'IENG'
  | 'ITCH'
  | 'IMED'
  | 'IRPD'
  | 'IARL'
  | 'ICMS'
  | 'IKEY'
  | 'ISBJ'
  | 'ISRC',
  string
> & {
  [K in keyof IBroadcastAudioExtensionChunk as `bext.${K}`]-?: IBroadcastAudioExtensionChunk[K];
};

/**
 * Native Matroska tags may contain a string or binary SimpleTag.
 * The segment title and image attachments have distinct value shapes.
 */
export type IMatroskaNativeTagMap = Record<
  | 'album:ARTIST'
  | 'album:ARTISTSORT'
  | 'album:TITLE'
  | 'album:DATE_RECORDED'
  | 'album:DATE_RELEASED'
  | 'album:PART_NUMBER'
  | 'album:TOTAL_PARTS'
  | 'track:ALBUM'
  | 'track:ALBUM_ARTIST'
  | 'track:COMPOSER'
  | 'track:DATE'
  | 'track:DISC'
  | 'track:ARTIST'
  | 'track:ARTISTSORT'
  | 'track:TITLE'
  | 'track:PART_NUMBER'
  | 'track:MUSICBRAINZ_TRACKID'
  | 'track:MUSICBRAINZ_ALBUMID'
  | 'track:MUSICBRAINZ_ARTISTID'
  | 'track:PUBLISHER'
  | 'track:GENRE'
  | 'track:ENCODER'
  | 'track:ENCODER_OPTIONS'
  | 'edition:TOTAL_PARTS',
  string | Uint8Array
> & {
  'segment:title': string;
  picture: IPicture & { name?: string };
};

/**
 * Native AIFF text chunks; each decoded value is emitted separately.
 */
export type IAiffNativeTagMap = Record<'NAME' | 'AUTH' | '(c) ' | 'ANNO', string>;

/**
 * Native CAF information entries and channel-layout chunks.
 * Information entries are literal strings; an info key can also use a layout name,
 * so those keys include string alongside the structured channel-layout value.
 */
export type ICafNativeTagMap = Record<
  | 'tempo'
  | 'key signature'
  | 'artist'
  | 'album'
  | 'track number'
  | 'year'
  | 'composer'
  | 'lyricist'
  | 'genre'
  | 'title'
  | 'recorded date'
  | 'comments'
  | 'copyright'
  | 'source encoder'
  | 'encoding application'
  | 'time signature'
  | 'nominal bit rate'
  | 'channel layout'
  | 'encoder'
  | 'approximate duration in seconds',
  string
> & {
  channelLayoutTag: string | number;
  channelLayoutBitmap: string | number;
  channelLayoutDescriptions: string | IChannelDescription[];
};

/**
 * Maps every supported native tag format to its known identifiers and values.
 * Unknown identifiers remain accessible through INativeTagDict's index signature.
 */
export interface INativeTagTypeMap {
  ID3v1: IID3v1NativeTagMap;
  'ID3v2.2': IID3v22NativeTagMap;
  'ID3v2.3': IID3v23NativeTagMap;
  'ID3v2.4': IID3v24NativeTagMap;
  vorbis: IVorbisNativeTagMap;
  APEv2: IAPEv2NativeTagMap;
  asf: IAsfNativeTagMap;
  iTunes: IITunesNativeTagMap;
  exif: IRiffNativeTagMap;
  matroska: IMatroskaNativeTagMap;
  AIFF: IAiffNativeTagMap;
  CAF: ICafNativeTagMap;
}

/**
 * All currently typed identifiers. Identical names in different formats combine
 * their value types rather than intersecting incompatible types (e.g. COMM).
 * Use a format-specific map when the originating format is known.
 */
export type INativeTagValueMap = {
  [Tag in {
    [K in keyof INativeTagTypeMap]: INativeTag<INativeTagTypeMap[K]>;
  }[keyof INativeTagTypeMap] as Tag['id']]: Tag['value'];
};

/**
 * A native tag whose identifier and value type are derived from a tag map.
 */
export type INativeTag<T extends object = INativeTagValueMap> = {
  [K in keyof T & string]: { id: K; value: T[K] };
}[keyof T & string];

export interface IUrl {
  url: string;
  description: string;
}

export interface IChapter {
  /**
   * Internal chapter reference
   */
  id?: string;

  /**
   * Chapter title; may be empty when the source supplies no title.
   */
  title: string;

  /**
   * URL
   */
  url?: IUrl;

  /**
   * Audio offset in sample number, 0 is the first sample.
   * Duration offset is sampleOffset / format.sampleRate
   */
  sampleOffset?: number;
  /**
   * Timestamp where the chapter starts, in units of timeScale.
   * Convert to seconds with start / (timeScale ?? 1).
   * When timeScale is omitted, start is already in seconds.
   */
  start: number;

  /**
   * Timestamp where the chapter ends, in units of timeScale, when available.
   * Convert to seconds with end / (timeScale ?? 1).
   * When timeScale is omitted, end is already in seconds.
   */
  end?: number;

  /**
   * Number of timestamp units per second for start and end; defaults to 1 when omitted.
   * ID3v2 chapters omit this field and use seconds. QuickTime chapters use their
   * chapter track's timescale; Nero chapters use 10,000,000 units per second.
   * This timescale is independent of the audio sample rate.
   */
  timeScale?: number;

  /**
   * Picture
   */
  image?: IPicture;
}

/**
 * Flat list of tags per tag type.
 *
 * Identifiers remain unrestricted, including custom tags.
 */
export interface INativeTags {
  [tagType: string]: ITag[];
}

/**
 * Tags ordered by tag-ID.
 *
 * Known identifiers expose their specific value type. Unmapped identifiers
 * remain accessible as unknown values.
 */
export type INativeTagDict<T extends object = Record<string, AnyTagValue>> = {
  [K in keyof T]?: T[K][];
} & {
  [tagId: string]: AnyTagValue[];
};

/** Known values grouped by identifier; custom identifiers have unknown values. */
export type ITypedNativeTagDict<T extends object = Record<string, AnyTagValue>> = {
  [K in keyof T]?: T[K][];
} & {
  [tagId: string]: AnyTagValue[] | undefined;
};

/** Dictionaries per native format. Absent formats and identifiers are undefined. */
export type ITypedNativeTags<T extends object = INativeTagTypeMap> = {
  [K in keyof T]?: T[K] extends object ? ITypedNativeTagDict<T[K]> : ITypedNativeTagDict;
} & {
  [tagType: string]: ITypedNativeTagDict | undefined;
};

export interface INativeAudioMetadata<T extends object = INativeTagTypeMap> {
  format: IFormat;
  native: INativeTags;
  /**
   * Lazily groups the current native tags by format and identifier on each access.
   * The dictionaries and value arrays are fresh snapshots; values are not cloned.
   */
  readonly nativeTyped: ITypedNativeTags<T>;
  quality: IQualityInformation;
}

export interface IQualityInformation {
  /**
   * Warnings
   */
  warnings: IParserWarning[];
}

export interface IParserWarning {
  message: string;
}

export interface IAudioMetadata<T extends object = INativeTagTypeMap> extends INativeAudioMetadata<T> {
  /**
   * Metadata, form independent interface
   */
  common: ICommonTagsResult;
}

/**
 * Corresponds with parser module name
 */
export type ParserType =
  | 'mpeg'
  | 'apev2'
  | 'mp4'
  | 'asf'
  | 'flac'
  | 'ogg'
  | 'aiff'
  | 'wavpack'
  | 'riff'
  | 'musepack'
  | 'dsf'
  | 'dsdiff'
  | 'adts'
  | 'matroska'
  | 'caf';

export interface IOptions {
  /**
   * Maximum bytes buffered for a single metadata payload, accumulated Ogg packet, or tokenizer stream lookahead.
   * Defaults to 64 MiB (67108864 bytes). Must be a positive safe integer.
   * Also caps file-type read buffers during media format and cover art MIME-type detection.
   * This is not a limit on total process memory or the size of skipped audio/video data.
   */
  maxMemoryAllocation?: number;

  /**
   * Maximum entries in an individual decoded user metadata list or table.
   * MP4 media indexes and container structures use a separate internal limit of 5000000 entries.
   * Defaults to 100000. Must be a positive safe integer.
   * Independent of maxMemoryAllocation; does not limit total collected metadata or process memory.
   */
  maxMetadataEntries?: number;

  /**
   * default: `false`, if set to `true`, it will parse the whole media file if required to determine the duration.
   */
  duration?: boolean;

  /**
   * default: `false`, if set to `true`, it will skip parsing covers.
   */
  skipCovers?: boolean;

  /**
   * default: `false`, if set to `true`, it will not search all the entire track for additional headers.
   * Only recommenced to use in combination with streams.
   */
  skipPostHeaders?: boolean;

  /**
   * default: `false`, if set to `true`, it will include QuickTime and Nero MP4 chapters.
   * Forward-only streams require the moov box to precede the chapter data.
   */
  includeChapters?: boolean;

  /**
   * Maximum chapters returned for QuickTime/Nero MP4 and ID3v2 chapter lists.
   * Defaults to 1000. Must be a positive safe integer.
   * Excess chapters are omitted with a warning; does not enable MP4 chapter parsing.
   */
  maxChapterCount?: number;

  /**
   * Called synchronously after common tag or format updates. Returned promises are not awaited.
   * Unchanged primitive format values do not trigger a callback.
   */
  observer?: Observer;

  /**
   * In Matroska based files, use the  _SeekHead_ element index to skip _segment/cluster_ elements.
   * By default, disabled
   * Can have a significant performance impact if enabled.
   * Possible side effect can be that certain metadata maybe skipped, depending on the index.
   * If there is no _SeekHead_ element present in the Matroska file, this flag has no effect
   * Ref: https://www.matroska.org/technical/diagram.html
   */
  mkvUseIndex?: boolean;
}

export interface IApeHeader extends IOptions {
  /**
   * Offset of APE-header
   */
  offset: number;

  /**
   * APEv1 / APEv2 header offset
   */
  footer: IFooter;
}

export interface IPrivateOptions extends IOptions {
  apeHeader?: IApeHeader;
}

export interface IMetadataEventTag {
  /**
   * Either `common` if it is a generic tag event, or `format` for format related updates
   */
  type: 'common' | 'format';

  /**
   * Tag id
   */
  id: keyof ICommonTagsResult | FormatId;

  /**
   * Tag value
   */
  value: AnyTagValue;
}

/**
 * Event definition send after each change to common/format metadata change to observer.
 */
export interface IMetadataEvent {
  /**
   * Tag which has been updated.
   */
  tag: IMetadataEventTag;

  /**
   * Metadata model including the attached tag
   */
  metadata: IAudioMetadata;
}

export type Observer = (update: IMetadataEvent) => void;

export interface ILyricsText {
  text: string;
  timestamp?: number;
}

export interface IComment {
  descriptor?: string;
  language?: string;
  text?: string;
}

export interface ILyricsTag extends IComment {
  contentType: LyricsContentType;
  timeStampFormat: TimestampFormat;
  /**
   * Un-synchronized lyrics
   */
  text?: string;
  /**
   * Synchronized lyrics
   */
  syncText: ILyricsText[];
}
