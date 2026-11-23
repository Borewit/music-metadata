import { ratioToDb } from '../../common/Util.js';
import type { ICommonTagsResult } from '../../type.js';
import { InvalidPatchError } from '../core/errors.js';
import type { TagPatch } from '../core/types.js';

/** Native names follow the reader mappings; unmapped fields use descriptive text fields. */
export const COMMON_FIELDS = {
  mbComposerId: { id3: 'TXXX:MusicBrainz Composer Id', vorbis: 'MUSICBRAINZ_COMPOSERID' },
  mbOriginalArtistId: { id3: 'TXXX:MusicBrainz Original Artist Id', vorbis: 'MUSICBRAINZ_ORIGINALARTISTID' },
  mbOriginalReleaseId: { id3: 'TXXX:MusicBrainz Original Album Id', vorbis: 'MUSICBRAINZ_ORIGINALALBUMID' },
  directors: { id3: 'TXXX:DIRECTOR', vorbis: 'DIRECTOR' },
  originalFilename: { id3: 'TOFN', vorbis: 'ORIGINALFILENAME' },
  itunesCddb1: { id3: 'TXXX:iTunes_CDDB_1', vorbis: 'ITUNES_CDDB_1' },
  replayGainAlbumRange: { id3: 'TXXX:REPLAYGAIN_ALBUM_RANGE', vorbis: 'REPLAYGAIN_ALBUM_RANGE' },
  replayGainTrackRange: { id3: 'TXXX:REPLAYGAIN_TRACK_RANGE', vorbis: 'REPLAYGAIN_TRACK_RANGE' },
  replayGainReferenceLoudness: { id3: 'TXXX:REPLAYGAIN_REFERENCE_LOUDNESS', vorbis: 'REPLAYGAIN_REFERENCE_LOUDNESS' },
  trackNumber: { id3: 'TRCK', vorbis: 'TRACKNUMBER' },
  trackTotal: { id3: 'TXXX:TRACKTOTAL', vorbis: 'TRACKTOTAL' },
  discNumber: { id3: 'TPOS', vorbis: 'DISCNUMBER' },
  discTotal: { id3: 'TXXX:DISCTOTAL', vorbis: 'DISCTOTAL' },
  year: { id3: 'TDRC', vorbis: 'DATE' },
  title: { id3: 'TIT2', vorbis: 'TITLE' },
  artist: { id3: 'TPE1', vorbis: 'ARTIST' },
  artists: { id3: 'TXXX:Artists', vorbis: 'ARTISTS' },
  albumArtist: { id3: 'TPE2', vorbis: 'ALBUMARTIST' },
  albumArtists: { id3: 'TXXX:ALBUMARTISTS', vorbis: 'ALBUMARTISTS' },
  album: { id3: 'TALB', vorbis: 'ALBUM' },
  date: { id3: 'TDRC', vorbis: 'DATE' },
  originalDate: { id3: 'TDOR', vorbis: 'ORIGINALDATE' },
  originalYear: { id3: 'TXXX:originalyear', vorbis: 'ORIGINALYEAR' },
  releaseDate: { id3: 'TDRL', vorbis: 'RELEASEDATE' },
  comments: { id3: 'COMM', vorbis: 'COMMENT' },
  genres: { id3: 'TCON', vorbis: 'GENRE' },
  picture: { id3: 'APIC', vorbis: 'METADATA_BLOCK_PICTURE' },
  composers: { id3: 'TCOM', vorbis: 'COMPOSER' },
  lyrics: { id3: 'USLT', vorbis: 'LYRICS' },
  albumSort: { id3: 'TSOA', vorbis: 'ALBUMSORT' },
  titleSort: { id3: 'TSOT', vorbis: 'TITLESORT' },
  work: { id3: 'TXXX:WORK', vorbis: 'WORK' },
  artistSort: { id3: 'TSOP', vorbis: 'ARTISTSORT' },
  albumArtistSort: { id3: 'TSO2', vorbis: 'ALBUMARTISTSORT' },
  composerSort: { id3: 'TSOC', vorbis: 'COMPOSERSORT' },
  lyricists: { id3: 'TEXT', vorbis: 'LYRICIST' },
  writers: { id3: 'TXXX:Writer', vorbis: 'WRITER' },
  conductors: { id3: 'TPE3', vorbis: 'CONDUCTOR' },
  remixers: { id3: 'TPE4', vorbis: 'REMIXER' },
  arrangers: { id3: 'TIPL:arranger', vorbis: 'ARRANGER' },
  engineers: { id3: 'TIPL:engineer', vorbis: 'ENGINEER' },
  publishers: { id3: 'TPUB', vorbis: 'PUBLISHER' },
  producers: { id3: 'TIPL:producer', vorbis: 'PRODUCER' },
  djMixers: { id3: 'TIPL:DJ-mix', vorbis: 'DJMIXER' },
  mixers: { id3: 'TIPL:mix', vorbis: 'MIXER' },
  technicians: { id3: 'TXXX:TECHNICIAN', vorbis: 'TECHNICIAN' },
  labels: { id3: 'TPUB', vorbis: 'LABEL' },
  grouping: { id3: 'TIT1', vorbis: 'GROUPING' },
  subtitles: { id3: 'TIT3', vorbis: 'SUBTITLE' },
  description: { id3: 'TDES', vorbis: 'DESCRIPTION' },
  longDescription: { id3: 'TXXX:LONGDESCRIPTION', vorbis: 'LONGDESCRIPTION' },
  discSubtitle: { id3: 'TSST', vorbis: 'DISCSUBTITLE' },
  movementTotal: { id3: 'MVIN', vorbis: 'MOVEMENTTOTAL' },
  compilation: { id3: 'TCMP', vorbis: 'COMPILATION' },
  rating: { id3: 'POPM', vorbis: 'RATING' },
  bpm: { id3: 'TBPM', vorbis: 'BPM' },
  mood: { id3: 'TMOO', vorbis: 'MOOD' },
  media: { id3: 'TMED', vorbis: 'MEDIA' },
  catalogNumber: { id3: 'TXXX:CATALOGNUMBER', vorbis: 'CATALOGNUMBER' },
  tvShow: { id3: 'TXXX:TVSHOW', vorbis: 'TVSHOW' },
  tvShowSort: { id3: 'TXXX:TVSHOWSORT', vorbis: 'TVSHOWSORT' },
  tvSeason: { id3: 'TXXX:TVSEASON', vorbis: 'TVSEASON' },
  tvEpisode: { id3: 'TXXX:TVEPISODE', vorbis: 'TVEPISODE' },
  tvEpisodeId: { id3: 'TXXX:TVEPISODEID', vorbis: 'TVEPISODEID' },
  tvNetwork: { id3: 'TXXX:TVNETWORK', vorbis: 'TVNETWORK' },
  podcast: { id3: 'PCST', vorbis: 'PODCAST' },
  podcastUrl: { id3: 'WFED', vorbis: 'PODCASTURL' },
  releaseStatus: { id3: 'TXXX:MusicBrainz Album Status', vorbis: 'RELEASESTATUS' },
  releaseType: { id3: 'TXXX:MusicBrainz Album Type', vorbis: 'RELEASETYPE' },
  releaseCountry: { id3: 'TXXX:MusicBrainz Album Release Country', vorbis: 'RELEASECOUNTRY' },
  script: { id3: 'TXXX:SCRIPT', vorbis: 'SCRIPT' },
  language: { id3: 'TLAN', vorbis: 'LANGUAGE' },
  copyright: { id3: 'TCOP', vorbis: 'COPYRIGHT' },
  license: { id3: 'WCOP', vorbis: 'LICENSE' },
  encodedBy: { id3: 'TENC', vorbis: 'ENCODEDBY' },
  encoderSettings: { id3: 'TSSE', vorbis: 'ENCODERSETTINGS' },
  gapless: { id3: 'TXXX:GAPLESS', vorbis: 'GAPLESS' },
  barcode: { id3: 'TXXX:BARCODE', vorbis: 'BARCODE' },
  isrcs: { id3: 'TXXX:ISRC', vorbis: 'ISRC' },
  asin: { id3: 'TXXX:ASIN', vorbis: 'ASIN' },
  mbRecordingId: { id3: 'UFID', vorbis: 'MUSICBRAINZ_TRACKID' },
  mbReleaseTrackId: { id3: 'TXXX:MusicBrainz Release Track Id', vorbis: 'MUSICBRAINZ_RELEASETRACKID' },
  mbReleaseId: { id3: 'TXXX:MusicBrainz Album Id', vorbis: 'MUSICBRAINZ_ALBUMID' },
  mbArtistId: { id3: 'TXXX:MusicBrainz Artist Id', vorbis: 'MUSICBRAINZ_ARTISTID' },
  mbAlbumArtistId: { id3: 'TXXX:MusicBrainz Album Artist Id', vorbis: 'MUSICBRAINZ_ALBUMARTISTID' },
  mbReleaseGroupId: { id3: 'TXXX:MusicBrainz Release Group Id', vorbis: 'MUSICBRAINZ_RELEASEGROUPID' },
  mbWorkId: { id3: 'TXXX:MusicBrainz Work Id', vorbis: 'MUSICBRAINZ_WORKID' },
  mbTrmId: { id3: 'TXXX:MusicBrainz TRM Id', vorbis: 'MUSICBRAINZ_TRMID' },
  mbDiscId: { id3: 'TXXX:MusicBrainz Disc Id', vorbis: 'MUSICBRAINZ_DISCID' },
  acoustId: { id3: 'TXXX:ACOUSTID_ID', vorbis: 'ACOUSTID_ID' },
  acoustIdFingerprint: { id3: 'TXXX:Acoustid Fingerprint', vorbis: 'ACOUSTID_FINGERPRINT' },
  musicIpPuid: { id3: 'TXXX:MusicIP PUID', vorbis: 'MUSICIP_PUID' },
  musicIpFingerprint: { id3: 'TXXX:MusicMagic Fingerprint', vorbis: 'MUSICIP_FINGERPRINT' },
  website: { id3: 'WOAR', vorbis: 'WEBSITE' },
  'performer:instrument': { id3: 'TXXX:PERFORMER:INSTRUMENT', vorbis: 'PERFORMER:INSTRUMENT' },
  averageLevel: { id3: 'PRIV:AverageLevel', vorbis: 'AVERAGELEVEL' },
  peakLevel: { id3: 'PRIV:PeakLevel', vorbis: 'PEAKLEVEL' },
  notes: { id3: 'TXXX:NOTES', vorbis: 'NOTES' },
  originalAlbum: { id3: 'TOAL', vorbis: 'ORIGINALALBUM' },
  originalArtist: { id3: 'TOPE', vorbis: 'ORIGINALARTIST' },
  discogsArtistId: { id3: 'TXXX:DISCOGS_ARTIST_ID', vorbis: 'DISCOGS_ARTIST_ID' },
  discogsReleaseId: { id3: 'TXXX:DISCOGS_RELEASE_ID', vorbis: 'DISCOGS_RELEASE_ID' },
  discogsLabelId: { id3: 'TXXX:DISCOGS_LABEL_ID', vorbis: 'DISCOGS_LABEL_ID' },
  discogsMasterReleaseId: { id3: 'TXXX:DISCOGS_MASTER_RELEASE_ID', vorbis: 'DISCOGS_MASTER_RELEASE_ID' },
  discogsVotes: { id3: 'TXXX:DISCOGS_VOTES', vorbis: 'DISCOGS_VOTES' },
  discogsRating: { id3: 'TXXX:DISCOGS_RATING', vorbis: 'DISCOGS_RATING' },
  replayGainTrackGainRatio: { id3: 'TXXX:REPLAYGAIN_TRACK_GAIN_RATIO', vorbis: 'REPLAYGAIN_TRACK_GAIN_RATIO' },
  replayGainTrackPeakRatio: { id3: 'TXXX:REPLAYGAIN_TRACK_PEAK_RATIO', vorbis: 'REPLAYGAIN_TRACK_PEAK_RATIO' },
  replayGainTrackGain: { id3: 'TXXX:REPLAYGAIN_TRACK_GAIN', vorbis: 'REPLAYGAIN_TRACK_GAIN' },
  replayGainTrackPeak: { id3: 'TXXX:REPLAYGAIN_TRACK_PEAK', vorbis: 'REPLAYGAIN_TRACK_PEAK' },
  replayGainAlbumGain: { id3: 'TXXX:REPLAYGAIN_ALBUM_GAIN', vorbis: 'REPLAYGAIN_ALBUM_GAIN' },
  replayGainAlbumPeak: { id3: 'TXXX:REPLAYGAIN_ALBUM_PEAK', vorbis: 'REPLAYGAIN_ALBUM_PEAK' },
  replayGainUndo: { id3: 'TXXX:MP3GAIN_UNDO', vorbis: 'REPLAYGAIN_UNDO' },
  replayGainTrackMinMax: { id3: 'TXXX:MP3GAIN_MINMAX', vorbis: 'REPLAYGAIN_MINMAX' },
  replayGainAlbumMinMax: { id3: 'TXXX:MP3GAIN_ALBUM_MINMAX', vorbis: 'REPLAYGAIN_ALBUM_MINMAX' },
  key: { id3: 'TKEY', vorbis: 'KEY' },
  categories: { id3: 'TCAT', vorbis: 'CATEGORY' },
  hdVideo: { id3: 'TXXX:HDVIDEO', vorbis: 'HDVIDEO' },
  keywords: { id3: 'TKWD', vorbis: 'KEYWORDS' },
  movement: { id3: 'MVNM', vorbis: 'MOVEMENTNAME' },
  movementNumber: { id3: 'MVIN', vorbis: 'MOVEMENT' },
  podcastId: { id3: 'TGID', vorbis: 'PODCASTID' },
  showMovement: { id3: 'TXXX:SHOWMOVEMENT', vorbis: 'SHOWMOVEMENT' },
  stik: { id3: 'TXXX:STIK', vorbis: 'STIK' },
  playCounter: { id3: 'PCNT', vorbis: 'PLAYCOUNTER' }
} satisfies Record<keyof ICommonTagsResult, { id3: string; vorbis: string }>;

