import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { parseFile } from '../parseFile.js';
import type { IAudioMetadata, IOptions } from '../type.js';
import { WriteError } from './core/errors.js';
import type { TagPatch, WriteOptions, WriteResult } from './core/types.js';
import { FileTagSnapshot, writeFileTags } from './file.js';

export interface ReloadOptions {
  /** Allow replacing unsaved common-tag edits, including edits made while the operation is running. */
  discardUnsavedChanges?: boolean;
}

export interface ApplyPatchOptions extends WriteOptions, ReloadOptions {}

/** A committed write is never reported as a write failure just because its metadata could not be refreshed. */
export type ApplyPatchResult = WriteResult & {
  refresh: { status: 'ok' } | { status: 'skipped'; reason: 'dry-run' } | { status: 'failed'; error: unknown };
};

/** A local audio file and its parsed metadata. Edit metadata.common before saving. */
export class MediaFile {
  private snapshot: FileTagSnapshot;
  private savedCommon: IAudioMetadata['common'];
  /** Set when a committed patch could not be reloaded; the metadata no longer matches the file. */
  private stale: { error: unknown } | undefined;
  /** Writes and reloads run one at a time, so none can act on metadata another is replacing. */
  private pending: Promise<unknown> | undefined;

  private constructor(
    private readonly filePath: string,
    private parsed: IAudioMetadata,
    private readonly options?: IOptions
  ) {
    this.snapshot = new FileTagSnapshot(this.parsed.common);
    this.savedCommon = structuredClone(this.parsed.common);
  }

  get metadata(): IAudioMetadata {
    return this.parsed;
  }

  /**
   * Write only the supplied common and native fields, then reload the metadata from disk.
   * Unsaved common edits are protected unless discardUnsavedChanges is explicitly enabled.
   * Inspect result.refresh: a failed refresh leaves the write committed and save() blocked
   * until a refresh succeeds. Dry runs do not refresh or discard edits.
   */
  async applyPatch(patch: TagPatch, options: ApplyPatchOptions = {}): Promise<ApplyPatchResult> {
    const submitted = structuredClone(patch);
    const { discardUnsavedChanges = false, ...writeOptions } = options;
    return this.serialize(async () => {
      if (!writeOptions.dryRun) {
        this.assertCanRefresh(discardUnsavedChanges);
      }
      const result = await writeFileTags(this.filePath, submitted, writeOptions);
      if (writeOptions.dryRun) {
        return { ...result, refresh: { status: 'skipped', reason: 'dry-run' } };
      }
      try {
        await this.refresh(discardUnsavedChanges);
        return { ...result, refresh: { status: 'ok' } };
      } catch (error) {
        this.stale = { error };
        return { ...result, refresh: { status: 'failed', error } };
      }
    });
  }

  /** Re-read metadata; discarding unsaved common edits requires explicit permission. */
  reload(options: ReloadOptions = {}): Promise<void> {
    const { discardUnsavedChanges = false } = options;
    return this.serialize(() => this.refresh(discardUnsavedChanges));
  }

  private assertCanRefresh(discardUnsavedChanges: boolean): void {
    // Clone before comparing so Buffer and Uint8Array inputs have the same representation.
    if (!discardUnsavedChanges && !isDeepStrictEqual(structuredClone(this.parsed.common), this.savedCommon)) {
      throw new WriteError('MediaFile has unsaved common edits; save them or explicitly set discardUnsavedChanges');
    }
  }

  private async refresh(discardUnsavedChanges: boolean): Promise<void> {
    this.assertCanRefresh(discardUnsavedChanges);
    const refreshed = await MediaFile.open(this.filePath, this.options);
    // Public metadata remains mutable during I/O. Never replace newly made edits implicitly.
    this.assertCanRefresh(discardUnsavedChanges);
    this.parsed = refreshed.metadata;
    this.snapshot = refreshed.snapshot;
    this.savedCommon = refreshed.savedCommon;
    this.stale = undefined;
  }

  /** Clear the queue before the caller observes settlement, including after a rejection. */
  private serialize<T>(task: () => Promise<T>): Promise<T> {
    const result = this.pending ? this.pending.then(task, task) : task();
    const pending = result.finally(() => {
      if (this.pending === pending) {
        this.pending = undefined;
      }
    });
    this.pending = pending;
    // Keep a rejected operation from creating an unhandled internal queue rejection.
    void pending.catch(() => undefined);
    return pending;
  }

  static async open(filePath: string, options?: IOptions): Promise<MediaFile> {
    const path = resolve(filePath);
    const readOptions = { ...options };
    return new MediaFile(path, await parseFile(path, readOptions), readOptions);
  }

  /** Apply the current common tags as a patch to the original file. */
  async save(options?: WriteOptions): Promise<WriteResult> {
    const common = this.parsed.common;
    const prepared = this.snapshot.prepare(common);
    const writeOptions = { ...options };
    return this.serialize(async () => {
      if (this.parsed.common !== common) {
        throw new WriteError(
          'MediaFile metadata was reloaded before this save; edits to the old metadata were not saved'
        );
      }
      if (this.stale) {
        throw new WriteError('MediaFile metadata is stale after a patch; call reload() before saving', {
          cause: this.stale.error
        });
      }
      const result = await writeFileTags(this.filePath, prepared.patch, writeOptions);
      if (!writeOptions.dryRun) {
        this.savedCommon = prepared.record(result.format);
      }
      return result;
    });
  }
}
