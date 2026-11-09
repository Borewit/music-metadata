import { textEncode } from '@borewit/text-codec';
import { InvalidPatchError, UnsupportedFeatureError } from '../core/errors.js';
import { normalizeLyrics } from '../core/lyrics.js';
import { normalizeComments, normalizeNumberPair, textValues, validatePictures } from '../core/patch.js';
import type { TagPatch } from '../core/types.js';
import { decodeText, type Frame } from '../id3v2/frames.js';
import { COMMON_FIELDS, commonText, EXTRA_COMMON_FIELDS, structuredText } from './common.js';

const textFields = {
  title: 'TIT2',
  artist: 'TPE1',
  artists: 'TXXX:Artists',
  albumartist: 'TPE2',
  albumartists: 'TPE2',
  album: 'TALB',
  date: 'TDRC',
  originaldate: 'TDOR',
  releasedate: 'TDRL',
  genre: 'TCON',
  composer: 'TCOM',
  lyricist: 'TEXT',
  writer: 'TXXX:Writer',
  conductor: 'TPE3',
  remixer: 'TPE4',
  label: 'TPUB',
  catalognumber: 'TXXX:CATALOGNUMBER',
  isrc: 'TSRC',
  copyright: 'TCOP',
  media: 'TMED',
  mood: 'TMOO',
  grouping: 'TIT1',
  subtitle: 'TIT3',
  website: 'WOAR',
  barcode: 'TXXX:BARCODE',
  asin: 'TXXX:ASIN',
  script: 'TXXX:SCRIPT',
  releasestatus: 'TXXX:MusicBrainz Album Status',
  releasetype: 'TXXX:MusicBrainz Album Type',
  releasecountry: 'TXXX:MusicBrainz Album Release Country',
  acoustid_id: 'TXXX:Acoustid Id',
  artistsort: 'TSOP',
  albumartistsort: 'TSO2',
  musicbrainz_trackid: 'TXXX:MusicBrainz Release Track Id',
  musicbrainz_albumid: 'TXXX:MusicBrainz Album Id',
  musicbrainz_artistid: 'TXXX:MusicBrainz Artist Id',
  musicbrainz_albumartistid: 'TXXX:MusicBrainz Album Artist Id',
  musicbrainz_releasegroupid: 'TXXX:MusicBrainz Release Group Id',
  musicbrainz_workid: 'TXXX:MusicBrainz Work Id',
  replaygain_track_gain: 'TXXX:REPLAYGAIN_TRACK_GAIN',
  replaygain_track_peak: 'TXXX:REPLAYGAIN_TRACK_PEAK',
  replaygain_album_gain: 'TXXX:REPLAYGAIN_ALBUM_GAIN',
  replaygain_album_peak: 'TXXX:REPLAYGAIN_ALBUM_PEAK'
} as const;

