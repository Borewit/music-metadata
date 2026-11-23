import { assertPatch, buildUpdate } from './core/shared.js';
import { openSource } from './core/source.js';
import type { CommonTags, TagPatch, WriteOptions, WriteResult } from './core/types.js';
import { writeChunks } from './core/writer.js';
import { normalizeCommonPatch } from './mapping/common.js';

export class FileTagSnapshot {
  private year: number | undefined;
  private date: string | undefined;
  private movementNumber: TagPatch['movementNumber'];
  private movementTotal: TagPatch['movementTotal'];

  constructor(common: CommonTags) {
    const { movementNumber, movementTotal } = common;
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
    // Capture list contents before asynchronous I/O without mutating the caller's model.
    for (const field of ['artists', 'albumArtists'] as const) {
      const list = submitted[field];
      if (Array.isArray(list)) {
        submitted[field] = list.slice();
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
    }
    return { format: update.format, ...result, paddingBytes: update.paddingBytes };
  } finally {
    await source.close();
  }
}
