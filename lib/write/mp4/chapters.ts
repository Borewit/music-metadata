import * as Token from 'token-types';
import type { IChapter } from '../../type.js';
import { concatBytes, encodeUtf8 } from '../core/bytes.js';
import { InvalidFileError, InvalidPatchError, UnsupportedFeatureError } from '../core/errors.js';
import { type AtomBudget, atom, type Box, boxes, fourcc, maxAtoms } from './atoms.js';

export interface ChapterUpdate {
  removedTrackStarts: Set<number>;
  list: Uint8Array | null;
}

function trackHeader(bytes: Uint8Array, children: Box[]): { id: number; flags: number } {
  const headers = children.filter(b => b.type === 'tkhd');
  if (headers.length !== 1) {
    throw new InvalidFileError('MP4 track requires one header');
  }
  const header = headers[0];
  const start = header.start + header.header;
  const version = bytes[start];
  const offset = version === 0 ? 12 : version === 1 ? 20 : -1;
  if (offset < 0 || header.end - start < (version === 1 ? 50 : 38)) {
    throw new InvalidFileError('Invalid MP4 track header');
  }
  const id = Token.UINT32_BE.get(bytes, start + offset);
  if (id === 0) {
    throw new InvalidFileError('Invalid MP4 track ID');
  }
  return { id, flags: Token.UINT24_BE.get(bytes, start + 1) };
}

