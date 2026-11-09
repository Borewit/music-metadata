import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { updateFile, WriteError } from 'music-metadata';
import { describe, expect, it, vi } from 'vitest';
import * as sources from '../lib/write/core/source.js';

const original = Buffer.from([255, 251, 144, 196, ...new Uint8Array(413)]);

// Real files and real partial writes: only the selected operation is substituted.
describe('atomic write failure safety', () => {
  for (const failure of [
    'read',
    'write',
    'zero write',
    'sync',
    'close',
    'chmod',
    'backup',
    'backup ENOENT',
    'release',
    'rename'
  ] as const) {
    it(`preserves the destination and releases resources after ${failure} fails`, async () => {
      const directory = await fs.mkdtemp(path.join(tmpdir(), 'atomic-failure-'));
      const target = path.join(directory, 'audio.mp3');
      await fs.writeFile(target, original);
      const injected = Object.assign(new Error(`Injected ${failure}`), {
        code: failure === 'backup ENOENT' ? 'ENOENT' : 'EIO'
      });
      const live = new Set<unknown>();
      const openSource = sources.openSource;
      const open = fs.open.bind(fs);
      let readCalls = 0;
      let writes = 0;
      let closes = 0;
      let caught: unknown;
      vi.spyOn(sources, 'openSource').mockImplementation(async input => {
        const source = await openSource(input);
        live.add(source);
        const read = source.read.bind(source);
        const close = source.close.bind(source);
        source.read = async (offset, length) => {
          // Parsing happens before staging; fail only the payload read.
          readCalls++;
          if (failure === 'read' && length === original.length) {
            throw injected;
          }
          return read(offset, length);
        };
        source.close = async () => {
          await close();
          live.delete(source);
          if (failure === 'release') {
            throw injected;
          }
        };
        return source;
      });
      vi.spyOn(fs, 'open').mockImplementation(async (...args) => {
        const handle = await open(...args);
        live.add(handle);
        const write = handle.write.bind(handle);
        const close = handle.close.bind(handle);
        vi.spyOn(handle, 'write').mockImplementation((async (buffer: Uint8Array, offset: number, length: number) => {
          writes++;
          if (writes === 1) {
            return write(buffer, offset, Math.min(7, length));
          }
          if (failure === 'write') {
            throw injected;
          }
          if (failure === 'zero write') {
            return { bytesWritten: 0, buffer };
          }
          return write(buffer, offset, length);
        }) as typeof handle.write);
        if (failure === 'sync') {
          vi.spyOn(handle, 'sync').mockRejectedValue(injected);
        }
        vi.spyOn(handle, 'close').mockImplementation(async () => {
          closes++;
          if (failure === 'close' && closes === 1) {
            throw injected;
          }
          await close();
          live.delete(handle);
        });
        return handle;
      });
      if (failure === 'chmod') {
        vi.spyOn(fs, 'chmod').mockRejectedValue(injected);
      }
      if (failure === 'backup' || failure === 'backup ENOENT') {
        vi.spyOn(fs, 'copyFile').mockImplementation(async (_from, to) => {
          // A failed backup may have already overwritten an existing backup.
          await fs.writeFile(to, 'partial backup');
          throw injected;
        });
      }
      const rename = vi.spyOn(fs, 'rename');
      if (failure === 'rename') {
        rename.mockRejectedValue(injected);
      }
      try {
        try {
          await updateFile(target, { title: 'Replacement title' }, { backup: true });
        } catch (error) {
          caught = error;
        }
        expect(caught).toBeInstanceOf(Error);
        if (failure !== 'release') {
          expect(caught).toBeInstanceOf(WriteError);
        }
        if (failure !== 'release' && failure !== 'zero write') {
          expect((caught as Error).cause).toBe(injected);
        }
        expect(await fs.readFile(target)).toEqual(original);
        expect(live.size).toBe(0);
        expect((await fs.readdir(directory)).filter(name => name.endsWith('.tmp'))).toEqual([]);
        expect(readCalls).toBeGreaterThan(0);
        if (failure !== 'read') {
          expect(writes).toBeGreaterThan(1);
        }
        expect(rename).toHaveBeenCalledTimes(failure === 'rename' ? 1 : 0);
        if (failure === 'rename' || failure === 'release') {
          expect(await fs.readFile(`${target}.bak`)).toEqual(original);
        }
        if (failure.startsWith('backup')) {
          expect(await fs.readFile(`${target}.bak`, 'utf8')).toBe('partial backup');
        }
      } finally {
        vi.restoreAllMocks();
        await fs.rm(directory, { recursive: true, force: true });
      }
    });
  }

  it('commits without a backup when only the backup source stat reports ENOENT', async () => {
    const directory = await fs.mkdtemp(path.join(tmpdir(), 'atomic-backup-stat-'));
    const inputPath = path.join(directory, 'audio.mp3');
    await fs.writeFile(inputPath, original);
    // Match the writer's resolved path (Windows expands short temp-directory names).
    const target = await fs.realpath(inputPath);
    const stat = fs.stat.bind(fs);
    let destinationStats = 0;
    vi.spyOn(fs, 'stat').mockImplementation(async (...args) => {
      if (args[0] === target && ++destinationStats === 2) {
        throw Object.assign(new Error('Backup source disappeared'), { code: 'ENOENT' });
      }
      return stat(...args);
    });
    const copy = vi.spyOn(fs, 'copyFile');
    try {
      await updateFile(target, { title: 'No backup available' }, { backup: true });
      expect(destinationStats).toBe(2);
      expect(copy).not.toHaveBeenCalled();
      const result = await fs.readFile(target);
      expect(result.includes(Buffer.from('No backup available'))).toBe(true);
      expect(result.subarray(-original.length)).toEqual(original);
      expect(await fs.readdir(directory)).toEqual(['audio.mp3']);
    } finally {
      vi.restoreAllMocks();
      await fs.rm(directory, { recursive: true, force: true });
    }
  });

  it('preserves the destination when a non-atomic backup copy fails', async () => {
    const directory = await fs.mkdtemp(path.join(tmpdir(), 'non-atomic-backup-'));
    const inputPath = path.join(directory, 'audio.mp3');
    await fs.writeFile(inputPath, original);
    // Match the writer's resolved path (Windows expands short temp-directory names).
    const target = await fs.realpath(inputPath);
    const injected = Object.assign(new Error('Backup copy failed'), { code: 'ENOENT' });
    const copy = vi.spyOn(fs, 'copyFile').mockRejectedValue(injected);
    const open = vi.spyOn(fs, 'open');
    try {
      await expect(updateFile(target, { title: 'Replacement' }, { atomic: false, backup: true })).rejects.toBe(
        injected
      );
      expect(copy).toHaveBeenCalledWith(target, `${target}.bak`);
      expect(open).not.toHaveBeenCalledWith(target, 'r+');
      expect(await fs.readFile(target)).toEqual(original);
      expect(await fs.readdir(directory)).toEqual(['audio.mp3']);
    } finally {
      vi.restoreAllMocks();
      await fs.rm(directory, { recursive: true, force: true });
    }
  });

  it('retries partial writes and commits the complete staged file', async () => {
    const directory = await fs.mkdtemp(path.join(tmpdir(), 'atomic-partial-'));
    const target = path.join(directory, 'audio.mp3');
    await fs.writeFile(target, original);
    const open = fs.open.bind(fs);
    let writes = 0;
    vi.spyOn(fs, 'open').mockImplementation(async (...args) => {
      const handle = await open(...args);
      const write = handle.write.bind(handle);
      vi.spyOn(handle, 'write').mockImplementation((async (buffer: Uint8Array, offset: number, length: number) => {
        writes++;
        return write(buffer, offset, Math.min(7, length));
      }) as typeof handle.write);
      return handle;
    });
    try {
      await updateFile(target, { title: 'Complete title' }, { backup: true });
      expect(writes).toBeGreaterThan(2);
      const result = await fs.readFile(target);
      expect(result.subarray(-original.length)).toEqual(original);
      expect(result.includes(Buffer.from('Complete title'))).toBe(true);
      expect(await fs.readFile(`${target}.bak`)).toEqual(original);
      expect((await fs.readdir(directory)).sort()).toEqual(['audio.mp3', 'audio.mp3.bak']);
    } finally {
      vi.restoreAllMocks();
      await fs.rm(directory, { recursive: true, force: true });
    }
  });
});
