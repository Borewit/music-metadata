import { CaseInsensitiveTagMap } from '../common/CaseInsensitiveTagMap.js';
import type { INativeTagMap } from '../common/GenericTagTypes.js';
import type { INativeMetadataCollector } from '../common/MetadataCollector.js';
import type { ITag } from '../type.js';

/**
 * Ref: https://github.com/sergiomb2/libmp4v2/wiki/iTunesMetadata
 */
const mp4TagMap: INativeTagMap = {
  '----:com.apple.iTunes:MusicBrainz Composer Id': 'mbComposerId',
  '----:com.apple.iTunes:MusicBrainz Original Artist Id': 'mbOriginalArtistId',
  '----:com.apple.iTunes:MusicBrainz Original Album Id': 'mbOriginalReleaseId',
  '©dir': 'directors',
  '----:com.apple.iTunes:iTunes_CDDB_1': 'itunesCddb1',
  '----:com.apple.iTunes:REPLAYGAIN_ALBUM_RANGE': 'replayGainAlbumRange',
  '----:com.apple.iTunes:REPLAYGAIN_TRACK_RANGE': 'replayGainTrackRange',
  '----:com.apple.iTunes:REPLAYGAIN_REFERENCE_LOUDNESS': 'replayGainReferenceLoudness',
  'mdta:title': 'title',
  'mdta:album': 'album',
  'mdta:artist': 'artist',
  'mdta:album_artist': 'albumArtist',
  'mdta:albumartist': 'albumArtist',
  'mdta:composer': 'composers',
  'mdta:date': 'date',
  'mdta:comment': 'comments',
  'mdta:description': 'description',
  'mdta:synopsis': 'longDescription',
  'mdta:genre': 'genres',
  'mdta:track': 'trackNumber',
  'mdta:disc': 'discNumber',
  'mdta:publisher': 'labels',
  'mdta:subtitle': 'subtitles',
  'mdta:language': 'language',
  'mdta:copyright': 'copyright',
  'mdta:encoder': 'encodedBy',
  'mdta:asin': 'asin',
  'mdta:com.apple.quicktime.title': 'title',
  'mdta:com.apple.quicktime.album': 'album',
  'mdta:com.apple.quicktime.artist': 'artist',
  'mdta:com.apple.quicktime.creationdate': 'date',
  'mdta:com.apple.quicktime.comment': 'comments',
  'mdta:com.apple.quicktime.description': 'description',
  'mdta:com.apple.quicktime.genre': 'genres',
  'mdta:com.apple.quicktime.copyright': 'copyright',
  '©nam': 'title',
  '©ART': 'artist',
  aART: 'albumArtist',
  /**
   * ToDo: Album artist seems to be stored here while Picard documentation says: aART
   */
  '----:com.apple.iTunes:Band': 'albumArtist',
  '©alb': 'album',
  '©day': 'date',
  '©cmt': 'comments',
  '©com': 'comments',
  trkn: 'trackNumber',
  disk: 'discNumber',
  '©gen': 'genres',
  covr: 'picture',
  '©wrt': 'composers',
  '©lyr': 'lyrics',
  soal: 'albumSort',
  sonm: 'titleSort',
  soar: 'artistSort',
  soaa: 'albumArtistSort',
  soco: 'composerSort',
  '----:com.apple.iTunes:ALBUMARTISTS': 'albumArtists',
  '----:com.apple.iTunes:LYRICIST': 'lyricists',
  '----:com.apple.iTunes:CONDUCTOR': 'conductors',
  '----:com.apple.iTunes:ARRANGER': 'arrangers',
  '----:com.apple.iTunes:REMIXER': 'remixers',
  '----:com.apple.iTunes:ENGINEER': 'engineers',
  '----:com.apple.iTunes:PRODUCER': 'producers',
  '----:com.apple.iTunes:DJMIXER': 'djMixers',
  '----:com.apple.iTunes:MIXER': 'mixers',
  '----:com.apple.iTunes:LABEL': 'labels',
  '©grp': 'grouping',
  '----:com.apple.iTunes:SUBTITLE': 'subtitles',
  '----:com.apple.iTunes:DISCSUBTITLE': 'discSubtitle',
  cpil: 'compilation',
  tmpo: 'bpm',
  '----:com.apple.iTunes:initialkey': 'key',
  '----:com.apple.iTunes:MOOD': 'mood',
  '----:com.apple.iTunes:MEDIA': 'media',
  '----:com.apple.iTunes:CATALOGNUMBER': 'catalogNumber',
  tvsh: 'tvShow',
  tvsn: 'tvSeason',
  tves: 'tvEpisode',
  sosn: 'tvShowSort',
  tven: 'tvEpisodeId',
  tvnn: 'tvNetwork',
  pcst: 'podcast',
  purl: 'podcastUrl',
  '----:com.apple.iTunes:MusicBrainz Album Status': 'releaseStatus',
  '----:com.apple.iTunes:MusicBrainz Album Type': 'releaseType',
  '----:com.apple.iTunes:MusicBrainz Album Release Country': 'releaseCountry',
  '----:com.apple.iTunes:SCRIPT': 'script',
  '----:com.apple.iTunes:LANGUAGE': 'language',
  cprt: 'copyright',
  '©cpy': 'copyright',
  '----:com.apple.iTunes:LICENSE': 'license',
  '©too': 'encodedBy',
  pgap: 'gapless',
  '----:com.apple.iTunes:BARCODE': 'barcode',
  '----:com.apple.iTunes:ISRC': 'isrcs',
  '----:com.apple.iTunes:ASIN': 'asin',
  '----:com.apple.iTunes:NOTES': 'comments',
  '----:com.apple.iTunes:MusicBrainz Track Id': 'mbRecordingId',
  '----:com.apple.iTunes:MusicBrainz Release Track Id': 'mbReleaseTrackId',
  '----:com.apple.iTunes:MusicBrainz Album Id': 'mbReleaseId',
  '----:com.apple.iTunes:MusicBrainz Artist Id': 'mbArtistId',
  '----:com.apple.iTunes:MusicBrainz Album Artist Id': 'mbAlbumArtistId',
  '----:com.apple.iTunes:MusicBrainz Release Group Id': 'mbReleaseGroupId',
  '----:com.apple.iTunes:MusicBrainz Work Id': 'mbWorkId',
  '----:com.apple.iTunes:MusicBrainz TRM Id': 'mbTrmId',
  '----:com.apple.iTunes:MusicBrainz Disc Id': 'mbDiscId',
  '----:com.apple.iTunes:Acoustid Id': 'acoustId',
  '----:com.apple.iTunes:Acoustid Fingerprint': 'acoustIdFingerprint',
  '----:com.apple.iTunes:MusicIP PUID': 'musicIpPuid',
  '----:com.apple.iTunes:fingerprint': 'musicIpFingerprint',
  '----:com.apple.iTunes:replaygain_track_gain': 'replayGainTrackGain',
  '----:com.apple.iTunes:replaygain_track_peak': 'replayGainTrackPeak',
  '----:com.apple.iTunes:replaygain_album_gain': 'replayGainAlbumGain',
  '----:com.apple.iTunes:replaygain_album_peak': 'replayGainAlbumPeak',
  '----:com.apple.iTunes:replaygain_track_minmax': 'replayGainTrackMinMax',
  '----:com.apple.iTunes:replaygain_album_minmax': 'replayGainAlbumMinMax',
  '----:com.apple.iTunes:replaygain_undo': 'replayGainUndo',
  '----:com.apple.iTunes:Movement Name': 'movement',
  '----:com.apple.iTunes:Movement': 'movementNumber',
  '----:com.apple.iTunes:Movement Total': 'movementTotal',
  // Additional mappings:
  gnre: 'genres', // ToDo: check mapping

  '----:com.apple.iTunes:ALBUMARTISTSORT': 'albumArtistSort',
  '----:com.apple.iTunes:ARTISTS': 'artists',
  '----:com.apple.iTunes:ORIGINALDATE': 'originalDate',
  '----:com.apple.iTunes:ORIGINALYEAR': 'originalYear',
  '----:com.apple.iTunes:RELEASEDATE': 'releaseDate',
  '----:com.apple.iTunes:PERFORMER': 'performer:instrument',
  desc: 'description',
  ldes: 'longDescription',
  '©mvn': 'movement',
  '©mvi': 'movementNumber',
  '©mvc': 'movementTotal',
  '©wrk': 'work',
  catg: 'categories',
  egid: 'podcastId',
  hdvd: 'hdVideo',
  keyw: 'keywords',
  shwm: 'showMovement',
  stik: 'stik',
  rate: 'rating'
};

export const tagType = 'iTunes';

export class MP4TagMapper extends CaseInsensitiveTagMap {
  public constructor() {
    super([tagType], mp4TagMap);
  }

  protected postMap(tag: ITag, _warnings: INativeMetadataCollector): void {
    if (
      tag.id.toUpperCase() === '----:COM.APPLE.ITUNES:FINGERPRINT' &&
      typeof tag.value === 'string' &&
      tag.value.startsWith('MusicMagic Fingerprint')
    ) {
      tag.value = tag.value.slice('MusicMagic Fingerprint'.length).trimStart();
    }
    switch (tag.id) {
      case 'rate':
        tag.value = {
          source: undefined,
          rating: Number.parseFloat(tag.value as string) / 100
        };
        break;
    }
  }
}
