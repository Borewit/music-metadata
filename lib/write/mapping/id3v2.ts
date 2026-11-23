import { textDecode, textEncode } from '@borewit/text-codec';
import { InvalidFileError, InvalidPatchError, UnsupportedFeatureError } from '../core/errors.js';
import { normalizeLyrics } from '../core/lyrics.js';
import { normalizeComments, normalizeNumberPair, textValues, validatePictures } from '../core/patch.js';
import type { TagPatch } from '../core/types.js';
import { decodeFrameData, decodeText, type Frame, makeFrames } from '../id3v2/frames.js';
import type { InternalPatch } from './common.js';
import { COMMON_FIELDS, commonText, EXTRA_COMMON_FIELDS, structuredText } from './common.js';

const textFields = {
  title: 'TIT2',
  artist: 'TPE1',
  artists: 'TXXX:Artists',
  albumArtist: 'TPE2',
  albumArtists: 'TPE2',
  album: 'TALB',
  date: 'TDRC',
  originalDate: 'TDOR',
  releaseDate: 'TDRL',
  genres: 'TCON',
  composers: 'TCOM',
  lyricists: 'TEXT',
  writers: 'TXXX:Writer',
  conductors: 'TPE3',
  remixers: 'TPE4',
  labels: 'TPUB',
  catalogNumber: 'TXXX:CATALOGNUMBER',
  isrcs: 'TSRC',
  copyright: 'TCOP',
  media: 'TMED',
  mood: 'TMOO',
  grouping: 'TIT1',
  subtitles: 'TIT3',
  website: 'WOAR',
  barcode: 'TXXX:BARCODE',
  asin: 'TXXX:ASIN',
  script: 'TXXX:SCRIPT',
  releaseStatus: 'TXXX:MusicBrainz Album Status',
  releaseType: 'TXXX:MusicBrainz Album Type',
  releaseCountry: 'TXXX:MusicBrainz Album Release Country',
  acoustId: 'TXXX:Acoustid Id',
  artistSort: 'TSOP',
  albumArtistSort: 'TSO2',
  mbReleaseTrackId: 'TXXX:MusicBrainz Release Track Id',
  mbReleaseId: 'TXXX:MusicBrainz Album Id',
  mbArtistId: 'TXXX:MusicBrainz Artist Id',
  mbAlbumArtistId: 'TXXX:MusicBrainz Album Artist Id',
  mbReleaseGroupId: 'TXXX:MusicBrainz Release Group Id',
  mbWorkId: 'TXXX:MusicBrainz Work Id',
  replayGainTrackGain: 'TXXX:REPLAYGAIN_TRACK_GAIN',
  replayGainTrackPeak: 'TXXX:REPLAYGAIN_TRACK_PEAK',
  replayGainAlbumGain: 'TXXX:REPLAYGAIN_ALBUM_GAIN',
  replayGainAlbumPeak: 'TXXX:REPLAYGAIN_ALBUM_PEAK'
} as const;

function ratingFrames(frames: Frame[], ratings: NonNullable<TagPatch['rating']>) {
  const existing = new Map<string, Uint8Array>();
  for (const frame of frames) {
    if (frame.id !== 'POPM') {
      continue;
    }
    if (frame.flags & 0x4f) {
      throw new UnsupportedFeatureError('Cannot edit flagged POPM frames');
    }
    const end = frame.data.indexOf(0);
    if (end < 0 || end + 1 >= frame.data.length) {
      throw new InvalidFileError('Malformed POPM frame');
    }
    existing.set(textDecode(frame.data.subarray(0, end), 'latin1'), frame.data);
  }
  return ratings.map(({ source = '', rating }) => {
    if (rating !== undefined && (!Number.isFinite(rating) || rating < 0 || rating > 1)) {
      throw new InvalidPatchError('rating must be between 0 and 1');
    }
    const score = rating === undefined ? 0 : Math.round(rating * 254) + 1;
    const body = existing.get(source)?.slice();
    if (!body) {
      return { email: source, rating: score, counter: 0 };
    }
    // Retain the original counter bytes, including an omitted or extended counter.
    body[body.indexOf(0) + 1] = score;
    return body;
  });
}

