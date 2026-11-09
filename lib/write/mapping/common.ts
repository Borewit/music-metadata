import { ratioToDb } from '../../common/Util.js';
import type { ICommonTagsResult } from '../../type.js';
import { InvalidPatchError } from '../core/errors.js';
import type { TagPatch } from '../core/types.js';

/** Native names follow the reader mappings; unmapped fields use descriptive text fields. */
export const COMMON_FIELDS = {
  track: { id3: 'TRCK', vorbis: 'TRACKNUMBER' },
  disk: { id3: 'TPOS', vorbis: 'DISCNUMBER' },
  year: { id3: 'TDRC', vorbis: 'DATE' },
  title: { id3: 'TIT2', vorbis: 'TITLE' },
  artist: { id3: 'TPE1', vorbis: 'ARTIST' },
  artists: { id3: 'TXXX:Artists', vorbis: 'ARTISTS' },
  albumartist: { id3: 'TPE2', vorbis: 'ALBUMARTIST' },
  albumartists: { id3: 'TXXX:DISCOGS_ALBUM_ARTISTS', vorbis: 'DISCOGS_ALBUM_ARTISTS' },
  album: { id3: 'TALB', vorbis: 'ALBUM' },
  date: { id3: 'TDRC', vorbis: 'DATE' },
  originaldate: { id3: 'TDOR', vorbis: 'ORIGINALDATE' },
  originalyear: { id3: 'TXXX:originalyear', vorbis: 'ORIGINALYEAR' },
  releasedate: { id3: 'TDRL', vorbis: 'RELEASEDATE' },
  comment: { id3: 'COMM', vorbis: 'COMMENT' },
  genre: { id3: 'TCON', vorbis: 'GENRE' },
  picture: { id3: 'APIC', vorbis: 'METADATA_BLOCK_PICTURE' },
  composer: { id3: 'TCOM', vorbis: 'COMPOSER' },
  lyrics: { id3: 'USLT', vorbis: 'LYRICS' },
  albumsort: { id3: 'TSOA', vorbis: 'ALBUMSORT' },
  titlesort: { id3: 'TSOT', vorbis: 'TITLESORT' },
  work: { id3: 'TXXX:WORK', vorbis: 'WORK' },
  artistsort: { id3: 'TSOP', vorbis: 'ARTISTSORT' },
  albumartistsort: { id3: 'TSO2', vorbis: 'ALBUMARTISTSORT' },
  composersort: { id3: 'TSOC', vorbis: 'COMPOSERSORT' },
  lyricist: { id3: 'TEXT', vorbis: 'LYRICIST' },
  writer: { id3: 'TXXX:Writer', vorbis: 'WRITER' },
  conductor: { id3: 'TPE3', vorbis: 'CONDUCTOR' },
  remixer: { id3: 'TPE4', vorbis: 'REMIXER' },
  arranger: { id3: 'TIPL:arranger', vorbis: 'ARRANGER' },
  engineer: { id3: 'TIPL:engineer', vorbis: 'ENGINEER' },
  publisher: { id3: 'TPUB', vorbis: 'PUBLISHER' },
  producer: { id3: 'TIPL:producer', vorbis: 'PRODUCER' },
  djmixer: { id3: 'TIPL:DJ-mix', vorbis: 'DJMIXER' },
  mixer: { id3: 'TIPL:mix', vorbis: 'MIXER' },
  technician: { id3: 'TXXX:TECHNICIAN', vorbis: 'TECHNICIAN' },
  label: { id3: 'TPUB', vorbis: 'LABEL' },
  grouping: { id3: 'TIT1', vorbis: 'GROUPING' },
  subtitle: { id3: 'TIT3', vorbis: 'SUBTITLE' },
  description: { id3: 'TDES', vorbis: 'DESCRIPTION' },
  longDescription: { id3: 'TXXX:LONGDESCRIPTION', vorbis: 'LONGDESCRIPTION' },
  discsubtitle: { id3: 'TSST', vorbis: 'DISCSUBTITLE' },
  totaltracks: { id3: 'TRCK', vorbis: 'TRACKTOTAL' },
  totaldiscs: { id3: 'TPOS', vorbis: 'DISCTOTAL' },
  movementTotal: { id3: 'MVIN', vorbis: 'MOVEMENTTOTAL' },
  compilation: { id3: 'TCMP', vorbis: 'COMPILATION' },
  rating: { id3: 'POPM', vorbis: 'RATING' },
  bpm: { id3: 'TBPM', vorbis: 'BPM' },
  mood: { id3: 'TMOO', vorbis: 'MOOD' },
  media: { id3: 'TMED', vorbis: 'MEDIA' },
  catalognumber: { id3: 'TXXX:CATALOGNUMBER', vorbis: 'CATALOGNUMBER' },
  tvShow: { id3: 'TXXX:TVSHOW', vorbis: 'TVSHOW' },
  tvShowSort: { id3: 'TXXX:TVSHOWSORT', vorbis: 'TVSHOWSORT' },
  tvSeason: { id3: 'TXXX:TVSEASON', vorbis: 'TVSEASON' },
  tvEpisode: { id3: 'TXXX:TVEPISODE', vorbis: 'TVEPISODE' },
  tvEpisodeId: { id3: 'TXXX:TVEPISODEID', vorbis: 'TVEPISODEID' },
  tvNetwork: { id3: 'TXXX:TVNETWORK', vorbis: 'TVNETWORK' },
  podcast: { id3: 'PCST', vorbis: 'PODCAST' },
  podcasturl: { id3: 'WFED', vorbis: 'PODCASTURL' },
  releasestatus: { id3: 'TXXX:MusicBrainz Album Status', vorbis: 'RELEASESTATUS' },
  releasetype: { id3: 'TXXX:MusicBrainz Album Type', vorbis: 'RELEASETYPE' },
  releasecountry: { id3: 'TXXX:MusicBrainz Album Release Country', vorbis: 'RELEASECOUNTRY' },
  script: { id3: 'TXXX:SCRIPT', vorbis: 'SCRIPT' },
  language: { id3: 'TLAN', vorbis: 'LANGUAGE' },
  copyright: { id3: 'TCOP', vorbis: 'COPYRIGHT' },
  license: { id3: 'WCOP', vorbis: 'LICENSE' },
  encodedby: { id3: 'TENC', vorbis: 'ENCODEDBY' },
  encodersettings: { id3: 'TSSE', vorbis: 'ENCODERSETTINGS' },
  gapless: { id3: 'TXXX:GAPLESS', vorbis: 'GAPLESS' },
  barcode: { id3: 'TXXX:BARCODE', vorbis: 'BARCODE' },
  isrc: { id3: 'TXXX:ISRC', vorbis: 'ISRC' },
  asin: { id3: 'TXXX:ASIN', vorbis: 'ASIN' },
  musicbrainz_recordingid: { id3: 'UFID', vorbis: 'MUSICBRAINZ_TRACKID' },
  musicbrainz_trackid: { id3: 'TXXX:MusicBrainz Release Track Id', vorbis: 'MUSICBRAINZ_RELEASETRACKID' },
  musicbrainz_albumid: { id3: 'TXXX:MusicBrainz Album Id', vorbis: 'MUSICBRAINZ_ALBUMID' },
  musicbrainz_artistid: { id3: 'TXXX:MusicBrainz Artist Id', vorbis: 'MUSICBRAINZ_ARTISTID' },
  musicbrainz_albumartistid: { id3: 'TXXX:MusicBrainz Album Artist Id', vorbis: 'MUSICBRAINZ_ALBUMARTISTID' },
  musicbrainz_releasegroupid: { id3: 'TXXX:MusicBrainz Release Group Id', vorbis: 'MUSICBRAINZ_RELEASEGROUPID' },
  musicbrainz_workid: { id3: 'TXXX:MusicBrainz Work Id', vorbis: 'MUSICBRAINZ_WORKID' },
  musicbrainz_trmid: { id3: 'TXXX:MusicBrainz TRM Id', vorbis: 'MUSICBRAINZ_TRMID' },
  musicbrainz_discid: { id3: 'TXXX:MusicBrainz Disc Id', vorbis: 'MUSICBRAINZ_DISCID' },
  acoustid_id: { id3: 'TXXX:ACOUSTID_ID', vorbis: 'ACOUSTID_ID' },
  acoustid_fingerprint: { id3: 'TXXX:Acoustid Fingerprint', vorbis: 'ACOUSTID_ID_FINGERPRINT' },
  musicip_puid: { id3: 'TXXX:MusicIP PUID', vorbis: 'MUSICIP_PUID' },
  musicip_fingerprint: { id3: 'TXXX:MusicMagic Fingerprint', vorbis: 'MUSICIP_FINGERPRINT' },
  website: { id3: 'WOAR', vorbis: 'WEBSITE' },
  'performer:instrument': { id3: 'TXXX:PERFORMER:INSTRUMENT', vorbis: 'PERFORMER:INSTRUMENT' },
  averageLevel: { id3: 'PRIV:AverageLevel', vorbis: 'AVERAGELEVEL' },
  peakLevel: { id3: 'PRIV:PeakLevel', vorbis: 'PEAKLEVEL' },
  notes: { id3: 'TXXX:NOTES', vorbis: 'NOTES' },
  originalalbum: { id3: 'TOAL', vorbis: 'ORIGINALALBUM' },
  originalartist: { id3: 'TOPE', vorbis: 'ORIGINALARTIST' },
  discogs_artist_id: { id3: 'TXXX:DISCOGS_ARTIST_ID', vorbis: 'DISCOGS_ARTIST_ID' },
  discogs_release_id: { id3: 'TXXX:DISCOGS_RELEASE_ID', vorbis: 'DISCOGS_RELEASE_ID' },
  discogs_label_id: { id3: 'TXXX:DISCOGS_LABEL_ID', vorbis: 'DISCOGS_LABEL_ID' },
  discogs_master_release_id: { id3: 'TXXX:DISCOGS_MASTER_RELEASE_ID', vorbis: 'DISCOGS_MASTER_RELEASE_ID' },
  discogs_votes: { id3: 'TXXX:DISCOGS_VOTES', vorbis: 'DISCOGS_VOTES' },
  discogs_rating: { id3: 'TXXX:DISCOGS_RATING', vorbis: 'DISCOGS_RATING' },
  replaygain_track_gain_ratio: { id3: 'TXXX:REPLAYGAIN_TRACK_GAIN_RATIO', vorbis: 'REPLAYGAIN_TRACK_GAIN_RATIO' },
  replaygain_track_peak_ratio: { id3: 'TXXX:REPLAYGAIN_TRACK_PEAK_RATIO', vorbis: 'REPLAYGAIN_TRACK_PEAK_RATIO' },
  replaygain_track_gain: { id3: 'TXXX:REPLAYGAIN_TRACK_GAIN', vorbis: 'REPLAYGAIN_TRACK_GAIN' },
  replaygain_track_peak: { id3: 'TXXX:REPLAYGAIN_TRACK_PEAK', vorbis: 'REPLAYGAIN_TRACK_PEAK' },
  replaygain_album_gain: { id3: 'TXXX:REPLAYGAIN_ALBUM_GAIN', vorbis: 'REPLAYGAIN_ALBUM_GAIN' },
  replaygain_album_peak: { id3: 'TXXX:REPLAYGAIN_ALBUM_PEAK', vorbis: 'REPLAYGAIN_ALBUM_PEAK' },
  replaygain_undo: { id3: 'TXXX:MP3GAIN_UNDO', vorbis: 'REPLAYGAIN_UNDO' },
  replaygain_track_minmax: { id3: 'TXXX:MP3GAIN_MINMAX', vorbis: 'REPLAYGAIN_MINMAX' },
  replaygain_album_minmax: { id3: 'TXXX:MP3GAIN_ALBUM_MINMAX', vorbis: 'REPLAYGAIN_ALBUM_MINMAX' },
  key: { id3: 'TKEY', vorbis: 'KEY' },
  category: { id3: 'TCAT', vorbis: 'CATEGORY' },
  hdVideo: { id3: 'TXXX:HDVIDEO', vorbis: 'HDVIDEO' },
  keywords: { id3: 'TKWD', vorbis: 'KEYWORDS' },
  movement: { id3: 'MVNM', vorbis: 'MOVEMENT' },
  movementIndex: { id3: 'MVIN', vorbis: 'MOVEMENTNUMBER' },
  podcastId: { id3: 'TGID', vorbis: 'PODCASTID' },
  showMovement: { id3: 'TXXX:SHOWMOVEMENT', vorbis: 'SHOWMOVEMENT' },
  stik: { id3: 'TXXX:STIK', vorbis: 'STIK' },
  playCounter: { id3: 'PCNT', vorbis: 'PLAYCOUNTER' }
} satisfies Record<keyof ICommonTagsResult, { id3: string; vorbis: string }>;

