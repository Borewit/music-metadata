import fs from 'node:fs/promises';
import path from 'node:path';
import type { WriteChunk } from './chunks.js';
import { WriteError } from './errors.js';

export type { WriteChunk } from './chunks.js';

const COPY_CHUNK_SIZE = 1024 * 1024;

export interface AtomicWriteOptions {
  atomic: boolean;
  backup: boolean;
  dryRun: boolean;
  /** Stage source ranges on disk even when replacement is non-atomic. */
  stageToFile?: boolean;
  /** Release caller-owned input handles after disk staging, before replacement. */
  beforeReplace?: () => Promise<void>;
}

export interface AtomicWriteResult {
  bytesWritten: number;
  atomic: boolean;
}

/**
 * Write chunks to `filePath`.
 *
 * The default path writes to a temporary file in the same directory, flushes
 * it, and renames it over the destination. The source ranges are read lazily,
 * so large audio payloads are copied in chunks rather than loaded into memory.
 */
export async function writeChunks(
  filePath: string,
  chunks: readonly WriteChunk[],
  options: AtomicWriteOptions
): Promise<AtomicWriteResult> {
  const totalBytes = chunks.reduce((sum, chunk) => sum + chunk.length, 0);

  if (options.dryRun) {
    return { bytesWritten: totalBytes, atomic: options.atomic };
  }

  // Resolve links before replacing a directory entry.
  filePath = await fs.realpath(filePath);
  if (!options.atomic && !options.stageToFile) {
    // Stage before opening the destination: source ranges may reference it.
    const parts: Uint8Array[] = [];
    for (const chunk of chunks) {
      parts.push(chunk instanceof Uint8Array ? chunk : await chunk.source.read(chunk.offset, chunk.length));
    }
    if (options.backup) {
      await backupFile(filePath);
    }
    const target = await fs.open(filePath, 'r+');
    try {
      for (const part of parts) {
        await writeAll(target, part);
      }
      await target.truncate(totalBytes);
      await target.sync();
    } finally {
      await target.close();
    }
    return { bytesWritten: totalBytes, atomic: false };
  }

  const directory = path.dirname(filePath);
  // Keep the staged name within common 255-byte name limits.
  const baseName = Buffer.from(path.basename(filePath))
    .subarray(0, 160)
    .toString('utf8')
    .replace(/\uFFFD+$/, '');
  const temporaryPath = path.join(
    directory,
    `.${baseName}.${process.pid}.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}.tmp`
  );

  let mode: number | undefined;
  let uid: number | undefined;
  let gid: number | undefined;
  try {
    const stat = await fs.stat(filePath);
    mode = stat.mode;
    uid = stat.uid;
    gid = stat.gid;
  } catch {
    // Destination does not exist yet; use the process default.
  }

  let handle: Awaited<ReturnType<typeof fs.open>> | undefined;
  try {
    handle = await fs.open(temporaryPath, 'wx', mode ?? 0o666);
    for (const chunk of chunks) {
      if (chunk instanceof Uint8Array) {
        await writeAll(handle, chunk);
        continue;
      }
      let remaining = chunk.length;
      let offset = chunk.offset;
      while (remaining > 0) {
        const length = Math.min(remaining, COPY_CHUNK_SIZE);
        const data = await chunk.source.read(offset, length);
        await writeAll(handle, data);
        offset += data.length;
        remaining -= data.length;
      }
    }
    await handle.sync();
    await handle.close();
    handle = undefined;

    // Preserve the destination's ownership before replacement; fail before
    // the rename if it cannot be preserved.
    if (uid !== undefined && gid !== undefined) {
      await fs.chown(temporaryPath, uid, gid);
    }

    // Apply the saved mode after ownership changes so its permission bits
    // remain intact.
    if (mode !== undefined) {
      await fs.chmod(temporaryPath, mode & 0o7777);
    }

    if (options.backup) {
      await backupFile(filePath);
    }

    // Release inputs before replacing or overwriting the staged destination.
    await options.beforeReplace?.();
    if (options.atomic) {
      await fs.rename(temporaryPath, filePath);
    } else {
      await fs.copyFile(temporaryPath, filePath);
      await fs.unlink(temporaryPath);
    }

    return { bytesWritten: totalBytes, atomic: options.atomic };
  } catch (error) {
    if (handle !== undefined) {
      await handle.close().catch(() => undefined);
    }
    await fs.unlink(temporaryPath).catch(() => undefined);
    if (error instanceof WriteError) {
      throw error;
    }
    throw new WriteError(`Failed to write '${filePath}'`, { cause: error });
  }
}

async function backupFile(filePath: string): Promise<void> {
  let stat: Awaited<ReturnType<typeof fs.stat>>;
  try {
    stat = await fs.stat(filePath);
  } catch (error) {
    if (isErrorCode(error, 'ENOENT')) {
      return;
    }
    throw error;
  }
  if (stat.isFile()) {
    // Once a source exists, every copy failure must prevent replacement.
    await fs.copyFile(filePath, `${filePath}.bak`);
  }
}

async function writeAll(handle: Awaited<ReturnType<typeof fs.open>>, data: Uint8Array): Promise<void> {
  let offset = 0;
  while (offset < data.length) {
    const result = await handle.write(data, offset, data.length - offset);
    if (result.bytesWritten === 0) {
      throw new WriteError('Failed to write chunk: zero bytes written');
    }
    offset += result.bytesWritten;
  }
}

function isErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}
