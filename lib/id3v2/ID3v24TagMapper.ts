import { UINT32_LE } from 'token-types';
import { CaseInsensitiveTagMap } from '../common/CaseInsensitiveTagMap.js';
import { CommonTagMapper } from '../common/GenericTagMapper.js';
import type { INativeTagMap } from '../common/GenericTagTypes.js';
import type { INativeMetadataCollector } from '../common/MetadataCollector.js';
import { decodeString } from '../common/Util.js';
import type { IRating, ITag } from '../type.js';
import type { ICustomDataTag, IIdentifierTag, IPopularimeter } from './FrameParser.js';

/**
 * ID3v2.3/ID3v2.4 tag mappings
 */
export const id3v24TagMap: INativeTagMap = {
  'TXXX:MusicBrainz Composer Id': 'mbComposerId',
  'TXXX:MusicBrainz Original Artist Id': 'mbOriginalArtistId',
  'TXXX:MusicBrainz Original Album Id': 'mbOriginalReleaseId',
  'TXXX:DIRECTOR': 'directors',
  TOFN: 'originalFilename',
  'TXXX:iTunes_CDDB_1': 'itunesCddb1',
  'TXXX:REPLAYGAIN_ALBUM_RANGE': 'replayGainAlbumRange',
  'TXXX:REPLAYGAIN_TRACK_RANGE': 'replayGainTrackRange',
  'TXXX:REPLAYGAIN_REFERENCE_LOUDNESS': 'replayGainReferenceLoudness',
  'TXXX:WORK': 'work',
  'TXXX:TECHNICIAN': 'technicians',
  'TXXX:LONGDESCRIPTION': 'longDescription',
  'TXXX:TVSHOW': 'tvShow',
  'TXXX:TVSHOWSORT': 'tvShowSort',
  'TXXX:TVSEASON': 'tvSeason',
  'TXXX:TVEPISODE': 'tvEpisode',
  'TXXX:TVEPISODEID': 'tvEpisodeId',
  'TXXX:TVNETWORK': 'tvNetwork',
  'TXXX:GAPLESS': 'gapless',
  'TXXX:PERFORMER': 'performer:instrument',
  'TXXX:PERFORMER:INSTRUMENT': 'performer:instrument',
  'TXXX:NOTES': 'notes',
  'TXXX:HDVIDEO': 'hdVideo',
  'TXXX:SHOWMOVEMENT': 'showMovement',
  'TXXX:STIK': 'stik',
  // id3v2.3
  TIT2: 'title',
  TPE1: 'artist',
  'TXXX:Artists': 'artists',
  TPE2: 'albumArtist',
  TALB: 'album',
  TDRV: 'date', // [ 'date', 'year' ] ToDo: improve 'year' mapping
  /**
   * Original release year
   */
  TORY: 'originalYear',
  TPOS: 'discNumber',
  TCON: 'genres',
  APIC: 'picture',
  TCOM: 'composers',
  USLT: 'lyrics',
  TSOA: 'albumSort',
  TSOT: 'titleSort',
  TOAL: 'originalAlbum',
  TSOP: 'artistSort',
  TSO2: 'albumArtistSort',
  TSOC: 'composerSort',
  TEXT: 'lyricists',
  'TXXX:Writer': 'writers',
  TPE3: 'conductors',
  TPE4: 'remixers',
  'IPLS:arranger': 'arrangers',
  'IPLS:engineer': 'engineers',
  'IPLS:producer': 'producers',
  'IPLS:DJ-mix': 'djMixers',
  'IPLS:mix': 'mixers',
  TPUB: 'labels',
  TIT1: 'grouping',
  TIT3: 'subtitles',
  TRCK: 'trackNumber',
  TCMP: 'compilation',
  POPM: 'rating',
  TBPM: 'bpm',
  TMED: 'media',
  'TXXX:CATALOGNUMBER': 'catalogNumber',
  'TXXX:MusicBrainz Album Status': 'releaseStatus',
  'TXXX:MusicBrainz Album Type': 'releaseType',
  /**
   * Release country as documented: https://picard.musicbrainz.org/docs/mappings/#cite_note-0
   */
  'TXXX:MusicBrainz Album Release Country': 'releaseCountry',
  /**
   * Release country as implemented // ToDo: report
   */
  'TXXX:RELEASECOUNTRY': 'releaseCountry',
  'TXXX:SCRIPT': 'script',
  TLAN: 'language',
  TCOP: 'copyright',
  'TXXX:LICENSE': 'license',
  'TXXX:ALBUMARTISTS': 'albumArtists',
  WCOP: 'license',
  TENC: 'encodedBy',
  TSSE: 'encoderSettings',
  'TXXX:BARCODE': 'barcode',
  'TXXX:ISRC': 'isrcs',
  TSRC: 'isrcs',
  'TXXX:ASIN': 'asin',
  'TXXX:originalyear': 'originalYear',
  'UFID:http://musicbrainz.org': 'mbRecordingId',
  'TXXX:MusicBrainz Release Track Id': 'mbReleaseTrackId',
  'TXXX:MusicBrainz Album Id': 'mbReleaseId',
  'TXXX:MusicBrainz Artist Id': 'mbArtistId',
  'TXXX:MusicBrainz Album Artist Id': 'mbAlbumArtistId',
  'TXXX:MusicBrainz Release Group Id': 'mbReleaseGroupId',
  'TXXX:MusicBrainz Work Id': 'mbWorkId',
  'TXXX:MusicBrainz TRM Id': 'mbTrmId',
  'TXXX:MusicBrainz Disc Id': 'mbDiscId',
  'TXXX:ACOUSTID_ID': 'acoustId',
  'TXXX:Acoustid Id': 'acoustId',
  'TXXX:Acoustid Fingerprint': 'acoustIdFingerprint',
  'TXXX:MusicIP PUID': 'musicIpPuid',
  'TXXX:MusicMagic Fingerprint': 'musicIpFingerprint',
  WOAR: 'website',

  // id3v2.4
  // ToDo: In same sequence as defined at http://id3.org/id3v2.4.0-frames
  TDRC: 'date', // date YYYY-MM-DD
  TYER: 'year',
  TDOR: 'originalDate',
  'TIPL:arranger': 'arrangers',
  'TIPL:engineer': 'engineers',
  'TIPL:producer': 'producers',
  'TIPL:DJ-mix': 'djMixers',
  'TIPL:mix': 'mixers',
  TMOO: 'mood',

  // additional mappings:
  SYLT: 'lyrics',

  TSST: 'discSubtitle',
  TKEY: 'key',
  COMM: 'comments',
  TOPE: 'originalArtist',

  // Windows Media Player
  'PRIV:AverageLevel': 'averageLevel',
  'PRIV:PeakValue': 'peakLevel',
  'PRIV:PeakLevel': 'peakLevel',

  // Discogs
  'TXXX:DISCOGS_ARTIST_ID': 'discogsArtistId',
  'TXXX:DISCOGS_ARTISTS': 'artists',
  'TXXX:DISCOGS_ARTIST_NAME': 'artists',
  'TXXX:DISCOGS_ALBUM_ARTISTS': 'albumArtists',
  'TXXX:DISCOGS_CATALOG': 'catalogNumber',
  'TXXX:DISCOGS_COUNTRY': 'releaseCountry',
  'TXXX:DISCOGS_DATE': 'originalDate',
  'TXXX:DISCOGS_LABEL': 'labels',
  'TXXX:DISCOGS_LABEL_ID': 'discogsLabelId',
  'TXXX:DISCOGS_MASTER_RELEASE_ID': 'discogsMasterReleaseId',
  'TXXX:DISCOGS_RATING': 'discogsRating',
  'TXXX:DISCOGS_RELEASED': 'date',
  'TXXX:DISCOGS_RELEASE_ID': 'discogsReleaseId',
  'TXXX:DISCOGS_VOTES': 'discogsVotes',

  'TXXX:CATALOGID': 'catalogNumber',
  'TXXX:STYLE': 'genres',

  'TXXX:REPLAYGAIN_TRACK_PEAK': 'replayGainTrackPeak',
  'TXXX:REPLAYGAIN_TRACK_GAIN': 'replayGainTrackGain',
  'TXXX:REPLAYGAIN_ALBUM_PEAK': 'replayGainAlbumPeak',
  'TXXX:REPLAYGAIN_ALBUM_GAIN': 'replayGainAlbumGain',
  'TXXX:MP3GAIN_MINMAX': 'replayGainTrackMinMax',
  'TXXX:MP3GAIN_ALBUM_MINMAX': 'replayGainAlbumMinMax',
  'TXXX:MP3GAIN_UNDO': 'replayGainUndo',

  MVNM: 'movement',
  MVIN: 'movementNumber',
  PCST: 'podcast',
  TCAT: 'categories',
  TDES: 'description',
  TDRL: 'releaseDate',
  TGID: 'podcastId',
  TKWD: 'keywords',
  WFED: 'podcastUrl',

  GRP1: 'grouping',

  PCNT: 'playCounter'
};

