import { CommonTagMapper } from '../../common/GenericTagMapper.js';
import type { IGenericTag, INativeTagMap } from '../../common/GenericTagTypes.js';

import type { IWarningCollector } from '../../common/MetadataCollector.js';

import type { IRating, ITag } from '../../type.js';

/**
 * Vorbis tag mappings
 *
 * Mapping from native header format to one or possibly more 'common' entries
 * The common entries aim to read the same information from different media files
 * independent of the underlying format
 */
const vorbisTagMap: INativeTagMap = {
  MUSICBRAINZ_COMPOSERID: 'mbComposerId',
  MUSICBRAINZ_ORIGINALARTISTID: 'mbOriginalArtistId',
  MUSICBRAINZ_ORIGINALALBUMID: 'mbOriginalReleaseId',
  DIRECTOR: 'directors',
  ORIGINALFILENAME: 'originalFilename',
  ITUNES_CDDB_1: 'itunesCddb1',
  REPLAYGAIN_ALBUM_RANGE: 'replayGainAlbumRange',
  REPLAYGAIN_TRACK_RANGE: 'replayGainTrackRange',
  REPLAYGAIN_REFERENCE_LOUDNESS: 'replayGainReferenceLoudness',
  TECHNICIAN: 'technicians',
  LONGDESCRIPTION: 'longDescription',
  TVSHOW: 'tvShow',
  TVSHOWSORT: 'tvShowSort',
  TVSEASON: 'tvSeason',
  TVEPISODE: 'tvEpisode',
  TVEPISODEID: 'tvEpisodeId',
  TVNETWORK: 'tvNetwork',
  PODCAST: 'podcast',
  PODCASTURL: 'podcastUrl',
  GAPLESS: 'gapless',
  MUSICIP_FINGERPRINT: 'musicIpFingerprint',
  'PERFORMER:INSTRUMENT': 'performer:instrument',
  AVERAGELEVEL: 'averageLevel',
  PEAKLEVEL: 'peakLevel',
  ORIGINALALBUM: 'originalAlbum',
  ORIGINALARTIST: 'originalArtist',
  CATEGORY: 'categories',
  HDVIDEO: 'hdVideo',
  KEYWORDS: 'keywords',
  MOVEMENTNAME: 'movement',
  MOVEMENT: 'movement',
  MOVEMENTNUMBER: 'movementNumber',
  MOVEMENTTOTAL: 'movementTotal',
  PODCASTID: 'podcastId',
  SHOWMOVEMENT: 'showMovement',
  STIK: 'stik',
  PLAYCOUNTER: 'playCounter',
  TITLE: 'title',
  ARTIST: 'artist',
  ARTISTS: 'artists',
  ALBUMARTISTS: 'albumArtists',
  ALBUMARTIST: 'albumArtist',
  'ALBUM ARTIST': 'albumArtist',
  ALBUM: 'album',
  DATE: 'date',
  ORIGINALDATE: 'originalDate',
  ORIGINALYEAR: 'originalYear',
  RELEASEDATE: 'releaseDate',
  COMMENT: 'comments',
  DESCRIPTION: 'comments',
  TRACKNUMBER: 'trackNumber',
  DISCNUMBER: 'discNumber',
  GENRE: 'genres',
  METADATA_BLOCK_PICTURE: 'picture',
  COMPOSER: 'composers',
  LYRICS: 'lyrics',
  UNSYNCEDLYRICS: 'lyrics',
  ALBUMSORT: 'albumSort',
  TITLESORT: 'titleSort',
  WORK: 'work',
  ARTISTSORT: 'artistSort',
  ALBUMARTISTSORT: 'albumArtistSort',
  COMPOSERSORT: 'composerSort',
  LYRICIST: 'lyricists',
  WRITER: 'writers',
  CONDUCTOR: 'conductors',
  PERFORMER: 'performer:instrument',
  REMIXER: 'remixers',
  ARRANGER: 'arrangers',
  ENGINEER: 'engineers',
  PRODUCER: 'producers',
  DJMIXER: 'djMixers',
  MIXER: 'mixers',
  LABEL: 'labels',
  ORGANIZATION: 'labels',
  PUBLISHER: 'labels',
  GROUPING: 'grouping',
  SUBTITLE: 'subtitles',
  DISCSUBTITLE: 'discSubtitle',
  TRACKTOTAL: 'trackTotal',
  DISCTOTAL: 'discTotal',
  COMPILATION: 'compilation',
  RATING: 'rating',
  BPM: 'bpm',
  KEY: 'key',
  MOOD: 'mood',
  MEDIA: 'media',
  CATALOGNUMBER: 'catalogNumber',
  RELEASESTATUS: 'releaseStatus',
  RELEASETYPE: 'releaseType',
  RELEASECOUNTRY: 'releaseCountry',
  SCRIPT: 'script',
  LANGUAGE: 'language',
  COPYRIGHT: 'copyright',
  LICENSE: 'license',
  ENCODEDBY: 'encodedBy',
  ENCODERSETTINGS: 'encoderSettings',
  BARCODE: 'barcode',
  ISRC: 'isrcs',
  ASIN: 'asin',
  MUSICBRAINZ_TRACKID: 'mbRecordingId',
  MUSICBRAINZ_RELEASETRACKID: 'mbReleaseTrackId',
  MUSICBRAINZ_ALBUMID: 'mbReleaseId',
  MUSICBRAINZ_ARTISTID: 'mbArtistId',
  MUSICBRAINZ_ALBUMARTISTID: 'mbAlbumArtistId',
  MUSICBRAINZ_RELEASEGROUPID: 'mbReleaseGroupId',
  MUSICBRAINZ_WORKID: 'mbWorkId',
  MUSICBRAINZ_TRMID: 'mbTrmId',
  MUSICBRAINZ_DISCID: 'mbDiscId',
  ACOUSTID_ID: 'acoustId',
  ACOUSTID_FINGERPRINT: 'acoustIdFingerprint',
  ACOUSTID_ID_FINGERPRINT: 'acoustIdFingerprint',
  MUSICIP_PUID: 'musicIpPuid',
  FINGERPRINT: 'musicIpFingerprint',
  WEBSITE: 'website',
  NOTES: 'notes',
  TOTALTRACKS: 'trackTotal',
  TOTALDISCS: 'discTotal',
  // Discogs
  DISCOGS_ARTIST_ID: 'discogsArtistId',
  DISCOGS_ARTISTS: 'artists',
  DISCOGS_ARTIST_NAME: 'artists',
  DISCOGS_ALBUM_ARTISTS: 'albumArtists',
  DISCOGS_CATALOG: 'catalogNumber',
  DISCOGS_COUNTRY: 'releaseCountry',
  DISCOGS_DATE: 'originalDate',
  DISCOGS_LABEL: 'labels',
  DISCOGS_LABEL_ID: 'discogsLabelId',
  DISCOGS_MASTER_RELEASE_ID: 'discogsMasterReleaseId',
  DISCOGS_RATING: 'discogsRating',
  DISCOGS_RELEASED: 'date',
  DISCOGS_RELEASE_ID: 'discogsReleaseId',
  DISCOGS_VOTES: 'discogsVotes',

  CATALOGID: 'catalogNumber',
  STYLE: 'genres',

  //
  REPLAYGAIN_TRACK_GAIN: 'replayGainTrackGain',
  REPLAYGAIN_TRACK_PEAK: 'replayGainTrackPeak',
  REPLAYGAIN_ALBUM_GAIN: 'replayGainAlbumGain',
  REPLAYGAIN_ALBUM_PEAK: 'replayGainAlbumPeak',

  // To Sure if these (REPLAYGAIN_MINMAX, REPLAYGAIN_ALBUM_MINMAX & REPLAYGAIN_UNDO) are used for Vorbis:
  REPLAYGAIN_MINMAX: 'replayGainTrackMinMax',
  REPLAYGAIN_ALBUM_MINMAX: 'replayGainAlbumMinMax',
  REPLAYGAIN_UNDO: 'replayGainUndo'
};

