import type { IAudioMetadata } from '../type.js';
import { assertPatch, buildUpdate } from './core/shared.js';
import { openSource } from './core/source.js';
import type { CommonTags, TagPatch, WriteOptions, WriteResult } from './core/types.js';
import { writeChunks } from './core/writer.js';
import { normalizeCommonPatch } from './mapping/common.js';

const artistPairs = [
  ['artist', 'artists'],
  ['albumartist', 'albumartists']
] as const;

function sameArtists(left: TagPatch['artists'], right: TagPatch['artists']): boolean {
  return (
    left === right ||
    (Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => value === right[index]))
  );
}

export class FileTagSnapshot {
  private readonly artists: Pick<CommonTags, 'artist' | 'artists' | 'albumartist' | 'albumartists'>;
  private year: number | undefined;
  private date: string | undefined;
  private hasMovementIndex: boolean;

  private separateArtists: boolean;
  private readonly hasItunesTags: boolean;

  constructor({ common, native }: IAudioMetadata) {
    this.hasItunesTags = native.iTunes !== undefined;
    this.separateArtists =
      native.iTunes?.some(tag => tag.id.toLowerCase() === '----:com.apple.itunes:artists') ?? false;
    const { artist, artists, albumartist, albumartists, movementIndex } = common;
    this.artists = { artist, artists: artists?.slice(), albumartist, albumartists: albumartists?.slice() };
    this.year = common.year;
    this.date = common.date;
    this.hasMovementIndex = movementIndex.no !== null || movementIndex.of !== null;
  }

  normalize(patch: TagPatch): void {
    if (!this.hasMovementIndex && patch.movementIndex?.no === null && patch.movementIndex.of === null) {
      delete patch.movementIndex;
    }
    if (patch.year !== this.year && patch.date === this.date) {
      delete patch.date;
    }
    if (this.hasItunesTags && patch.artist === this.artists.artist) {
      if (sameArtists(patch.artists, this.artists.artists)) {
        delete patch.artists;
      }
      delete patch.artist;
    }
    for (const [singular, plural] of artistPairs) {
      if (patch[singular] !== this.artists[singular] && sameArtists(patch[plural], this.artists[plural])) {
        delete patch[plural];
      }
    }
  }

  // Synchronize MP4 aliases after a successful write, keeping Picard artist lists independent.
  recordMp4Artists(input: TagPatch, submitted: TagPatch, patch: TagPatch): void {
    for (const [singular, plural] of artistPairs) {
      if (
        singular === 'artist' &&
        (this.separateArtists || (patch.artist !== undefined && patch.artists !== undefined))
      ) {
        this.separateArtists = true;
        this.artists.artist = typeof submitted.artist === 'string' ? submitted.artist : undefined;
        this.artists.artists = Array.isArray(submitted.artists) ? submitted.artists.slice() : undefined;
        continue;
      }
      const list = patch[plural];
      const name = patch[singular];
      if (!Array.isArray(list) && typeof name !== 'string') {
        continue;
      }
      const saved: string[] = Array.isArray(list) ? list : [name as string];
      this.artists[singular] = saved[0];
      this.artists[plural] = saved.slice();
      // Retain edits the caller made while the write was in progress.
      if (input[singular] === submitted[singular]) {
        input[singular] = saved[0];
      }
      if (sameArtists(input[plural], submitted[plural]) && !sameArtists(input[plural], saved)) {
        input[plural] = saved.slice();
      }
    }
  }

  recordSave(patch: TagPatch): void {
    const movement = patch.movementIndex;
    this.hasMovementIndex = movement?.no != null || movement?.of != null;
  }

  recordDate(input: TagPatch, submitted: TagPatch, date: TagPatch['date']): void {
    if (typeof date === 'string' || date === null) {
      this.date = typeof date === 'string' ? date : undefined;
      // Match the reader's year derived from the saved date.
      const year = Number.parseInt(this.date?.slice(0, 4) ?? '', 10);
      this.year = Number.isNaN(year) ? undefined : year;
      if (input.date === submitted.date) {
        input.date = this.date;
      }
      if (input.year === submitted.year) {
        input.year = this.year;
      }
    }
  }
}

export async function writeFileTags(
  filePath: string,
  input: TagPatch,
  options: WriteOptions = {},
  snapshot?: FileTagSnapshot
): Promise<WriteResult> {
  assertPatch(input);
  const submitted = snapshot ? { ...input } : input;
  if (snapshot) {
    for (const [, plural] of artistPairs) {
      const list = submitted[plural];
      if (Array.isArray(list)) {
        submitted[plural] = list.slice();
      }
    }
  }
  const patch = snapshot ? { ...submitted } : input;
  snapshot?.normalize(patch);
  const normalized = normalizeCommonPatch(patch);
  const source = await openSource(filePath);
  try {
    const update = await buildUpdate(source, normalized, options);
    const result = await writeChunks(filePath, update.chunks, {
      atomic: options.atomic ?? true,
      stageToFile: update.stageToFile,
      backup: options.backup ?? false,
      dryRun: options.dryRun ?? false,
      beforeReplace: () => source.close()
    });
    if (!options.dryRun) {
      snapshot?.recordSave(patch);
      snapshot?.recordDate(input, submitted, normalized.date);
      if (update.format === 'mp4') {
        snapshot?.recordMp4Artists(input, submitted, patch);
      }
    }
    return { format: update.format, ...result, paddingBytes: update.paddingBytes };
  } finally {
    await source.close();
  }
}
