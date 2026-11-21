import { resolve } from 'node:path';
import { parseFile } from '../parseFile.js';
import type { IAudioMetadata, IOptions } from '../type.js';
import type { TagPatch, WriteOptions, WriteResult } from './core/types.js';
import { FileTagSnapshot, writeFileTags } from './file.js';

/** A local audio file and its parsed metadata. Edit metadata.common before saving. */
export class MediaFile {
  private snapshot: FileTagSnapshot;

  private constructor(
    private readonly filePath: string,
    private parsed: IAudioMetadata,
    private readonly options?: IOptions
  ) {
    this.snapshot = new FileTagSnapshot(this.parsed);
  }

  get metadata(): IAudioMetadata {
    return this.parsed;
  }

  /** Write only the supplied common and native fields. On success, reload the metadata from disk. */
  async applyPatch(patch: TagPatch, options?: WriteOptions): Promise<WriteResult> {
    const result = await writeFileTags(this.filePath, patch, options);
    if (!options?.dryRun) {
      const metadata = await parseFile(this.filePath, this.options);
      this.parsed = metadata;
      this.snapshot = new FileTagSnapshot(metadata);
    }
    return result;
  }

  static async open(filePath: string, options?: IOptions): Promise<MediaFile> {
    const path = resolve(filePath);
    return new MediaFile(path, await parseFile(path, options), options);
  }

  /** Apply the current common tags as a patch to the original file. */
  save(options?: WriteOptions): Promise<WriteResult> {
    return writeFileTags(this.filePath, this.metadata.common, options, this.snapshot);
  }
}