export function applyId3Patch(
  frames: Frame[],
  patch: InternalPatch,
  replace: (key: string, value: unknown) => void
): void {
  for (const key of EXTRA_COMMON_FIELDS) {
    if (patch[key] !== undefined) {
      if (key === 'djMixers') {
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
      if (key === 'license') {
        replace('TXXX:LICENSE', null);
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
  if (patch.albumArtists !== undefined) {
    replace('TXXX:ALBUMARTISTS', null);
  }
  if (patch.notes !== undefined) {
    replace('TXXX:NOTES', textValues(patch.notes));
  }
  if (patch.technicians !== undefined) {
    replace('TXXX:TECHNICIAN', textValues(patch.technicians));
  }
  if (patch['performer:instrument'] !== undefined) {
    replace('TMCL', null);
    replace('TXXX:PERFORMER', null);
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
    ['originalYear', 'TXXX:originalyear']
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
  if (patch.comments !== undefined) {
    const comments = normalizeComments(patch.comments);
    const cddbComment = comments?.findLast(comment => comment.descriptor === 'iTunes_CDDB_1');
    const retainCddb = patch.itunesCddb1 === undefined && !cddbComment;
    if (patch.itunesCddb1 === undefined && cddbComment) {
      replace('TXXX:iTunes_CDDB_1', cddbComment.text ?? '');
    }
    const retainedComments = frames.filter(frame => {
      if (frame.id !== 'COMM') {
        return false;
      }
      try {
        return isCddbComment(frame) && retainCddb;
      } catch (error) {
        if (!(error instanceof InvalidFileError || error instanceof UnsupportedFeatureError)) {
          throw error;
        }
        // An unidentifiable comment may contain unrelated metadata: preserve it.
        return true;
      }
    });
    replace('COMM', comments);
    frames.push(...retainedComments);
  }
  if (patch.itunesCddb1 !== undefined) {
    // Preserve Picard's described comment representation when present, and
    // leave ordinary comments untouched. A clear removes both representations.
    const values = commonText(patch.itunesCddb1, 'itunesCddb1');
    for (let i = frames.length - 1; i >= 0; i--) {
      const frame = frames[i];
      if (frame.id !== 'COMM') {
        continue;
      }
      if (isCddbComment(frame)) {
        const comments = values?.length
          ? makeFrames('COMM', {
              language: textDecode(decodeFrameData(frame).subarray(1, 4), 'latin1'),
              descriptor: 'iTunes_CDDB_1',
              text: values[0]
            })
          : [];
        frames.splice(i, 1, ...comments);
      }
    }
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
  if (patch.mbRecordingId !== undefined) {
    const values = textValues(patch.mbRecordingId);
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
    replace('POPM', patch.rating?.length ? ratingFrames(frames, patch.rating) : null);
  }
  const roles = ['producers', 'engineers', 'arrangers', 'mixers', 'djMixers'] as const;
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
      const name = role === 'mixers' ? 'mix' : role === 'djMixers' ? 'DJ-mix' : role.slice(0, -1);
      const values = textValues(patch[role]);
      delete people[name];
      if (values?.length) {
        people[name] = values;
      }
    }
    replace('TIPL', Object.keys(people).length ? people : null);
  }
}

/** Identify the described comment without interpreting its free-text payload. */
function isCddbComment(frame: Frame): boolean {
  const data = decodeFrameData(frame);
  if (data.length < 4) {
    throw new InvalidFileError('Malformed COMM frame');
  }
  const text = new Uint8Array(data.length - 3);
  text[0] = data[0];
  text.set(data.subarray(4), 1); // Skip the three-byte language code.
  return decodeText(text).split('\0')[0] === 'iTunes_CDDB_1';
}
