export type TagType = 'vorbis' | 'ID3v1' | 'ID3v2.2' | 'ID3v2.3' | 'ID3v2.4' | 'APEv2' | 'asf' | 'iTunes MP4' | 'exif';

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
  | 'show'
  | 'showsort'
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
  | 'replaygain_track_peak';

export interface INativeTagMap {
  [index: string]: GenericTagId;
}

export interface ITagInfo {
  multiple: boolean;
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
  technician: {multiple: true},
  djmixer: {multiple: true},
  mixer: {multiple: true},
  label: {multiple: true},
  grouping: {multiple: false},
  subtitle: {multiple: false},
  discsubtitle: {multiple: false},
  totaltracks: {multiple: false},
  totaldiscs: {multiple: false},
  compilation: {multiple: false},
  rating: {multiple: true},
  bpm: {multiple: false},
  mood: {multiple: false},
  media: {multiple: false},
  catalognumber: {multiple: true},
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
  'performer:instrument': {multiple: true},
  averageLevel: {multiple: false},
  peakLevel: {multiple: false},
  notes: {multiple: true},

  key: {multiple: false},
  originalalbum: {multiple: false},
  originalartist: {multiple: false},

  discogs_artist_id: {multiple: true},
  discogs_release_id: {multiple: false},
  discogs_label_id: {multiple: false},
  discogs_master_release_id: {multiple: false},
  discogs_votes: {multiple: false},
  discogs_rating: {multiple: false},

  replaygain_track_peak: {multiple: false},
  replaygain_track_gain: {multiple: false}
};

/**
 * @param alias Name of common tag
 * @returns {boolean|*} true if given alias is mapped as a singleton', otherwise false
 */
export function isSingleton(alias: GenericTagId): boolean {
  return commonTags.hasOwnProperty(alias) && !commonTags[alias].multiple;
}
