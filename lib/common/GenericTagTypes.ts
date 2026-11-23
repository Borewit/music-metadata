import type { AnyTagValue, ICommonTagsResult } from '../type.js';

export const tagTypes = [
  'vorbis',
  'ID3v1',
  'ID3v2.2',
  'ID3v2.3',
  'ID3v2.4',
  'APEv2',
  'asf',
  'iTunes',
  'exif',
  'matroska',
  'AIFF',
  'CAF'
] as const;

export type TagType = (typeof tagTypes)[number];

export type GenericTagId = keyof ICommonTagsResult;

export interface IGenericTag {
  id: GenericTagId;
  value: AnyTagValue;
}

export interface INativeTagMap {
  [index: string]: GenericTagId | undefined;
}

export interface ITagInfo {
  /**
   * True if result is an array
   */
  multiple: boolean;
  /**
   * True if the result is an array and each value in the array should be unique
   */
  unique?: boolean;
}

export type ITagInfoMap = Record<GenericTagId, ITagInfo>;

const defaultTagInfo: ITagInfo = {
  multiple: false
};

const commonTags: ITagInfoMap = {
  year: defaultTagInfo,
  trackNumber: defaultTagInfo,
  discNumber: defaultTagInfo,
  title: defaultTagInfo,
  artist: defaultTagInfo,
  artists: { multiple: true, unique: true },
  albumArtist: defaultTagInfo,
  albumArtists: { multiple: true, unique: true },
  album: defaultTagInfo,
  date: defaultTagInfo,
  originalDate: defaultTagInfo,
  originalYear: defaultTagInfo,
  releaseDate: defaultTagInfo,
  comments: { multiple: true, unique: false },
  genres: { multiple: true, unique: true },
  picture: { multiple: true, unique: true },
  composers: { multiple: true, unique: true },
  lyrics: { multiple: true, unique: false },
  albumSort: { multiple: false, unique: true },
  titleSort: { multiple: false, unique: true },
  work: { multiple: false, unique: true },
  artistSort: { multiple: false, unique: true },
  albumArtistSort: { multiple: false, unique: true },
  composerSort: { multiple: false, unique: true },
  lyricists: { multiple: true, unique: true },
  writers: { multiple: true, unique: true },
  conductors: { multiple: true, unique: true },
  remixers: { multiple: true, unique: true },
  arrangers: { multiple: true, unique: true },
  engineers: { multiple: true, unique: true },
  publishers: { multiple: true, unique: true },
  producers: { multiple: true, unique: true },
  djMixers: { multiple: true, unique: true },
  mixers: { multiple: true, unique: true },
  technicians: { multiple: true, unique: true },
  labels: { multiple: true, unique: true },
  grouping: defaultTagInfo,
  subtitles: { multiple: true },
  description: { multiple: true },
  longDescription: defaultTagInfo,
  discSubtitle: { multiple: true },
  trackTotal: defaultTagInfo,
  discTotal: defaultTagInfo,
  movementTotal: defaultTagInfo,
  compilation: defaultTagInfo,
  rating: { multiple: true },
  bpm: defaultTagInfo,
  mood: defaultTagInfo,
  media: defaultTagInfo,
  catalogNumber: { multiple: true, unique: true },
  tvShow: defaultTagInfo,
  tvShowSort: defaultTagInfo,
  tvSeason: defaultTagInfo,
  tvEpisode: defaultTagInfo,
  tvEpisodeId: defaultTagInfo,
  tvNetwork: defaultTagInfo,
  podcast: defaultTagInfo,
  podcastUrl: defaultTagInfo,
  releaseStatus: defaultTagInfo,
  releaseType: { multiple: true },
  releaseCountry: defaultTagInfo,
  script: defaultTagInfo,
  language: defaultTagInfo,
  copyright: defaultTagInfo,
  license: defaultTagInfo,
  encodedBy: defaultTagInfo,
  encoderSettings: defaultTagInfo,
  gapless: defaultTagInfo,
  barcode: defaultTagInfo,
  isrcs: { multiple: true },
  asin: defaultTagInfo,
  mbComposerId: { multiple: true },
  mbOriginalArtistId: { multiple: true },
  mbOriginalReleaseId: defaultTagInfo,
  directors: { multiple: true },
  originalFilename: defaultTagInfo,
  itunesCddb1: defaultTagInfo,
  replayGainAlbumRange: defaultTagInfo,
  replayGainTrackRange: defaultTagInfo,
  replayGainReferenceLoudness: defaultTagInfo,
  mbRecordingId: defaultTagInfo,
  mbReleaseTrackId: defaultTagInfo,
  mbReleaseId: defaultTagInfo,
  mbArtistId: { multiple: true },
  mbAlbumArtistId: { multiple: true },
  mbReleaseGroupId: defaultTagInfo,
  mbWorkId: defaultTagInfo,
  mbTrmId: defaultTagInfo,
  mbDiscId: defaultTagInfo,
  acoustId: defaultTagInfo,
  acoustIdFingerprint: defaultTagInfo,
  musicIpPuid: defaultTagInfo,
  musicIpFingerprint: defaultTagInfo,
  website: defaultTagInfo,
  'performer:instrument': { multiple: true, unique: true },
  averageLevel: defaultTagInfo,
  peakLevel: defaultTagInfo,
  notes: { multiple: true, unique: false },
  originalAlbum: defaultTagInfo,
  originalArtist: defaultTagInfo,
  discogsArtistId: { multiple: true, unique: true },
  discogsReleaseId: defaultTagInfo,
  discogsLabelId: defaultTagInfo,
  discogsMasterReleaseId: defaultTagInfo,
  discogsVotes: defaultTagInfo,
  discogsRating: defaultTagInfo,

  replayGainTrackGainRatio: defaultTagInfo,
  replayGainTrackPeakRatio: defaultTagInfo,
  replayGainTrackGain: defaultTagInfo,
  replayGainTrackPeak: defaultTagInfo,
  replayGainAlbumGain: defaultTagInfo,
  replayGainAlbumPeak: defaultTagInfo,
  replayGainUndo: defaultTagInfo,
  replayGainTrackMinMax: defaultTagInfo,
  replayGainAlbumMinMax: defaultTagInfo,

  key: defaultTagInfo,
  categories: { multiple: true },
  hdVideo: defaultTagInfo,
  keywords: { multiple: true },
  movement: defaultTagInfo,
  movementNumber: defaultTagInfo,
  podcastId: defaultTagInfo,
  showMovement: defaultTagInfo,
  stik: defaultTagInfo,
  playCounter: defaultTagInfo
};

export const commonTagsKeys = /* @__PURE__ */ Object.keys(commonTags) as GenericTagId[];

/**
 * @param alias Name of common tag
 * @returns {boolean|*} true if given alias is mapped as a singleton', otherwise false
 */
export function isSingleton(alias: GenericTagId): boolean {
  return !!commonTags[alias] && !commonTags[alias].multiple;
}

/**
 * @param alias Common (generic) tag
 * @returns {boolean|*} true if given alias is a singleton or explicitly marked as unique
 */
export function isUnique(alias: GenericTagId): boolean {
  const info = commonTags[alias];
  return !info?.multiple || info.unique || false;
}
