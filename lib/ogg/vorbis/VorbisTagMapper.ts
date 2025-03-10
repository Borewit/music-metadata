import type { INativeTagMap } from '../../common/GenericTagTypes.js';
import { CommonTagMapper } from '../../common/GenericTagMapper.js';

import type { IRating, ITag } from '../../type.js';

/**
 * Vorbis tag mappings
 *
 * Mapping from native header format to one or possibly more 'common' entries
 * The common entries aim to read the same information from different media files
 * independent of the underlying format
 */
const vorbisTagMap: INativeTagMap = {
  TITLE: 'title',
  ARTIST: 'artist',
  ARTISTS: 'artists',
  ALBUMARTIST: 'albumartist',
  'ALBUM ARTIST': 'albumartist',
  ALBUM: 'album',
  DATE: 'date',
  ORIGINALDATE: 'originaldate',
  ORIGINALYEAR: 'originalyear',
  RELEASEDATE: 'releasedate',
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
  RATING: 'rating',
  BPM: 'bpm',
  KEY: 'key',
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
  ACOUSTID_ID_FINGERPRINT: 'acoustid_fingerprint',
  MUSICIP_PUID: 'musicip_puid',
  // 'FINGERPRINT=MusicMagic Fingerprint {fingerprint}': 'musicip_fingerprint', // ToDo
  WEBSITE: 'website',
  NOTES: 'notes',
  TOTALTRACKS: 'totaltracks',
  TOTALDISCS: 'totaldiscs',
  // Discogs
  DISCOGS_ARTIST_ID: 'discogs_artist_id',
  DISCOGS_ARTISTS: 'artists',
  DISCOGS_ARTIST_NAME: 'artists',
  DISCOGS_ALBUM_ARTISTS: 'albumartist',
  DISCOGS_CATALOG: 'catalognumber',
  DISCOGS_COUNTRY: 'releasecountry',
  DISCOGS_DATE: 'originaldate',
  DISCOGS_LABEL: 'label',
  DISCOGS_LABEL_ID: 'discogs_label_id',
  DISCOGS_MASTER_RELEASE_ID: 'discogs_master_release_id',
  DISCOGS_RATING: 'discogs_rating',
  DISCOGS_RELEASED: 'date',
  DISCOGS_RELEASE_ID: 'discogs_release_id',
  DISCOGS_VOTES: 'discogs_votes',

  CATALOGID: 'catalognumber',
  STYLE: 'genre',

  //
  REPLAYGAIN_TRACK_GAIN: 'replaygain_track_gain',
  REPLAYGAIN_TRACK_PEAK: 'replaygain_track_peak',
  REPLAYGAIN_ALBUM_GAIN: 'replaygain_album_gain',
  REPLAYGAIN_ALBUM_PEAK: 'replaygain_album_peak',

  // To Sure if these (REPLAYGAIN_MINMAX, REPLAYGAIN_ALBUM_MINMAX & REPLAYGAIN_UNDO) are used for Vorbis:
  REPLAYGAIN_MINMAX: 'replaygain_track_minmax',
  REPLAYGAIN_ALBUM_MINMAX: 'replaygain_album_minmax',
  REPLAYGAIN_UNDO: 'replaygain_undo'
};

export class VorbisTagMapper extends CommonTagMapper {

  public static toRating(email: string | undefined | null, rating: string, maxScore: number): IRating {

    return {
      source: email ? email.toLowerCase() : undefined,
      rating: (Number.parseFloat(rating) / maxScore) * CommonTagMapper.maxRatingScore
    };
  }

  public constructor() {
    super(['vorbis'], vorbisTagMap);
  }

  protected postMap(tag: ITag): void {
    if (tag.id === 'RATING') {
      // The way Winamp 5.666 assigns rating
      tag.value = VorbisTagMapper.toRating(undefined, tag.value as string, 100);
    } else if (tag.id.indexOf('RATING:') === 0) {
      const keys = tag.id.split(':');
      tag.value = VorbisTagMapper.toRating(keys[1], tag.value as string, 1);
      tag.id = keys[0];
    }

  }

}