export class ID3v24TagMapper extends CaseInsensitiveTagMap {
  public static toRating(popm: IPopularimeter): IRating {
    return {
      source: popm.email,
      rating: popm.rating > 0 ? ((popm.rating - 1) / 254) * CommonTagMapper.maxRatingScore : undefined
    };
  }

  public constructor() {
    super(['ID3v2.3', 'ID3v2.4'], id3v24TagMap);
  }

  /**
   * Handle post mapping exceptions / correction
   * @param tag to post map
   * @param warnings Wil be used to register (collect) warnings
   */
  protected postMap(tag: ITag, warnings: INativeMetadataCollector): void {
    switch (tag.id) {
      case 'UFID':
        {
          // decode MusicBrainz Recording Id
          const idTag = tag.value as IIdentifierTag;
          if (idTag.owner_identifier === 'http://musicbrainz.org') {
            tag.id += `:${idTag.owner_identifier}`;
            tag.value = decodeString(idTag.identifier, 'latin1'); // latin1 == iso-8859-1
          }
        }
        break;

      case 'PRIV':
        {
          const customTag = tag.value as ICustomDataTag;
          switch (customTag.owner_identifier) {
            // decode Windows Media Player
            case 'AverageLevel':
            case 'PeakValue':
            case 'PeakLevel':
              tag.id += `:${customTag.owner_identifier}`;
              tag.value = customTag.data.length === 4 ? UINT32_LE.get(customTag.data, 0) : null;
              if (tag.value === null) {
                warnings.addWarning(`Failed to parse PRIV:${customTag.owner_identifier}`);
              }
              break;
            default:
              warnings.addWarning(`Unknown PRIV owner-identifier: ${customTag.owner_identifier.slice(0, 128)}`);
          }
        }
        break;

      case 'POPM':
        tag.value = ID3v24TagMapper.toRating(tag.value as IPopularimeter);
        break;

      default:
        break;
    }
  }
}
