import { VorbisMovement } from '../../common/VorbisMovement.js';
import { InvalidPatchError } from '../core/errors.js';
import { lyricsToLrc, normalizeLyrics } from '../core/lyrics.js';
import { normalizeComments, normalizeNumberPair, numberValue, textValues } from '../core/patch.js';
import type { TextPatch } from '../core/types.js';
import type { VorbisComment, VorbisFields } from '../vorbis/comment.js';
import type { InternalPatch } from './common.js';
import { COMMON_FIELDS, commonText, EXTRA_COMMON_FIELDS, structuredText } from './common.js';

type TextPatchKey =
  | 'notes'
  | 'barcode'
  | 'releaseCountry'
  | 'asin'
  | 'albumArtistSort'
  | 'artistSort'
  | 'script'
  | 'releaseStatus'
  | 'releaseType'
  | 'acoustId'
  | 'title'
  | 'artist'
  | 'artists'
  | 'albumArtist'
  | 'albumArtists'
  | 'album'
  | 'date'
  | 'originalDate'
  | 'releaseDate'
  | 'genres'
  | 'composers'
  | 'lyricists'
  | 'writers'
  | 'conductors'
  | 'remixers'
  | 'arrangers'
  | 'engineers'
  | 'producers'
  | 'mixers'
  | 'technicians'
  | 'labels'
  | 'catalogNumber'
  | 'isrcs'
  | 'copyright'
  | 'media'
  | 'mood'
  | 'grouping'
  | 'subtitles'
  | 'website'
  | 'mbRecordingId'
  | 'mbReleaseTrackId'
  | 'mbReleaseId'
  | 'mbArtistId'
  | 'mbAlbumArtistId'
  | 'mbReleaseGroupId'
  | 'mbWorkId'
  | 'replayGainTrackGain'
  | 'replayGainTrackPeak'
  | 'replayGainAlbumGain'
  | 'replayGainAlbumPeak';

interface TextFieldMapping {
  /** Patch property name. */
  patch: TextPatchKey;
  /** Vorbis Comment field name. */
  field: string;
  /** Whether repeated values are allowed. */
  multiple: boolean;
}

const TEXT_FIELDS: readonly TextFieldMapping[] = [
  { patch: 'notes', field: 'NOTES', multiple: true },
  { patch: 'barcode', field: 'BARCODE', multiple: false },
  { patch: 'releaseCountry', field: 'RELEASECOUNTRY', multiple: false },
  { patch: 'asin', field: 'ASIN', multiple: false },
  { patch: 'albumArtistSort', field: 'ALBUMARTISTSORT', multiple: false },
  { patch: 'artistSort', field: 'ARTISTSORT', multiple: false },
  { patch: 'script', field: 'SCRIPT', multiple: false },
  { patch: 'releaseStatus', field: 'RELEASESTATUS', multiple: false },
  { patch: 'releaseType', field: 'RELEASETYPE', multiple: true },
  { patch: 'acoustId', field: 'ACOUSTID_ID', multiple: false },

  { patch: 'title', field: 'TITLE', multiple: false },
  { patch: 'artist', field: 'ARTIST', multiple: false },
  { patch: 'artists', field: 'ARTIST', multiple: true },
  { patch: 'albumArtist', field: 'ALBUMARTIST', multiple: false },
  { patch: 'albumArtists', field: 'ALBUMARTIST', multiple: true },
  { patch: 'album', field: 'ALBUM', multiple: false },
  { patch: 'date', field: 'DATE', multiple: false },
  { patch: 'originalDate', field: 'ORIGINALDATE', multiple: false },
  { patch: 'releaseDate', field: 'RELEASEDATE', multiple: false },
  { patch: 'genres', field: 'GENRE', multiple: true },
  { patch: 'composers', field: 'COMPOSER', multiple: true },
  { patch: 'lyricists', field: 'LYRICIST', multiple: true },
  { patch: 'writers', field: 'WRITER', multiple: true },
  { patch: 'conductors', field: 'CONDUCTOR', multiple: true },
  { patch: 'remixers', field: 'REMIXER', multiple: true },
  { patch: 'arrangers', field: 'ARRANGER', multiple: true },
  { patch: 'engineers', field: 'ENGINEER', multiple: true },
  { patch: 'producers', field: 'PRODUCER', multiple: true },
  { patch: 'mixers', field: 'MIXER', multiple: true },
  { patch: 'technicians', field: 'TECHNICIAN', multiple: true },
  { patch: 'labels', field: 'LABEL', multiple: true },
  { patch: 'catalogNumber', field: 'CATALOGNUMBER', multiple: true },
  { patch: 'isrcs', field: 'ISRC', multiple: true },
  { patch: 'copyright', field: 'COPYRIGHT', multiple: false },
  { patch: 'media', field: 'MEDIA', multiple: false },
  { patch: 'mood', field: 'MOOD', multiple: false },
  { patch: 'grouping', field: 'GROUPING', multiple: false },
  { patch: 'subtitles', field: 'SUBTITLE', multiple: true },
  { patch: 'website', field: 'WEBSITE', multiple: false },
  { patch: 'mbRecordingId', field: 'MUSICBRAINZ_TRACKID', multiple: false },
  { patch: 'mbReleaseTrackId', field: 'MUSICBRAINZ_RELEASETRACKID', multiple: false },
  { patch: 'mbReleaseId', field: 'MUSICBRAINZ_ALBUMID', multiple: false },
  { patch: 'mbArtistId', field: 'MUSICBRAINZ_ARTISTID', multiple: true },
  { patch: 'mbAlbumArtistId', field: 'MUSICBRAINZ_ALBUMARTISTID', multiple: true },
  { patch: 'mbReleaseGroupId', field: 'MUSICBRAINZ_RELEASEGROUPID', multiple: false },
  { patch: 'mbWorkId', field: 'MUSICBRAINZ_WORKID', multiple: false },
  { patch: 'replayGainTrackGain', field: 'REPLAYGAIN_TRACK_GAIN', multiple: false },
  { patch: 'replayGainTrackPeak', field: 'REPLAYGAIN_TRACK_PEAK', multiple: false },
  { patch: 'replayGainAlbumGain', field: 'REPLAYGAIN_ALBUM_GAIN', multiple: false },
  { patch: 'replayGainAlbumPeak', field: 'REPLAYGAIN_ALBUM_PEAK', multiple: false }
];