/** Write a Nero chapter list and retire referenced QuickTime chapter tracks. */
export function chapterUpdate(bytes: Uint8Array, root: Box, chapters: readonly IChapter[] | null): ChapterUpdate {
  if (chapters !== null && (!Array.isArray(chapters) || chapters.length > 255)) {
    throw new InvalidPatchError('Nero chapter lists support an array of at most 255 chapters');
  }
  const budget: AtomBudget = { remaining: maxAtoms };
  const children = boxes(bytes, root.start + root.header, root.end, budget);
  const tracks = children.filter(box => box.type === 'trak');
  const removedTracks = new Set<number>();
  const nonChapterTargets = new Set<number>();
  const ids = new Map<number, { box: Box; children: Box[]; flags: number }>();
  for (const track of tracks) {
    const trackChildren = boxes(bytes, track.start + track.header, track.end, budget);
    const { id, flags } = trackHeader(bytes, trackChildren);
    if (ids.has(id)) {
      throw new InvalidFileError('Duplicate MP4 track ID');
    }
    ids.set(id, { box: track, children: trackChildren, flags });
    for (const ref of trackChildren.filter(b => b.type === 'tref')) {
      for (const group of boxes(bytes, ref.start + ref.header, ref.end, budget)) {
        if ((group.end - group.start - group.header) % 4) {
          throw new InvalidFileError('Invalid MP4 track reference');
        }
        for (let p = group.start + group.header; p < group.end; p += 4) {
          if (--budget.remaining < 0) {
            throw new UnsupportedFeatureError('MP4 chapter reference count exceeds limit');
          }
          const target = Token.UINT32_BE.get(bytes, p);
          if (group.type === 'chap') {
            removedTracks.add(target);
          } else {
            nonChapterTargets.add(target);
          }
        }
      }
    }
  }
  const removedTrackStarts = new Set<number>();
  for (const id of removedTracks) {
    const track = ids.get(id);
    if (!track) {
      throw new InvalidFileError('Missing referenced chapter track');
    }
    const media = track.children.filter(b => b.type === 'mdia');
    const handlers =
      media.length === 1
        ? boxes(bytes, media[0].start + media[0].header, media[0].end, budget).filter(b => b.type === 'hdlr')
        : [];
    const handler = handlers[0];
    if (handlers.length !== 1 || handler.end - handler.start < handler.header + 12) {
      throw new InvalidFileError('Invalid chapter track handler');
    }
    const type = fourcc(bytes, handler.start + handler.header + 8);
    // Dedicated chapter tracks are disabled; an enabled text track can also be used for playback.
    if (!['text', 'sbtl'].includes(type) || nonChapterTargets.has(id) || (track.flags & 0x000001) !== 0) {
      throw new UnsupportedFeatureError('Chapter track is shared with a non-chapter purpose');
    }
    removedTrackStarts.add(track.box.start);
  }
  if (chapters === null || chapters.length === 0) {
    return { removedTrackStarts, list: null };
  }
  const timestamp = (value: number, scale: number) => {
    if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(scale) || scale <= 0) {
      throw new InvalidPatchError('Invalid chapter timestamp or timescale');
    }
    const ticks = Math.round(value * (10_000_000 / scale));
    if (!Number.isSafeInteger(ticks)) {
      throw new InvalidPatchError('Chapter timestamp exceeds safe range');
    }
    return ticks;
  };
  const movieHeaders = children.filter(box => box.type === 'mvhd');
  if (movieHeaders.length !== 1) {
    throw new InvalidFileError('MP4 movie requires one duration header');
  }
  const movieHeader = movieHeaders[0];
  const start = movieHeader.start + movieHeader.header;
  const version = bytes[start];
  const wide = version === 1;
  if ((version !== 0 && version !== 1) || movieHeader.end - start < (wide ? 112 : 100)) {
    throw new InvalidFileError('Invalid MP4 movie header');
  }
  const timeScale = Token.UINT32_BE.get(bytes, start + (wide ? 20 : 12));
  if (timeScale === 0) {
    throw new InvalidFileError('Invalid MP4 movie timescale');
  }
  const duration = wide ? Token.UINT64_BE.get(bytes, start + 24) : BigInt(Token.UINT32_BE.get(bytes, start + 16));
  if (duration === (wide ? 0xffffffffffffffffn : 0xffffffffn)) {
    throw new UnsupportedFeatureError('MP4 movie duration is unknown');
  }
  if (duration > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new UnsupportedFeatureError('Movie duration exceeds safe range');
  }
  const movieEnd = Math.round(Number(duration) * (10_000_000 / timeScale));
  if (!Number.isSafeInteger(movieEnd)) {
    throw new UnsupportedFeatureError('Movie duration exceeds safe Nero timestamp range');
  }
  const starts = Array.from(chapters, chapter => {
    if (typeof chapter !== 'object' || chapter === null || Array.isArray(chapter)) {
      throw new InvalidPatchError('Chapter must be an object');
    }
    return timestamp(chapter.start, chapter.timeScale ?? 1);
  });
  const entries = chapters.map((chapter, i) => {
    const time = starts[i];
    if ((i > 0 && time <= starts[i - 1]) || time >= movieEnd) {
      throw new InvalidPatchError('Chapters must have increasing starts before the movie ends');
    }
    if (chapter.url !== undefined || chapter.image !== undefined) {
      throw new UnsupportedFeatureError('Nero chapters do not support URLs or pictures');
    }
    if (chapter.end !== undefined) {
      const end = timestamp(chapter.end, chapter.timeScale ?? 1);
      if (end <= time || Math.abs(end - (starts[i + 1] ?? movieEnd)) > 1) {
        throw new UnsupportedFeatureError('Nero chapter ends must match the next start or movie duration');
      }
    }
    if (typeof chapter.title !== 'string') {
      throw new InvalidPatchError('Chapter title must be a string');
    }
    if (chapter.title.length > 255) {
      throw new InvalidPatchError('Nero chapter titles support at most 255 UTF-8 bytes');
    }
    const title = encodeUtf8(chapter.title);
    if (title.length > 255) {
      throw new InvalidPatchError('Nero chapter titles support at most 255 UTF-8 bytes');
    }
    const prefix = new Uint8Array(9);
    Token.UINT64_BE.put(prefix, 0, BigInt(time));
    prefix[8] = title.length;
    return concatBytes(prefix, title);
  });
  const prefix = new Uint8Array(9);
  prefix[0] = 1;
  prefix[8] = chapters.length;
  return { removedTrackStarts, list: atom('chpl', prefix, ...entries) };
}
