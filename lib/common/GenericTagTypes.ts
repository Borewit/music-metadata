import type { AnyTagValue, ICommonTagsResult } from '../type.js';

export type TagType = 'vorbis' | 'ID3v1' | 'ID3v2.2' | 'ID3v2.3' | 'ID3v2.4' | 'APEv2' | 'asf' | 'iTunes' | 'exif' | 'matroska' | 'AIFF';

export interface IGenericTag {
  id: keyof ICommonTagsResult;
  value: AnyTagValue;
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
  | 'stik'
  | 'playCounter';

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

const defaultTagInfo: ITagInfo = {
  multiple: false,
}

const commonTags: ITagInfoMap = {
  year: defaultTagInfo,
  track: defaultTagInfo,
  disk: defaultTagInfo,
  title: defaultTagInfo,
  artist: defaultTagInfo,
  artists: {multiple: true, unique: true},
  albumartist: defaultTagInfo,
  album: defaultTagInfo,
  date: defaultTagInfo,
  originaldate: defaultTagInfo,
  originalyear: defaultTagInfo,
  releasedate: defaultTagInfo,
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
  grouping: defaultTagInfo,
  subtitle: {multiple: true},
  discsubtitle: defaultTagInfo,
  totaltracks: defaultTagInfo,
  totaldiscs: defaultTagInfo,
  compilation: defaultTagInfo,
  rating: {multiple: true},
  bpm: defaultTagInfo,
  mood: defaultTagInfo,
  media: defaultTagInfo,
  catalognumber: {multiple: true, unique: true},
  tvShow: defaultTagInfo,
  tvShowSort: defaultTagInfo,
  tvSeason: defaultTagInfo,
  tvEpisode: defaultTagInfo,
  tvEpisodeId: defaultTagInfo,
  tvNetwork: defaultTagInfo,
  podcast: defaultTagInfo,
  podcasturl: defaultTagInfo,
  releasestatus: defaultTagInfo,
  releasetype: {multiple: true},
  releasecountry: defaultTagInfo,
  script: defaultTagInfo,
  language: defaultTagInfo,
  copyright: defaultTagInfo,
  license: defaultTagInfo,
  encodedby: defaultTagInfo,
  encodersettings: defaultTagInfo,
  gapless: defaultTagInfo,
  barcode: defaultTagInfo,
  isrc: {multiple: true},
  asin: defaultTagInfo,
  musicbrainz_recordingid: defaultTagInfo,
  musicbrainz_trackid: defaultTagInfo,
  musicbrainz_albumid: defaultTagInfo,
  musicbrainz_artistid: {multiple: true},
  musicbrainz_albumartistid: {multiple: true},
  musicbrainz_releasegroupid: defaultTagInfo,
  musicbrainz_workid: defaultTagInfo,
  musicbrainz_trmid: defaultTagInfo,
  musicbrainz_discid: defaultTagInfo,
  acoustid_id: defaultTagInfo,
  acoustid_fingerprint: defaultTagInfo,
  musicip_puid: defaultTagInfo,
  musicip_fingerprint: defaultTagInfo,
  website: defaultTagInfo,
  'performer:instrument': {multiple: true, unique: true},
  averageLevel: defaultTagInfo,
  peakLevel: defaultTagInfo,
  notes: {multiple: true, unique: false},

  key: defaultTagInfo,
  originalalbum: defaultTagInfo,
  originalartist: defaultTagInfo,

  discogs_artist_id: {multiple: true, unique: true},
  discogs_release_id: defaultTagInfo,
  discogs_label_id: defaultTagInfo,
  discogs_master_release_id: defaultTagInfo,
  discogs_votes: defaultTagInfo,
  discogs_rating: defaultTagInfo,

  replaygain_track_peak: defaultTagInfo,
  replaygain_track_gain: defaultTagInfo,
  replaygain_album_peak: defaultTagInfo,
  replaygain_album_gain: defaultTagInfo,
  replaygain_track_minmax: defaultTagInfo,
  replaygain_album_minmax: defaultTagInfo,
  replaygain_undo: defaultTagInfo,

  description:  {multiple: true},
  longDescription: defaultTagInfo,

  category: {multiple: true},
  hdVideo: defaultTagInfo,
  keywords: {multiple: true},
  movement: defaultTagInfo,
  movementIndex: defaultTagInfo,
  movementTotal: defaultTagInfo,
  podcastId: defaultTagInfo,
  showMovement: defaultTagInfo,
  stik: defaultTagInfo,
  playCounter: defaultTagInfo
};

export const commonTagsKeys = /* @__PURE__ */ Object.keys(commonTags) as (keyof ICommonTagsResult)[];

/**
 * @param alias Name of common tag
 * @returns {boolean|*} true if given alias is mapped as a singleton', otherwise false
 */
export function isSingleton(alias: keyof ICommonTagsResult): boolean {
  return commonTags[alias] && !commonTags[alias].multiple;
}

/**
 * @param alias Common (generic) tag
 * @returns {boolean|*} true if given alias is a singleton or explicitly marked as unique
 */
export function isUnique(alias: keyof ICommonTagsResult): boolean {
  return !commonTags[alias].multiple || commonTags[alias].unique || false;
}