export const canonicalNumberClears = Symbol('canonicalNumberClears');

export function normalizeCommonPatch(input: TagPatch): InternalPatch {
  const patch = { ...input } as InternalPatch;
  for (const key of ['replayGainTrackRange', 'replayGainAlbumRange'] as const) {
    const value = patch[key];
    if (value != null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
      throw new InvalidPatchError(`Invalid ${key}`);
    }
  }
  for (const key of [
    'replayGainTrackGain',
    'replayGainTrackPeak',
    'replayGainAlbumGain',
    'replayGainAlbumPeak'
  ] as const) {
    const value = patch[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const ratio = value as NonNullable<ICommonTagsResult[typeof key]>;
      const isGain = /gain$/i.test(key);
      const number = isGain ? ratio.dB : ratio.ratio;
      if (!Number.isFinite(number)) {
        throw new InvalidPatchError(`Invalid ${key}`);
      }
      patch[key] = `${number}${isGain ? ' dB' : ''}`;
    }
  }
  if (patch.year !== undefined && patch.date === undefined) {
    patch.date = patch.year === null ? null : String(patch.year);
  }
  if (
    patch.movement === null &&
    patch.movementIndex === undefined &&
    patch.movementNumber === undefined &&
    patch.movementTotal === undefined
  ) {
    patch.movementIndex = null;
  }
  for (const [number, total, pair] of [
    ['trackNumber', 'trackTotal', 'track'],
    ['discNumber', 'discTotal', 'disk'],
    ['movementNumber', 'movementTotal', 'movementIndex']
  ] as const) {
    const no = patch[number];
    const of = patch[total];
    if (patch[pair] === null) {
      // An explicit null pair removes every component.
      delete patch[number];
      delete patch[total];
      continue;
    }
    if (no === undefined && of === undefined) {
      continue;
    }
    const merged = patch[pair] ?? {};
    const target = { ...merged };
    if (no !== undefined) {
      target.no = no;
    }
    if (of !== undefined) {
      target.of = of;
    }
    // ASF treats a canonical number-only clear as a whole-pair clear.
    if (pair !== 'movementIndex' && no === null && target.of === undefined) {
      (patch[canonicalNumberClears] ??= new Set()).add(pair);
    }
    patch[pair] = target;
    delete patch[number];
    delete patch[total];
  }
  if (patch.replayGainTrackGainRatio !== undefined && patch.replayGainTrackGain === undefined) {
    const ratio = patch.replayGainTrackGainRatio;
    if (ratio !== null && !(typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0)) {
      throw new InvalidPatchError('Invalid replaygain_track_gain_ratio');
    }
    patch.replayGainTrackGain = ratio === null ? null : `${ratioToDb(ratio)} dB`;
  }
  if (patch.replayGainTrackPeakRatio !== undefined && patch.replayGainTrackPeak === undefined) {
    const ratio = patch.replayGainTrackPeakRatio;
    patch.replayGainTrackPeak = ratio === null ? null : String(ratio);
  }
  return patch;
}

