import type { IAudioMetadata } from '../type.js';
import { detectFormat } from './core/detect.js';
import { assertPatch, buildUpdate } from './core/shared.js';
import { openSource } from './core/source.js';
import type { CommonTags, TagPatch, WriteOptions, WriteResult } from './core/types.js';
import { writeChunks } from './core/writer.js';
import { normalizeCommonPatch } from './mapping/common.js';
import { mp4HasArtistsItem } from './mp4/mp4.js';

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
  /** Vorbis DISCOGS_ALBUM_ARTISTS is read as albumartists but never written. */
  private readonly separateAlbumArtists: boolean;
  private isMp4: boolean;

  constructor({ common, native }: IAudioMetadata) {
    this.isMp4 = native.iTunes !== undefined;
    // Vorbis keeps an explicit ARTISTS list apart from ARTIST; MP4 records its item before each write.
    this.separateArtists = native.vorbis?.some(tag => tag.id.toUpperCase() === 'ARTISTS') ?? false;
    this.separateAlbumArtists = native.vorbis?.some(tag => tag.id.toUpperCase() === 'DISCOGS_ALBUM_ARTISTS') ?? false;
    const { artist, artists, albumartist, albumartists, movementIndex } = common;
    this.artists = { artist, artists: artists?.slice(), albumartist, albumartists: albumartists?.slice() };
    this.year = common.year;
    this.date = common.date;
    this.hasMovementIndex = movementIndex.no !== null || movementIndex.of !== null;
  }

  recordMp4ArtistsItem(exists: boolean): void {
    this.separateArtists = exists;
  }

  normalize(patch: TagPatch): void {
    if (!this.hasMovementIndex && patch.movementIndex?.no === null && patch.movementIndex.of === null) {
      delete patch.movementIndex;
    }
    if (patch.year !== this.year && patch.date === this.date) {
      delete patch.date;
    }
    if (this.isMp4 && patch.artist === this.artists.artist) {
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

  // Record committed artist values after a successful write so later edits
  // can be detected against this snapshot. Used by Vorbis and other formats
  // where artist and artists are stored independently.
  recordArtists(input: TagPatch, submitted: TagPatch, patch: TagPatch): void {
    const separateAtEntry = this.separateArtists;
    for (const [singular, plural] of artistPairs) {
      const prevSingular = this.artists[singular];
      const prevPlural = this.artists[plural];
      const singularChanged = submitted[singular] !== prevSingular;
      const pluralChanged = !sameArtists(submitted[plural], prevPlural);
      const pluralDerived =
        prevPlural === undefined ||
        (Array.isArray(prevPlural) && prevPlural.length === 1 && prevPlural[0] === prevSingular);
      // Keep the live model aligned with what was written, without clobbering independent lists
      // or edits the caller made while the save was pending.
      const coupled = singular !== 'artist' || !separateAtEntry;
      const syncInput = () => {
        const name = submitted[singular];
        const list = submitted[plural];
        if (
          coupled &&
          singularChanged &&
          !pluralChanged &&
          // Album artist aliases share one field unless a Discogs list exists; an artist list may be
          // stored independently.
          (singular === 'artist' ? pluralDerived : !this.separateAlbumArtists) &&
          typeof name === 'string' &&
          sameArtists(input[plural], submitted[plural])
        ) {
          input[plural] = [name];
        } else if (
          // Album artist aliases share one field (MP4 aART, Vorbis ALBUMARTIST). Only a single MP4
          // atom also stores the artist list in the display field; Vorbis keeps ARTISTS apart.
          coupled &&
          (singular !== 'artist' || (this.isMp4 && patch.artist === undefined)) &&
          pluralChanged &&
          !singularChanged &&
          Array.isArray(list) &&
          input[singular] === submitted[singular]
        ) {
          if (list.length > 0) {
            input[singular] = list[0];
          } else {
            delete input[singular];
          }
        }
      };
      if (
        singular === 'artist' &&
        (this.separateArtists || patch.artist === null || (patch.artist !== undefined && patch.artists !== undefined))
      ) {
        if (patch.artists !== undefined) {
          this.separateArtists = patch.artists !== null;
        }
        if (patch.artists === null && input.artists === null && input.artists === submitted.artists) {
          // Consume the removal only while the caller has not changed it since the save began.
          delete input.artists;
        }
        this.artists.artist = typeof submitted.artist === 'string' ? submitted.artist : undefined;
        this.artists.artists = Array.isArray(submitted.artists) ? submitted.artists.slice() : undefined;
        syncInput();
        continue;
      }
      const list = patch[plural];
      const name = patch[singular];
      if (list === null && submitted[singular] === undefined) {
        // The shared field is removed, so neither alias remains.
        this.artists[singular] = undefined;
        this.artists[plural] = undefined;
        if (input[plural] === null && submitted[plural] === null) {
          delete input[plural];
        }
        continue;
      }
      if (!Array.isArray(list) && typeof name !== 'string') {
        continue;
      }
      const saved: string[] = Array.isArray(list) ? list : [name as string];
      this.artists[singular] = saved[0];
      this.artists[plural] = saved.slice();
      syncInput();
    }
  }

  // Synchronize MP4 aliases after a successful write, keeping Picard artist lists independent.
  recordMp4Artists(input: TagPatch, submitted: TagPatch, patch: TagPatch): void {
    // An initially untagged MP4 has no native iTunes tags when opened.
    this.isMp4 = true;
    this.recordArtists(input, submitted, patch);
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
  const source = await openSource(filePath);
  try {
    if (snapshot) {
      const format = await detectFormat(source);
      if (format === 'mp4') {
        snapshot.recordMp4ArtistsItem(await mp4HasArtistsItem(source));
      }
    }
    snapshot?.normalize(patch);
    const normalized = normalizeCommonPatch(patch);
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
      } else if (update.format === 'ogg' || update.format === 'flac') {
        snapshot?.recordArtists(input, submitted, patch);
      }
    }
    return { format: update.format, ...result, paddingBytes: update.paddingBytes };
  } finally {
    await source.close();
  }
}