export class VorbisTagMapper extends CommonTagMapper {
  private hasStandardDate = false;

  public static toRating(email: string | undefined | null, rating: string, maxScore: number): IRating {
    return {
      source: email ? email.toLowerCase() : undefined,
      rating: (Number.parseFloat(rating) / maxScore) * CommonTagMapper.maxRatingScore
    };
  }

  public constructor() {
    super(['vorbis'], vorbisTagMap);
  }

  public override mapGenericTag(tag: ITag, warnings: IWarningCollector): IGenericTag | null {
    if (
      tag.id === 'FINGERPRINT' &&
      (typeof tag.value !== 'string' || !tag.value.startsWith('MusicMagic Fingerprint'))
    ) {
      return null;
    }
    if (tag.id === 'DATE') {
      if (typeof tag.value !== 'string' || tag.value.trim().length === 0) {
        return null;
      }
      this.hasStandardDate = true;
    } else if (tag.id === 'DISCOGS_RELEASED' && this.hasStandardDate) {
      return null;
    }
    return super.mapGenericTag(tag, warnings);
  }

  protected postMap(tag: ITag): void {
    if (tag.id === 'FINGERPRINT') {
      tag.value = (tag.value as string).slice('MusicMagic Fingerprint'.length).trimStart();
    }
    if (tag.id === 'RATING') {
      // The way Winamp 5.666 assigns rating
      tag.value = VorbisTagMapper.toRating(undefined, tag.value as string, 100);
    } else if (tag.id.indexOf('RATING:') === 0) {
      const keys = tag.id.split(':', 2);
      tag.value = VorbisTagMapper.toRating(keys[1], tag.value as string, 1);
      tag.id = keys[0];
    }
  }
}