export function commonText(value: unknown, field: string): string[] | null {
  if (value === null) {
    return null;
  }
  const values = Array.isArray(value) ? value : [value];
  return values.map(entry => {
    if (typeof entry === 'string') {
      return entry;
    }
    if (typeof entry === 'boolean') {
      return entry ? '1' : '0';
    }
    if (typeof entry === 'number' && Number.isFinite(entry)) {
      return String(entry);
    }
    throw new InvalidPatchError(`Invalid common field ${field}`);
  });
}

export type InternalPatch = TagPatch & {
  [canonicalNumberClears]?: Set<string>;
  track?: { no?: number | null; of?: number | null } | null;
  disk?: { no?: number | null; of?: number | null } | null;
  movementIndex?: { no?: number | null; of?: number | null } | null;
};

export const EXTRA_COMMON_FIELDS = [
  'mbComposerId',
  'mbOriginalArtistId',
  'mbOriginalReleaseId',
  'directors',
  'originalFilename',
  'itunesCddb1',
  'replayGainAlbumRange',
  'replayGainTrackRange',
  'replayGainReferenceLoudness',
  'albumSort',
  'titleSort',
  'work',
  'composerSort',
  'publishers',
  'djMixers',
  'description',
  'longDescription',
  'discSubtitle',
  'compilation',
  'tvShow',
  'tvShowSort',
  'tvSeason',
  'tvEpisode',
  'tvEpisodeId',
  'tvNetwork',
  'podcast',
  'podcastUrl',
  'language',
  'license',
  'encodedBy',
  'encoderSettings',
  'gapless',
  'mbTrmId',
  'mbDiscId',
  'acoustIdFingerprint',
  'musicIpPuid',
  'musicIpFingerprint',
  'averageLevel',
  'peakLevel',
  'originalAlbum',
  'originalArtist',
  'discogsArtistId',
  'discogsReleaseId',
  'discogsLabelId',
  'discogsMasterReleaseId',
  'discogsVotes',
  'discogsRating',
  'key',
  'categories',
  'hdVideo',
  'keywords',
  'movement',
  'podcastId',
  'showMovement',
  'stik',
  'playCounter'
] as const;

/** Scalar encodings shared with music-metadata's ReplayGain decoders. */
export function structuredText(patch: TagPatch): Record<string, string | null> {
  const fields: Record<string, string | null> = {};
  for (const key of ['replayGainTrackMinMax', 'replayGainAlbumMinMax'] as const) {
    const value = patch[key];
    if (value !== undefined) {
      if (value !== null && (value.length !== 2 || value.some(n => !Number.isSafeInteger(n)))) {
        throw new InvalidPatchError(`Invalid ${key}`);
      }
      fields[key] = value === null ? null : value.join(',');
    }
  }
  if (patch.replayGainUndo !== undefined) {
    const value = patch.replayGainUndo;
    if (value !== null && (!Number.isSafeInteger(value.leftChannel) || !Number.isSafeInteger(value.rightChannel))) {
      throw new InvalidPatchError('Invalid replaygain_undo');
    }
    fields.replayGainUndo = value === null ? null : `${value.leftChannel},${value.rightChannel}`;
  }
  return fields;
}
