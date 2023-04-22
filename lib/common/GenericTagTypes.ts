export type TagType = 'vorbis' | 'ID3v1' | 'ID3v2.2' | 'ID3v2.3' | 'ID3v2.4' | 'APEv2' | 'asf' | 'iTunes' | 'exif' | 'matroska' | 'AIFF';

export interface IGenericTag {
  id: GenericTagId,
  value: any
}

export type GenericTagId =
  'track'
  | 'disk'
  | 'year'
  | 'title'
  | 'artist'
  | 'artists'
  | 'albumartist'
  | 'album'
  | 'date'
  | 'originaldate'
  | 'originalyear'
  | 'releasedate'
  | 'comment'
  | 'genre'
  | 'picture'
  | 'composer'
  | 'lyrics'
  | 'albumsort'
  | 'titlesort'
  | 'work'
  | 'artistsort'
  | 'albumartistsort'
  | 'composersort'
  | 'lyricist'
  | 'writer'
  | 'conductor'
  | 'remixer'
  | 'arranger'
  | 'engineer'
  | 'technician'
  | 'producer'
  | 'djmixer'
  | 'mixer'
  | 'publisher'
  | 'label'
  | 'grouping'
  | 'subtitle'
  | 'discsubtitle'
  | 'totaltracks'
  | 'totaldiscs'
  | 'compilation'
  | 'rating'
  | 'bpm'
  | 'mood'
  | 'media'
  | 'catalognumber'
  | 'tvShow'
  | 'tvShowSort'
  | 'tvEpisode'
  | 'tvEpisodeId'
  | 'tvNetwork'
  | 'tvSeason'
  | 'podcast'
  | 'podcasturl'
  | 'releasestatus'
  | 'releasetype'
  | 'releasecountry'
  | 'script'
  | 'language'
  | 'copyright'
  | 'license'
  | 'encodedby'
  | 'encodersettings'
  | 'gapless'
  | 'barcode'
  | 'isrc'
  | 'asin'
  | 'musicbrainz_recordingid'
  | 'musicbrainz_trackid'
  | 'musicbrainz_albumid'
  | 'musicbrainz_artistid'
  | 'musicbrainz_albumartistid'
  | 'musicbrainz_releasegroupid'
  | 'musicbrainz_workid'
  | 'musicbrainz_trmid'
  | 'musicbrainz_discid'
  | 'acoustid_id'
  | 'acoustid_fingerprint'
  | 'musicip_puid'
  | 'musicip_fingerprint'
  | 'website'
  | 'performer:instrument'
  | 'peakLevel'
  | 'averageLevel'
  | 'notes'
  | 'key'
  | 'originalalbum'
  | 'originalartist'
  | 'discogs_artist_id'
  | 'discogs_label_id'
  | 'discogs_master_release_id'
  | 'discogs_rating'
  | 'discogs_release_id'
  | 'discogs_votes'
  | 'replaygain_track_gain'
  | 'replaygain_track_peak'
  | 'replaygain_album_gain'
  | 'replaygain_album_peak'
  | 'replaygain_track_minmax'
  | 'replaygain_album_minmax'
  | 'replaygain_undo'
  | 'description'
  | 'longDescription'
  | 'category'
  | 'hdVideo'
  | 'keywords'
  | 'movement'
  | 'movementIndex'
  | 'movementTotal'
  | 'podcastId'
  | 'showMovement'
  | 'stik';

export interface INativeTagMap {
  [index: string]: GenericTagId;
}

export interface ITagInfo {
  /**
   * True if result is an array
   */
  multiple: boolean,
  /**
   * True if the result is an array and each value in the array should be unique
   */
  unique?: boolean
}

export interface ITagInfoMap {
  [index: string]: ITagInfo;
}

export const commonTags: ITagInfoMap = {
  year: {multiple: false},
  track: {multiple: false},
  disk: {multiple: false},
  title: {multiple: false},
  artist: {multiple: false},
  artists: {multiple: true, unique: true},
  albumartist: {multiple: false},
  album: {multiple: false},
  date: {multiple: false},
  originaldate: {multiple: false},
  originalyear: {multiple: false},
  releasedate: {multiple: false},
  comment: {multiple: true, unique: false},
  genre: {multiple: true, unique: true},
  picture: {multiple: true, unique: true},
  composer: {multiple: true, unique: true},
  lyrics: {multiple: true, unique: false},
  albumsort: {multiple: false, unique: true},
  titlesort: {multiple: false, unique: true},
  work: {multiple: false, unique: true},
  artistsort: {multiple: false, unique: true},
  albumartistsort: {multiple: false, unique: true},
  composersort: {multiple: false, unique: true},
  lyricist: {multiple: true, unique: true},
  writer: {multiple: true, unique: true},
  conductor: {multiple: true, unique: true},
  remixer: {multiple: true, unique: true},
  arranger: {multiple: true, unique: true},
  engineer: {multiple: true, unique: true},
  producer: {multiple: true, unique: true},
  technician: {multiple: true, unique: true},
  djmixer: {multiple: true, unique: true},
  mixer: {multiple: true, unique: true},
  label: {multiple: true, unique: true},
  grouping: {multiple: false},
  subtitle: {multiple: true},
  discsubtitle: {multiple: false},
  totaltracks: {multiple: false},
  totaldiscs: {multiple: false},
  compilation: {multiple: false},
  rating: {multiple: true},
  bpm: {multiple: false},
  mood: {multiple: false},
  media: {multiple: false},
  catalognumber: {multiple: true, unique: true},
  tvShow: {multiple: false},
  tvShowSort: {multiple: false},
  tvSeason: {multiple: false},
  tvEpisode: {multiple: false},
  tvEpisodeId: {multiple: false},
  tvNetwork: {multiple: false},
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
  isrc: {multiple: true},
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
  'performer:instrument': {multiple: true, unique: true},
  averageLevel: {multiple: false},
  peakLevel: {multiple: false},
  notes: {multiple: true, unique: false},

  key: {multiple: false},
  originalalbum: {multiple: false},
  originalartist: {multiple: false},

  discogs_artist_id: {multiple: true, unique: true},
  discogs_release_id: {multiple: false},
  discogs_label_id: {multiple: false},
  discogs_master_release_id: {multiple: false},
  discogs_votes: {multiple: false},
  discogs_rating: {multiple: false},

  replaygain_track_peak: {multiple: false},
  replaygain_track_gain: {multiple: false},
  replaygain_album_peak: {multiple: false},
  replaygain_album_gain: {multiple: false},
  replaygain_track_minmax: {multiple: false},
  replaygain_album_minmax: {multiple: false},
  replaygain_undo: {multiple: false},

  description:  {multiple: true},
  longDescription: {multiple: false},

  category: {multiple: true},
  hdVideo: {multiple: false},
  keywords: {multiple: true},
  movement: {multiple: false},
  movementIndex: {multiple: false},
  movementTotal: {multiple: false},
  podcastId: {multiple: false},
  showMovement: {multiple: false},
  stik: {multiple: false}
};

/**
 * @param alias Name of common tag
 * @returns {boolean|*} true if given alias is mapped as a singleton', otherwise false
 */
export function isSingleton(alias: GenericTagId): boolean {
  return commonTags.hasOwnProperty(alias) && !commonTags[alias].multiple;
}

/**
 * @param alias Common (generic) tag
 * @returns {boolean|*} true if given alias is a singleton or explicitly marked as unique
 */
export function isUnique(alias: GenericTagId): boolean {
  return !commonTags[alias].multiple || commonTags[alias].unique;
}
