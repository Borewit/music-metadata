import * as Token from 'token-types';
import { encodeUtf8 } from '../core/bytes.js';
import { InvalidFileError, InvalidPatchError, UnsupportedFeatureError } from '../core/errors.js';
import { lyricsText, normalizeLyrics } from '../core/lyrics.js';
import type { TagPatch } from '../core/types.js';
import { type AtomBudget, atom, type Box, boxes, copyBox, header, maxAtoms, zeros } from './atoms.js';

const u32 = (n: number) => {
  const b = new Uint8Array(4);
  Token.UINT32_BE.put(b, 0, n);
  return b;
};
const textAtoms: Record<string, string> = {
  title: '©nam',
  artist: '©ART',
  artists: '©ART',
  albumartist: 'aART',
  albumartists: 'aART',
  album: '©alb',
  date: '©day',
  year: '©day',
  genre: '©gen',
  composer: '©wrt',
  comment: '©cmt',
  copyright: 'cprt',
  description: 'desc',
  longDescription: 'ldes',
  work: '©wrk',
  encodedby: '©too',
  grouping: '©grp',
  albumsort: 'soal',
  titlesort: 'sonm',
  artistsort: 'soar',
  albumartistsort: 'soaa',
  composersort: 'soco'
};
const freeform: Record<string, string> = {
  lyricist: 'LYRICIST',
  conductor: 'CONDUCTOR',
  remixer: 'REMIXER',
  engineer: 'ENGINEER',
  producer: 'PRODUCER',
  originaldate: 'ORIGINALDATE',
  originalyear: 'ORIGINALYEAR',
  releasedate: 'RELEASEDATE',
  releasestatus: 'MusicBrainz Album Status',
  releasetype: 'MusicBrainz Album Type',
  releasecountry: 'MusicBrainz Album Release Country',
  mood: 'MOOD',
  media: 'MEDIA',
  subtitle: 'SUBTITLE',
  discsubtitle: 'DISCSUBTITLE',
  script: 'SCRIPT',
  asin: 'ASIN',
  mixer: 'MIXER',
  label: 'LABEL',
  language: 'LANGUAGE',
  key: 'initialkey',
  isrc: 'ISRC',
  catalognumber: 'CATALOGNUMBER',
  barcode: 'BARCODE',
  license: 'LICENSE',
  performer: 'PERFORMER',
  musicbrainz_recordingid: 'MusicBrainz Track Id',
  musicbrainz_trackid: 'MusicBrainz Release Track Id',
  musicbrainz_albumid: 'MusicBrainz Album Id',
  musicbrainz_artistid: 'MusicBrainz Artist Id',
  musicbrainz_albumartistid: 'MusicBrainz Album Artist Id',
  musicbrainz_releasegroupid: 'MusicBrainz Release Group Id',
  musicbrainz_workid: 'MusicBrainz Work Id',
  musicbrainz_discid: 'MusicBrainz Disc Id',
  replaygain_track_gain: 'replaygain_track_gain',
  replaygain_track_peak: 'replaygain_track_peak',
  replaygain_album_gain: 'replaygain_album_gain',
  replaygain_album_peak: 'replaygain_album_peak'
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
  const entries = patch as Record<string, unknown>;
  const aliases = new Set(['totaltracks', 'totaldiscs', 'replaygain_track_gain_ratio', 'replaygain_track_peak_ratio']);
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
      field === 'bpm' ||
      field === 'compilation' ||
      field === 'gapless'
    ) {
      continue;
    }
    const key = textAtoms[field] ?? (freeform[field] ? `----:com.apple.iTunes:${freeform[field]}` : undefined);
    if (!key) {
      throw new UnsupportedFeatureError(`MP4 common field is not writable: ${field}`);
    }
    if (
      (field === 'artist' && entries.artists !== undefined) ||
      (field === 'albumartist' && entries.albumartists !== undefined)
    ) {
      continue;
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
    ['gapless', 'pgap']
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
  if (patch.genre !== undefined) {
    replace('gnre', null);
  }
  if (patch.comment !== undefined) {
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
      ['trkn', 'disk', 'tmpo', 'cpil', 'pgap', 'covr'].includes(key) &&
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
