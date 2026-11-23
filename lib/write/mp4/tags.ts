import * as Token from 'token-types';
import { CommonTagMapper } from '../../common/GenericTagMapper.js';
import { decodeUtf8, encodeUtf8 } from '../core/bytes.js';
import { InvalidFileError, InvalidPatchError, UnsupportedFeatureError } from '../core/errors.js';
import { lyricsText, normalizeLyrics } from '../core/lyrics.js';
import { normalizeNumberPair } from '../core/patch.js';
import type { TagPatch } from '../core/types.js';
import { structuredText } from '../mapping/common.js';
import { type AtomBudget, atom, type Box, boxes, copyBox, header, maxAtoms, zeros } from './atoms.js';

const u32 = (n: number) => {
  const b = new Uint8Array(4);
  Token.UINT32_BE.put(b, 0, n);
  return b;
};
const textAtoms: Record<string, string> = {
  categories: 'catg',
  podcastId: 'egid',
  podcastUrl: 'purl',
  tvShow: 'tvsh',
  tvShowSort: 'sosn',
  tvEpisodeId: 'tven',
  tvNetwork: 'tvnn',
  keywords: 'keyw',
  title: '©nam',
  artist: '©ART',
  albumArtist: 'aART',
  album: '©alb',
  date: '©day',
  year: '©day',
  genres: '©gen',
  composers: '©wrt',
  comments: '©cmt',
  copyright: 'cprt',
  description: 'desc',
  longDescription: 'ldes',
  work: '©wrk',
  movement: '©mvn',
  directors: '©dir',
  encodedBy: '©too',
  grouping: '©grp',
  albumSort: 'soal',
  titleSort: 'sonm',
  artistSort: 'soar',
  albumArtistSort: 'soaa',
  composerSort: 'soco'
};
const freeform: Record<string, string> = {
  mbComposerId: 'MusicBrainz Composer Id',
  mbOriginalArtistId: 'MusicBrainz Original Artist Id',
  mbOriginalReleaseId: 'MusicBrainz Original Album Id',
  itunesCddb1: 'iTunes_CDDB_1',
  replayGainAlbumRange: 'REPLAYGAIN_ALBUM_RANGE',
  replayGainTrackRange: 'REPLAYGAIN_TRACK_RANGE',
  replayGainReferenceLoudness: 'REPLAYGAIN_REFERENCE_LOUDNESS',
  arrangers: 'ARRANGER',
  'performer:instrument': 'PERFORMER',
  artists: 'ARTISTS',
  albumArtists: 'ALBUMARTISTS',
  lyricists: 'LYRICIST',
  conductors: 'CONDUCTOR',
  remixers: 'REMIXER',
  djMixers: 'DJMIXER',
  engineers: 'ENGINEER',
  producers: 'PRODUCER',
  originalDate: 'ORIGINALDATE',
  originalYear: 'ORIGINALYEAR',
  releaseDate: 'RELEASEDATE',
  releaseStatus: 'MusicBrainz Album Status',
  releaseType: 'MusicBrainz Album Type',
  releaseCountry: 'MusicBrainz Album Release Country',
  mood: 'MOOD',
  media: 'MEDIA',
  subtitles: 'SUBTITLE',
  discSubtitle: 'DISCSUBTITLE',
  script: 'SCRIPT',
  asin: 'ASIN',
  mixers: 'MIXER',
  labels: 'LABEL',
  language: 'LANGUAGE',
  key: 'initialkey',
  isrcs: 'ISRC',
  catalogNumber: 'CATALOGNUMBER',
  barcode: 'BARCODE',
  license: 'LICENSE',
  performer: 'PERFORMER',
  mbRecordingId: 'MusicBrainz Track Id',
  mbReleaseTrackId: 'MusicBrainz Release Track Id',
  mbReleaseId: 'MusicBrainz Album Id',
  mbArtistId: 'MusicBrainz Artist Id',
  mbAlbumArtistId: 'MusicBrainz Album Artist Id',
  mbReleaseGroupId: 'MusicBrainz Release Group Id',
  mbWorkId: 'MusicBrainz Work Id',
  mbDiscId: 'MusicBrainz Disc Id',
  mbTrmId: 'MusicBrainz TRM Id',
  acoustId: 'Acoustid Id',
  acoustIdFingerprint: 'Acoustid Fingerprint',
  musicIpPuid: 'MusicIP PUID',
  musicIpFingerprint: 'fingerprint',
  replayGainTrackGain: 'replaygain_track_gain',
  replayGainTrackPeak: 'replaygain_track_peak',
  replayGainAlbumGain: 'replaygain_album_gain',
  replayGainAlbumPeak: 'replaygain_album_peak',
  replayGainTrackMinMax: 'replaygain_track_minmax',
  replayGainAlbumMinMax: 'replaygain_album_minmax',
  replayGainUndo: 'replaygain_undo'
};
const data = (type: number, value: Uint8Array) => atom('data', u32(type), zeros, value);
function values(value: unknown): string[] {
  if (typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))) {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap(values);
  }
  if (value && typeof value === 'object' && 'text' in value) {
    return values(value.text);
  }
  throw new InvalidPatchError('MP4 text must be a string, number or text array');
}
function item(key: string, value: unknown): Uint8Array {
  const payload = values(value).map(v => data(1, encodeUtf8(v)));
  if (key.startsWith('----:')) {
    const [, mean, ...name] = key.split(':');
    if (!mean || !name.length) {
      throw new InvalidPatchError('Use ----:mean:name for MP4 freeform tags');
    }
    return atom(
      '----',
      atom('mean', zeros, encodeUtf8(mean)),
      atom('name', zeros, encodeUtf8(name.join(':'))),
      ...payload
    );
  }
  if (key === '----' || !/^[\x20-\xff]{4}$/.test(key)) {
    throw new InvalidPatchError('Invalid MP4 metadata key');
  }
  return atom(key, ...payload);
}
function itemKey(bytes: Uint8Array, box: Box, budget: AtomBudget): string {
  if (box.type !== '----') {
    return box.type;
  }
  const fields = boxes(bytes, box.start + box.header, box.end, budget);
  const text = (type: string) => {
    const field = fields.find(b => b.type === type);
    if (!field || field.end - field.start < field.header + 4) {
      throw new InvalidFileError('Invalid MP4 freeform item');
    }
    // biome-ignore lint/style/noRestrictedGlobals: Standard UTF decoding is supported in Node 22 and browsers.
    return new TextDecoder().decode(bytes.subarray(field.start + field.header + 4, field.end));
  };
  return `----:${text('mean')}:${text('name')}`;
}
/** Raw values contain the complete item body, including freeform identity children. */
function rawItem(key: string, body: Uint8Array): Uint8Array {
  const bytes = atom(key.startsWith('----:') ? '----' : key, body);
  if (key.startsWith('----:')) {
    let actual: string;
    try {
      actual = itemKey(bytes, header(bytes, 0, bytes.length), { remaining: maxAtoms });
    } catch (error) {
      if (!(error instanceof InvalidFileError)) {
        throw error;
      }
      throw new InvalidPatchError('Raw MP4 freeform bodies require mean and name children', { cause: error });
    }
    if (actual.toLowerCase() !== key.toLowerCase()) {
      throw new InvalidPatchError('Raw MP4 freeform identity must match its native key');
    }
  }
  return bytes;
}
export function editItems(
  bytes: Uint8Array,
  patch: TagPatch,
  budget: AtomBudget = { remaining: maxAtoms }
): Uint8Array {
  const existing = boxes(bytes, 0, bytes.length, budget).map(box => ({
    key: itemKey(bytes, box, budget),
    bytes: copyBox(bytes, box)
  }));
  const replacements = new Map<string, Uint8Array | null>();
  const canonical = (key: string) => (key.startsWith('----:') ? key.toLowerCase() : key);
  const replace = (key: string, value: Uint8Array | null) => replacements.set(canonical(key), value);
  const entries: Record<string, unknown> = { ...patch, ...structuredText(patch) };
  const aliases = new Set([
    'trackTotal',
    'discTotal',
    'movementTotal',
    'replayGainTrackGainRatio',
    'replayGainTrackPeakRatio'
  ]);
  for (const [field, value] of Object.entries(entries)) {
    if (
      aliases.has(field) ||
      value === undefined ||
      field === 'native' ||
      field === 'chapters' ||
      field === 'picture' ||
      field === 'lyrics' ||
      field === 'track' ||
      field === 'disk' ||
      field === 'movementIndex' ||
      field === 'bpm' ||
      field === 'stik' ||
      field === 'hdVideo' ||
      field === 'tvSeason' ||
      field === 'tvEpisode' ||
      field === 'podcast' ||
      field === 'showMovement' ||
      field === 'compilation' ||
      field === 'gapless'
    ) {
      continue;
    }
    const key = textAtoms[field] ?? (freeform[field] ? `----:com.apple.iTunes:${freeform[field]}` : undefined);
    if (!key) {
      throw new UnsupportedFeatureError(`MP4 common field is not writable: ${field}`);
    }
    // Full dates take precedence over a year alias.
    if (field === 'year' && entries.date !== undefined) {
      continue;
    }
    replace(key, value === null || value === '' ? null : item(key, value));
  }
  if (patch.lyrics !== undefined) {
    const lyrics = normalizeLyrics(patch.lyrics);
    // ©lyr is a text item. Synchronized-only input keeps its line text and
    // loses timing; ID3 attributes are not representable in this item.
    replace('©lyr', lyrics ? item('©lyr', lyrics.map(lyricsText)) : null);
  }
  for (const field of ['track', 'disk'] as const) {
    const value = patch[field];
    if (value === undefined) {
      continue;
    }
    const key = field === 'track' ? 'trkn' : 'disk';
    if (value === null) {
      replace(key, null);
      continue;
    }
    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new InvalidPatchError('MP4 track/disc must be a number pair');
    }
    const old = existing.find(e => e.key === key);
    let no = 0;
    let of = 0;
    if (old) {
      const child = boxes(old.bytes, header(old.bytes, 0, old.bytes.length).header, old.bytes.length, budget).find(
        b => b.type === 'data'
      );
      if (child && child.end - child.start >= 22) {
        no = Token.UINT16_BE.get(old.bytes, child.start + child.header + 10);
        of = Token.UINT16_BE.get(old.bytes, child.start + child.header + 12);
      }
    }
    no = value.no === undefined ? no : (value.no ?? 0);
    of = value.of === undefined ? of : (value.of ?? 0);
    if (![no, of].every(n => Number.isInteger(n) && n >= 0 && n <= 65535)) {
      throw new InvalidPatchError('MP4 track/disc exceeds uint16');
    }
    const pair = new Uint8Array(field === 'track' ? 8 : 6);
    Token.UINT16_BE.put(pair, 2, no);
    Token.UINT16_BE.put(pair, 4, of);
    replace(key, atom(key, data(0, pair)));
  }
  const movement = normalizeNumberPair(patch.movementIndex, 'movementIndex');
  const movementAlias = '----:com.apple.iTunes:Movement';
  if (movement && (movement.no === undefined) !== (movement.of === undefined)) {
    const alias = existing.find(e => canonical(e.key) === canonical(movementAlias));
    if (alias) {
      const body = alias.bytes;
      const child = boxes(body, header(body, 0, body.length).header, body.length, budget).find(b => b.type === 'data');
      if (
        child &&
        child.end >= child.start + child.header + 8 &&
        [1, 18].includes(Token.UINT32_BE.get(body, child.start + child.header))
      ) {
        const pair = CommonTagMapper.normalizeTrack(
          decodeUtf8(body.subarray(child.start + child.header + 8, child.end))
        );
        if (movement.no === undefined && !existing.some(e => e.key === '©mvi')) {
          movement.no = pair.no;
        }
        if (
          movement.of === undefined &&
          !existing.some(e => e.key === '©mvc' || canonical(e.key) === canonical(`${movementAlias} Total`))
        ) {
          movement.of = pair.of;
        }
        replace(movementAlias, null);
      }
    }
  }
  for (const [key, alias, value] of [
    ['©mvi', 'Movement', movement === null ? null : movement?.no],
    ['©mvc', 'Movement Total', movement === null ? null : movement?.of]
  ] as const) {
    if (value === undefined) {
      continue;
    }
    replace(`----:com.apple.iTunes:${alias}`, null);
    if (value === null) {
      replace(key, null);
      continue;
    }
    if (value > 0x7fffffff) {
      throw new InvalidPatchError('MP4 movement number exceeds int32');
    }
    replace(key, atom(key, data(21, u32(value))));
  }
  if (patch.movement !== undefined) {
    replace('----:com.apple.iTunes:Movement Name', null);
  }
  for (const [field, key] of [
    ['stik', 'stik'],
    ['hdVideo', 'hdvd']
  ] as const) {
    const value = patch[field];
    if (value === undefined) {
      continue;
    }
    if (value !== null && (!Number.isInteger(value) || value < 0 || value > 255)) {
      throw new InvalidPatchError(`MP4 ${field} exceeds uint8`);
    }
    replace(key, value === null ? null : atom(key, data(22, Uint8Array.of(value))));
  }
  for (const [field, key] of [
    ['tvSeason', 'tvsn'],
    ['tvEpisode', 'tves']
  ] as const) {
    const value = patch[field];
    if (value === undefined) {
      continue;
    }
    if (value === null) {
      replace(key, null);
      continue;
    }
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new InvalidPatchError(`MP4 ${field} must be a non-negative safe integer`);
    }
    // Use the usual four-byte signed representation, widening rather than overflowing.
    const bytes = new Uint8Array(value <= 0x7fffffff ? 4 : 8);
    if (bytes.length === 4) {
      Token.UINT32_BE.put(bytes, 0, value);
    } else {
      Token.UINT64_BE.put(bytes, 0, BigInt(value));
    }
    replace(key, atom(key, data(21, bytes)));
  }
  if (patch.bpm !== undefined) {
    if (patch.bpm === null) {
      replace('tmpo', null);
    } else {
      const bpm = Number(patch.bpm);
      if (!Number.isInteger(bpm) || bpm < 0 || bpm > 65535) {
        throw new InvalidPatchError('MP4 BPM exceeds uint16');
      }
      const b = new Uint8Array(2);
      Token.UINT16_BE.put(b, 0, bpm);
      replace('tmpo', atom('tmpo', data(21, b)));
    }
  }
  for (const [field, key] of [
    ['compilation', 'cpil'],
    ['gapless', 'pgap'],
    ['podcast', 'pcst'],
    ['showMovement', 'shwm']
  ] as const) {
    const value = patch[field];
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value !== 'boolean') {
      throw new InvalidPatchError(`MP4 ${field} must be a boolean`);
    }
    replace(key, value === null ? null : atom(key, data(21, Uint8Array.of(value ? 1 : 0))));
  }
  if (patch.picture !== undefined) {
    replace(
      'covr',
      patch.picture === null || patch.picture.length === 0
        ? null
        : atom(
            'covr',
            ...patch.picture.map(picture => {
              const type =
                picture.format.toLowerCase() === 'image/png'
                  ? 14
                  : /^image\/(jpeg|jpg)$/i.test(picture.format)
                    ? 13
                    : 0;
              if (!type) {
                throw new UnsupportedFeatureError('MP4 artwork must be JPEG or PNG');
              }
              return data(type, picture.data);
            })
          )
    );
  }
  // Remove legacy aliases when replacing their canonical common field.
  if (patch.genres !== undefined) {
    replace('gnre', null);
  }
  if (patch.comments !== undefined) {
    replace('©com', null);
  }
  if (patch.copyright !== undefined) {
    replace('©cpy', null);
  }
  for (const [key, value] of Object.entries(patch.native ?? {})) {
    if (value === undefined) {
      continue;
    }
    if (!/^[\x20-\xff]{4}$/.test(key) && !/^----:[^:]+:.+$/.test(key)) {
      throw new InvalidPatchError('Invalid MP4 native key');
    }
    if (
      ['trkn', 'disk', 'tmpo', 'cpil', 'pgap', 'pcst', 'tvsn', 'tves', 'covr'].includes(key) &&
      value !== null &&
      !(value instanceof Uint8Array)
    ) {
      throw new InvalidPatchError(`Native MP4 ${key} requires a raw item body`);
    }
    replace(key, value === null ? null : value instanceof Uint8Array ? rawItem(key, value) : item(key, value));
  }
  return atom(
    'ilst',
    ...existing.filter(e => !replacements.has(canonical(e.key))).map(e => e.bytes),
    ...[...replacements.values()].filter((v): v is Uint8Array => v !== null)
  );
}