export function applyId3Patch(frames: Frame[], patch: TagPatch, replace: (key: string, value: unknown) => void): void {
  for (const key of EXTRA_COMMON_FIELDS) {
    if (patch[key] !== undefined) {
      if (key === 'djmixer') {
        continue;
      }
      if (key === 'averageLevel' || key === 'peakLevel') {
        const value = patch[key];
        const owner = key === 'averageLevel' ? 'AverageLevel' : 'PeakLevel';
        const prefix = textEncode(`${owner}\0`, 'latin1');
        if (value !== null && (!Number.isInteger(value) || value < 0 || value > 0xffffffff)) {
          throw new InvalidPatchError(`Invalid ${key}`);
        }
        for (let i = frames.length - 1; i >= 0; i--) {
          const frame = frames[i];
          if (frame.id === 'PRIV' && prefix.every((byte, index) => frame.data[index] === byte)) {
            frames.splice(i, 1);
          }
        }
        if (value !== null) {
          const data = new Uint8Array(prefix.length + 4);
          data.set(prefix);
          new DataView(data.buffer).setUint32(prefix.length, value, true);
          frames.push({ id: 'PRIV', flags: 0, data });
        }
        continue;
      }
      const values = commonText(patch[key], key);
      replace(COMMON_FIELDS[key].id3, values);
    }
  }
  for (const [key, frame] of Object.entries(textFields)) {
    const value = patch[key as keyof typeof textFields];
    if (value !== undefined) {
      replace(frame, textValues(value as import('../core/types.js').TextPatch));
    }
  }
  if (patch.notes !== undefined) {
    replace('TXXX:NOTES', textValues(patch.notes));
  }
  if (patch.technician !== undefined) {
    replace('TXXX:TECHNICIAN', textValues(patch.technician));
  }
  if (patch['performer:instrument'] !== undefined) {
    replace('TXXX:PERFORMER:INSTRUMENT', commonText(patch['performer:instrument'], 'performer:instrument'));
  }
  for (const [key, value] of Object.entries(structuredText(patch))) {
    replace(COMMON_FIELDS[key as keyof typeof COMMON_FIELDS].id3, value);
  }
  if (patch.movementIndex !== undefined) {
    const pair = normalizeNumberPair(patch.movementIndex, 'movementIndex');
    const frame = frames.find(frame => frame.id === 'MVIN');
    const previous = frame ? decodeText(frame.data).split('/') : [];
    replace(
      'MVIN',
      pair === null
        ? null
        : `${pair?.no === undefined ? (previous[0] ?? '') : (pair.no ?? '')}/${pair?.of === undefined ? (previous[1] ?? '') : (pair.of ?? '')}`
    );
  }
  for (const [key, frame] of [
    ['bpm', 'TBPM'],
    ['originalyear', 'TXXX:originalyear']
  ] as const) {
    const value = patch[key];
    if (value !== undefined) {
      if (value !== null && !Number.isFinite(Number(value))) {
        throw new InvalidPatchError(`Invalid ${key}`);
      }
      replace(frame, value === null ? null : String(value));
    }
  }
  for (const [key, id] of [
    ['track', 'TRCK'],
    ['disk', 'TPOS']
  ] as const) {
    const pair = normalizeNumberPair(patch[key], key);
    if (pair === undefined) {
      continue;
    }
    if (pair === null) {
      replace(id, null);
      continue;
    }
    const frame = frames.find(frame => frame.id === id);
    if (frame && frame.flags & 0x4f) {
      throw new UnsupportedFeatureError(`Cannot edit flagged ${id}`);
    }
    const previous = frame ? decodeText(frame.data).split('/') : [];
    const no = pair.no === undefined ? previous[0] : pair.no;
    const of = pair.of === undefined ? previous[1] : pair.of;
    replace(id, no == null && of == null ? null : `${no ?? ''}${of == null ? '' : `/${of}`}`);
  }
  if (patch.comment !== undefined) {
    replace('COMM', normalizeComments(patch.comment));
  }
  if (patch.lyrics !== undefined) {
    const lyrics = normalizeLyrics(patch.lyrics) ?? [];
    // A single entry may carry both forms. Text-only entries remove SYLT and
    // synchronized-only entries remove USLT, because a lyrics patch replaces
    // the complete lyrics value.
    replace(
      'USLT',
      lyrics
        .filter(entry => entry.text !== undefined || entry.syncText.length === 0)
        .map(entry => ({ language: entry.language, descriptor: entry.descriptor, text: entry.text ?? '' }))
    );
    replace(
      'SYLT',
      lyrics
        .filter(entry => entry.syncText.length > 0)
        .map(entry => ({
          language: entry.language,
          descriptor: entry.descriptor,
          contentType: entry.contentType ?? 1,
          timeStampFormat: entry.timeStampFormat ?? 2,
          syncText: entry.syncText
        }))
    );
  }
  if (patch.picture !== undefined) {
    replace('APIC', validatePictures(patch.picture));
  }
  if (patch.musicbrainz_recordingid !== undefined) {
    const values = textValues(patch.musicbrainz_recordingid);
    if (values && values.length !== 1) {
      throw new InvalidPatchError('musicbrainz_recordingid requires one value');
    }
    // Preserve identifiers belonging to other owners.
    for (let i = frames.length - 1; i >= 0; i--) {
      const frame = frames[i];
      if (frame.id !== 'UFID') {
        continue;
      }
      if (frame.flags & 0x4f) {
        throw new UnsupportedFeatureError('Cannot edit flagged UFID');
      }
      const end = frame.data.indexOf(0);
      const owner = String.fromCharCode(...frame.data.subarray(0, end < 0 ? frame.data.length : end));
      if (owner === 'http://musicbrainz.org') {
        frames.splice(i, 1);
      }
    }
    if (values) {
      // Append without removing UFIDs from other owners.
      const owner = textEncode('http://musicbrainz.org\0', 'latin1');
      const identifier = textEncode(values[0], 'latin1');
      if (identifier.length > 64) {
        throw new InvalidPatchError('MusicBrainz identifier exceeds 64 bytes');
      }
      const data = new Uint8Array(owner.length + identifier.length);
      data.set(owner);
      data.set(identifier, owner.length);
      frames.push({ id: 'UFID', flags: 0, data });
    }
  }
  if (patch.rating !== undefined) {
    replace(
      'POPM',
      patch.rating?.map(value => {
        if (value.rating === undefined || !Number.isFinite(value.rating) || value.rating < 0 || value.rating > 1) {
          throw new InvalidPatchError('rating must be between 0 and 1');
        }
        return { email: value.source ?? '', rating: Math.round(value.rating * 254) + 1, counter: 0 };
      }) ?? null
    );
  }
  const roles = ['producer', 'engineer', 'arranger', 'mixer', 'djmixer'] as const;
  if (roles.some(role => patch[role] !== undefined)) {
    const people = Object.create(null) as Record<string, string[]>;
    for (const frame of frames.filter(frame => frame.id === 'TIPL')) {
      if (frame.flags & 0x4f) {
        throw new UnsupportedFeatureError('Cannot edit flagged TIPL');
      }
      const pairs = decodeText(frame.data).split('\0');
      for (let i = 0; i + 1 < pairs.length; i += 2) {
        (people[pairs[i]] ??= []).push(pairs[i + 1]);
      }
    }
    for (const role of roles) {
      if (patch[role] === undefined) {
        continue;
      }
      const name = role === 'mixer' ? 'mix' : role === 'djmixer' ? 'DJ-mix' : role;
      const values = textValues(patch[role]);
      delete people[name];
      if (values?.length) {
        people[name] = values;
      }
    }
    replace('TIPL', Object.keys(people).length ? people : null);
  }
}
