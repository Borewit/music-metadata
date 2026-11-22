import { assertPatch, buildUpdate } from './core/shared.js';
import { openSource } from './core/source.js';
import type { CommonTags, TagPatch, WriteOptions, WriteResult } from './core/types.js';
import { writeChunks } from './core/writer.js';
import { normalizeCommonPatch } from './mapping/common.js';

const artistPairs = [
  ['artist', 'artists'],
  ['albumArtist', 'albumArtists']
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
  private readonly artists: Pick<CommonTags, 'artist' | 'artists' | 'albumArtist' | 'albumArtists'>;
  private year: number | undefined;
  private date: string | undefined;
  private movementNumber: TagPatch['movementNumber'];
  private movementTotal: TagPatch['movementTotal'];

  constructor(common: CommonTags) {
    const { artist, artists, albumArtist, albumArtists, movementNumber, movementTotal } = common;
    this.artists = { artist, artists: artists?.slice(), albumArtist, albumArtists: albumArtists?.slice() };
    this.year = common.year;
    this.date = common.date;
    this.movementNumber = movementNumber;
    this.movementTotal = movementTotal;
  }

  normalize(patch: TagPatch): void {
    if (
      this.movementNumber == null &&
      this.movementTotal == null &&
      patch.movementNumber === undefined &&
      patch.movementTotal === undefined &&
      patch.movementIndex?.no === null &&
      patch.movementIndex.of === null
    ) {
      delete patch.movementIndex;
    }
    if (patch.year !== this.year && patch.date === this.date) {
      delete patch.date;
    }
    for (const [singular, plural] of artistPairs) {
      if (patch[singular] !== this.artists[singular] && sameArtists(patch[plural], this.artists[plural])) {
        delete patch[plural];
      }
    }
  }

  // MP4 stores both aliases in one atom. Synchronize them only after the write succeeds.
  // The reader returns a list only when the atom holds several names; one value is the display credit.
  recordMp4Artists(input: TagPatch, submitted: TagPatch, patch: TagPatch): void {
    for (const [singular, plural] of artistPairs) {
      const list = patch[plural];
      const name = patch[singular];
      if (!Array.isArray(list) && typeof name !== 'string') {
        continue;
      }
      const savedName = Array.isArray(list) ? list[0] : (name as string);
      const savedList = Array.isArray(list) && list.length > 1 ? list.slice() : undefined;
      this.artists[singular] = savedName;
      this.artists[plural] = savedList;
      // Retain edits the caller made while the write was in progress.
      if (input[singular] === submitted[singular]) {
        input[singular] = savedName;
      }
      // A saved multi-name list already matches the submitted list.
      if (savedList === undefined && input[plural] !== undefined && sameArtists(input[plural], submitted[plural])) {
        delete input[plural];
      }
    }
  }

  recordSave(movement: TagPatch['movementIndex']): void {
    if (movement === null || movement?.no !== undefined) {
      this.movementNumber = movement === null ? null : movement.no;
    }
    if (movement === null || movement?.of !== undefined) {
      this.movementTotal = movement === null ? null : movement.of;
    }
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
      snapshot?.recordSave(normalized.movementIndex);
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
