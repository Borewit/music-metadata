import { resolve } from 'node:path';
import { parseFile } from '../parseFile.js';
import type { IAudioMetadata, IOptions } from '../type.js';
import type { WriteOptions, WriteResult } from './core/types.js';
import { FileTagSnapshot, writeFileTags } from './file.js';

/** A local audio file and its parsed metadata. Edit metadata.common before saving. */
export class MediaFile {
  private readonly snapshot: FileTagSnapshot;

  private constructor(
    private readonly filePath: string,
    public readonly metadata: IAudioMetadata
  ) {
    this.snapshot = new FileTagSnapshot(metadata);
  }

  static async open(filePath: string, options?: IOptions): Promise<MediaFile> {
    const path = resolve(filePath);
    return new MediaFile(path, await parseFile(path, options));
  }

  /** Apply the current common tags as a patch to the original file. */
  save(options?: WriteOptions): Promise<WriteResult> {
    return writeFileTags(this.filePath, this.metadata.common, options, this.snapshot);
  }
}