export function normalizeCommonPatch(input: TagPatch): TagPatch {
  const patch = { ...input };
  for (const key of [
    'replaygain_track_gain',
    'replaygain_track_peak',
    'replaygain_album_gain',
    'replaygain_album_peak'
  ] as const) {
    const value = patch[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const ratio = value as NonNullable<ICommonTagsResult[typeof key]>;
      const number = key.endsWith('gain') ? ratio.dB : ratio.ratio;
      if (!Number.isFinite(number)) {
        throw new InvalidPatchError(`Invalid ${key}`);
      }
      patch[key] = `${number}${key.endsWith('gain') ? ' dB' : ''}`;
    }
  }
  if (patch.year !== undefined && patch.date === undefined) {
    patch.date = patch.year === null ? null : String(patch.year);
  }
  for (const [alias, key] of [
    ['totaltracks', 'track'],
    ['totaldiscs', 'disk'],
    ['movementTotal', 'movementIndex']
  ] as const) {
    if (patch[alias] !== undefined && patch[key] !== null && patch[key]?.of === undefined) {
      const value = patch[alias];
      const total = value === null ? null : Number(value);
      if (total !== null && (!Number.isSafeInteger(total) || total < 0)) {
        throw new InvalidPatchError(`Invalid ${alias}`);
      }
      patch[key] = { ...patch[key], of: total };
    }
  }
  if (patch.replaygain_track_gain_ratio !== undefined && patch.replaygain_track_gain === undefined) {
    const ratio = patch.replaygain_track_gain_ratio;
    if (ratio !== null && !(typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0)) {
      throw new InvalidPatchError('Invalid replaygain_track_gain_ratio');
    }
    patch.replaygain_track_gain = ratio === null ? null : `${ratioToDb(ratio)} dB`;
  }
  if (patch.replaygain_track_peak_ratio !== undefined && patch.replaygain_track_peak === undefined) {
    const ratio = patch.replaygain_track_peak_ratio;
    patch.replaygain_track_peak = ratio === null ? null : String(ratio);
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

export const EXTRA_COMMON_FIELDS = [
  'albumsort',
  'titlesort',
  'work',
  'composersort',
  'publisher',
  'djmixer',
  'description',
  'longDescription',
  'discsubtitle',
  'compilation',
  'tvShow',
  'tvShowSort',
  'tvSeason',
  'tvEpisode',
  'tvEpisodeId',
  'tvNetwork',
  'podcast',
  'podcasturl',
  'language',
  'license',
  'encodedby',
  'encodersettings',
  'gapless',
  'musicbrainz_trmid',
  'musicbrainz_discid',
  'acoustid_fingerprint',
  'musicip_puid',
  'musicip_fingerprint',
  'averageLevel',
  'peakLevel',
  'originalalbum',
  'originalartist',
  'discogs_artist_id',
  'discogs_release_id',
  'discogs_label_id',
  'discogs_master_release_id',
  'discogs_votes',
  'discogs_rating',
  'key',
  'category',
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
  for (const key of ['replaygain_track_minmax', 'replaygain_album_minmax'] as const) {
    const value = patch[key];
    if (value !== undefined) {
      if (value !== null && (value.length !== 2 || value.some(n => !Number.isSafeInteger(n)))) {
        throw new InvalidPatchError(`Invalid ${key}`);
      }
      fields[key] = value === null ? null : value.join(',');
    }
  }
  if (patch.replaygain_undo !== undefined) {
    const value = patch.replaygain_undo;
    if (value !== null && (!Number.isSafeInteger(value.leftChannel) || !Number.isSafeInteger(value.rightChannel))) {
      throw new InvalidPatchError('Invalid replaygain_undo');
    }
    fields.replaygain_undo = value === null ? null : `${value.leftChannel},${value.rightChannel}`;
  }
  return fields;
}