export interface VorbisPatchOptions {
  /**
   * Comments representing a common `picture` patch. They are inserted before
   * native fields, so an explicit `native.METADATA_BLOCK_PICTURE` still wins.
   */
  pictureComments?: readonly VorbisComment[];
}

/**
 * Apply a common/native tag patch to a Vorbis Comment block.
 *
 * Existing fields are updated in place, unknown fields are preserved, and
 * repeated values are supported.
 */
export function applyVorbisPatch(
  fields: VorbisFields,
  patch: InternalPatch,
  options: VorbisPatchOptions = {}
): VorbisFields {
  const comments = fields.comments.map(comment => ({ ...comment }));
  for (const key of EXTRA_COMMON_FIELDS) {
    if (patch[key] !== undefined && key !== 'movement') {
      if (key === 'acoustIdFingerprint') {
        removeField(comments, 'ACOUSTID_ID_FINGERPRINT');
      }
      if (key === 'musicIpFingerprint') {
        for (let index = comments.length - 1; index >= 0; index--) {
          const comment = comments[index];
          if (comment.key.toUpperCase() === 'FINGERPRINT' && comment.value.startsWith('MusicMagic Fingerprint')) {
            comments.splice(index, 1);
          }
        }
      }
      setField(comments, COMMON_FIELDS[key].vorbis, commonText(patch[key], key));
    }
  }

  for (const [key, value] of Object.entries(structuredText(patch))) {
    setField(comments, COMMON_FIELDS[key as keyof typeof COMMON_FIELDS].vorbis, value === null ? null : [value]);
  }
  if (patch['performer:instrument'] !== undefined) {
    removeField(comments, 'PERFORMER');
    setField(comments, 'PERFORMER:INSTRUMENT', commonText(patch['performer:instrument'], 'performer:instrument'));
  }
  if (patch.movement !== undefined || patch.movementIndex !== undefined) {
    // Canonicalize both Picard and legacy movement fields before applying a
    // partial edit, so clearing a number cannot leave an alias behind.
    const movement = new VorbisMovement();
    for (const comment of comments) {
      movement.add(comment.key, comment.value);
    }
    const { name, index: existing } = movement.value;
    removeField(comments, 'MOVEMENT');
    removeField(comments, 'MOVEMENTNUMBER');
    setField(
      comments,
      'MOVEMENTNAME',
      patch.movement === undefined ? (name == null ? null : [name]) : commonText(patch.movement, 'movement')
    );
    const pair = normalizeNumberPair(patch.movementIndex, 'movementIndex');
    const no = pair === null ? null : pair?.no === undefined ? existing.no : pair.no;
    const of = pair === null ? null : pair?.of === undefined ? existing.of : pair.of;
    setField(comments, 'MOVEMENT', no === null ? null : [String(no)]);
    setField(comments, 'MOVEMENTTOTAL', of === null ? null : [String(of)]);
  }
  const lyrics = normalizeLyrics(patch.lyrics);
  if (lyrics !== undefined) {
    if (lyrics === null) {
      removeField(comments, 'LYRICS');
    } else {
      // A single LYRICS field cannot hold plain text and synchronized text at
      // the same time; synchronized lines take precedence.
      setField(
        comments,
        'LYRICS',
        lyrics.map(entry => (entry.syncText.length > 0 ? lyricsToLrc(entry) : (entry.text ?? '')))
      );
    }
  }

  for (const mapping of TEXT_FIELDS) {
    const value = patch[mapping.patch];
    if (value === undefined) {
      continue;
    }
    const values = textValues(value as TextPatch);
    if (values === undefined) {
      continue;
    }
    if (mapping.patch === 'albumArtists') {
      removeField(comments, 'ALBUMARTISTS');
    }
    // Keep explicit display credits separate from individual artist lists,
    // including when clearing the list in the same patch.
    const field =
      mapping.patch === 'artists' && patch.artist !== undefined
        ? 'ARTISTS'
        : mapping.patch === 'albumArtists' && patch.albumArtist !== undefined
          ? 'ALBUMARTISTS'
          : mapping.field;
    if (values === null) {
      removeField(comments, field);
      continue;
    }
    if (!mapping.multiple && values.length > 1) {
      throw new InvalidPatchError(`${String(mapping.patch)} accepts a single value`);
    }
    setField(comments, field, values);
  }

  if (patch.rating !== undefined) {
    for (let index = comments.length - 1; index >= 0; index--) {
      const key = comments[index]?.key.toUpperCase();
      if (key === 'RATING' || key.startsWith('RATING:')) {
        comments.splice(index, 1);
      }
    }
    for (const rating of patch.rating ?? []) {
      if (rating.rating === undefined || !Number.isFinite(rating.rating) || rating.rating < 0 || rating.rating > 1) {
        throw new InvalidPatchError('rating must be a number between 0 and 1');
      }
      if (rating.source?.includes(':')) {
        throw new InvalidPatchError('rating source must not contain a colon');
      }
      const key = rating.source ? `RATING:${rating.source}` : 'RATING';
      validateFieldName(key);
      setField(comments, key, [String(rating.source ? rating.rating : rating.rating * 100)]);
    }
  }

  const commentsPatch = normalizeComments(patch.comments);
  if (commentsPatch !== undefined) {
    if (commentsPatch === null || commentsPatch.length === 0) {
      removeField(comments, 'COMMENT');
    } else {
      setField(
        comments,
        'COMMENT',
        commentsPatch.map(comment => comment.text ?? '')
      );
    }
  }

  const bpm = numberValue(patch.bpm);
  if (bpm !== undefined) {
    if (bpm === null) {
      removeField(comments, 'BPM');
    } else {
      setField(comments, 'BPM', [String(bpm)]);
    }
  }

  const originalYear = numberValue(patch.originalYear);
  if (originalYear !== undefined) {
    if (originalYear === null) {
      removeField(comments, 'ORIGINALYEAR');
    } else {
      setField(comments, 'ORIGINALYEAR', [String(Math.trunc(originalYear))]);
    }
  }

  const track = normalizeNumberPair(patch.track, 'track');
  if (track !== undefined) {
    if (track === null) {
      removeField(comments, 'TRACKNUMBER');
      removeField(comments, 'TRACKTOTAL');
      removeField(comments, 'TOTALTRACKS');
    } else {
      if (track.no !== undefined) {
        setField(comments, 'TRACKNUMBER', track.no === null ? null : [String(track.no)]);
      }
      if (track.of !== undefined) {
        setField(comments, 'TRACKTOTAL', track.of === null ? null : [String(track.of)]);
        setField(comments, 'TOTALTRACKS', track.of === null ? null : [String(track.of)]);
      }
    }
  }

  const disk = normalizeNumberPair(patch.disk, 'disk');
  if (disk !== undefined) {
    if (disk === null) {
      removeField(comments, 'DISCNUMBER');
      removeField(comments, 'DISCTOTAL');
      removeField(comments, 'TOTALDISCS');
    } else {
      if (disk.no !== undefined) {
        setField(comments, 'DISCNUMBER', disk.no === null ? null : [String(disk.no)]);
      }
      if (disk.of !== undefined) {
        setField(comments, 'DISCTOTAL', disk.of === null ? null : [String(disk.of)]);
        setField(comments, 'TOTALDISCS', disk.of === null ? null : [String(disk.of)]);
      }
    }
  }

  // Ogg supplies pictures as base64 comments and FLAC writes native PICTURE
  // blocks. Remove all artwork fields when the caller explicitly updates
  // pictures, then insert supplied comments before native fields are applied.
  if (patch.picture !== undefined) {
    removeField(comments, 'METADATA_BLOCK_PICTURE');
    removeField(comments, 'COVERART');
    removeField(comments, 'COVERARTMIME');
    if (options.pictureComments) {
      for (const comment of options.pictureComments) {
        comments.push(comment);
      }
    }
  }

  if (patch.native !== undefined) {
    if (patch.native === null) {
      // A null native patch is a no-op: it does not mean "remove all tags".
    } else {
      for (const [key, value] of Object.entries(patch.native)) {
        validateFieldName(key);
        if (value === null) {
          removeField(comments, key);
          continue;
        }
        if (typeof value !== 'string' && !Array.isArray(value)) {
          throw new InvalidPatchError(`native.${key} must be a string, an array of strings, or null`);
        }
        const values = typeof value === 'string' ? [value] : [...value];
        for (const entry of values) {
          if (typeof entry !== 'string') {
            throw new InvalidPatchError(`native.${key} must contain only strings`);
          }
        }
        setField(comments, key, values);
      }
    }
  }

  // Keep track total aliases consistent when native overrides one of them.
  // If native explicitly set TRACKTOTAL or TOTALTRACKS, ensure the other matches.
  // If neither was explicitly set via native but common patch provided a total,
  // both will already be consistent from the common patch logic above.
  const nativeKeys =
    patch.native && typeof patch.native === 'object' ? new Set(Object.keys(patch.native)) : new Set<string>();
  if (nativeKeys.has('TRACKTOTAL') || nativeKeys.has('TOTALTRACKS')) {
    const trackTotalValue = findFieldValue(comments, 'TRACKTOTAL');
    const totalTracksValue = findFieldValue(comments, 'TOTALTRACKS');
    const resolvedValue = trackTotalValue ?? totalTracksValue;
    if (resolvedValue !== undefined) {
      setField(comments, 'TRACKTOTAL', resolvedValue === null ? null : [resolvedValue]);
      setField(comments, 'TOTALTRACKS', resolvedValue === null ? null : [resolvedValue]);
    }
  }
  if (nativeKeys.has('DISCTOTAL') || nativeKeys.has('TOTALDISCS')) {
    const discTotalValue = findFieldValue(comments, 'DISCTOTAL');
    const totalDiscsValue = findFieldValue(comments, 'TOTALDISCS');
    const resolvedValue = discTotalValue ?? totalDiscsValue;
    if (resolvedValue !== undefined) {
      setField(comments, 'DISCTOTAL', resolvedValue === null ? null : [resolvedValue]);
      setField(comments, 'TOTALDISCS', resolvedValue === null ? null : [resolvedValue]);
    }
  }

  // Validate the final field set, including values inherited from the input.
  for (const comment of comments) {
    validateFieldName(comment.key);
    if (comment.value.includes('\u0000')) {
      throw new InvalidPatchError(`Vorbis Comment field '${comment.key}' contains a NUL character`);
    }
  }

  return { vendor: fields.vendor, comments };
}

function findFieldValue(comments: VorbisComment[], key: string): string | null | undefined {
  const upper = key.toUpperCase();
  for (const comment of comments) {
    if (comment.key.toUpperCase() === upper) {
      return comment.value;
    }
  }
  return undefined;
}

function setField(comments: VorbisComment[], key: string, values: readonly string[] | null): void {
  const upper = key.toUpperCase();
  let firstIndex = -1;
  for (let index = comments.length - 1; index >= 0; index--) {
    const comment = comments[index];
    if (comment !== undefined && comment.key.toUpperCase() === upper) {
      firstIndex = index;
    }
  }

  if (firstIndex >= 0) {
    comments.splice(firstIndex, 1);
  }
  for (let index = comments.length - 1; index >= 0; index--) {
    const comment = comments[index];
    if (comment !== undefined && comment.key.toUpperCase() === upper) {
      comments.splice(index, 1);
    }
  }

  if (values === null || values.length === 0) {
    return;
  }

  const insertAt = firstIndex >= 0 ? Math.min(firstIndex, comments.length) : comments.length;
  const newComments = values.map(value => ({ key, value }));
  comments.splice(insertAt, 0, ...newComments);
}

function removeField(comments: VorbisComment[], key: string): void {
  const upper = key.toUpperCase();
  for (let index = comments.length - 1; index >= 0; index--) {
    const comment = comments[index];
    if (comment !== undefined && comment.key.toUpperCase() === upper) {
      comments.splice(index, 1);
    }
  }
}

function validateFieldName(key: string): void {
  if (key.length === 0) {
    throw new InvalidPatchError('Vorbis Comment field name must not be empty');
  }
  for (const character of key) {
    const code = character.charCodeAt(0);
    if (code < 0x20 || code > 0x7d || character === '=') {
      throw new InvalidPatchError(`Invalid Vorbis Comment field name '${key}'`);
    }
  }
}
