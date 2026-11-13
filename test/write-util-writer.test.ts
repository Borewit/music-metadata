import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { InvalidFileError, parseBuffer, updateBuffer, updateFile, WriteError } from 'music-metadata';
import { fromBuffer, fromFile } from 'strtok3';
import { describe, expect, it, vi } from 'vitest';
import { updateBuffer as updateBrowserBuffer } from '../lib/core.js';
import { writeBuffer } from '../lib/write/core/chunks.js';
import * as browserSources from '../lib/write/core/source.browser.js';
import * as sources from '../lib/write/core/source.js';
import { TokenizerSource } from '../lib/write/core/source.shared.js';

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

// Delay lazy payload reads so early finally/close is observable even for buffers.
describe('buffer source lifetime', () => {
  for (const [platform, update, module] of [
    ['Node', updateBuffer, sources],
    ['browser', updateBrowserBuffer, browserSources]
  ] as const) {
    it.each([false, true])(`${platform} closes only after assembly settles (failure=%s)`, async fail => {
      const open = module.openSource;
      let closed = false;
      let closes = 0;
      const failure = new Error('Payload read failed');
      const spy = vi.spyOn(module, 'openSource').mockImplementation(async input => {
        const source = await open(input as Uint8Array);
        const read = source.read.bind(source);
        const close = source.close.bind(source);
        source.read = async (offset, length) => {
          if (offset === 0 && length === original.length) {
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(closed).toBe(false);
            if (fail) {
              throw failure;
            }
          }
          return read(offset, length);
        };
        source.close = async () => {
          closed = true;
          closes++;
          await close();
        };
        return source;
      });
      try {
        const result = update(original, { title: 'Lifetime' });
        if (fail) {
          await expect(result).rejects.toBe(failure);
        } else {
          expect((await result).length).toBeGreaterThan(original.length);
        }
        expect(closed).toBe(true);
        expect(closes).toBe(1);
      } finally {
        spy.mockRestore();
      }
    });
  }
});

describe('shared byte plumbing', () => {
  it('rejects invalid patches consistently before opening a source', async () => {
    for (const update of [updateBuffer, updateBrowserBuffer]) {
      await expect(update(original, null)).rejects.toThrow('patch must be an object');
    }
  });

  it('keeps internal buffer dry runs from reading source ranges', async () => {
    const source = new TokenizerSource(fromBuffer(original));
    const read = vi.spyOn(source, 'read');
    try {
      const output = await writeBuffer([Uint8Array.of(1), { source, offset: 0, length: 3 }], { dryRun: true });
      expect(output).toEqual(new Uint8Array(4));
      expect(read).not.toHaveBeenCalled();
    } finally {
      await source.close();
    }
  });

  it('rejects invalid and unavailable ranges without reading the tokenizer', async () => {
    const source = new TokenizerSource(fromBuffer(original));
    const read = vi.spyOn(source.tokenizer, 'readBuffer');
    try {
      for (const [offset, length] of [
        [-1, 1],
        [0, -1],
        [0.5, 1],
        [0, Number.MAX_SAFE_INTEGER + 1]
      ]) {
        await expect(source.read(offset, length)).rejects.toThrow('Invalid read range');
      }
      await expect(source.read(original.length, 1)).rejects.toThrow('Unexpected end of file');
      expect(await source.read(original.length, 0)).toEqual(new Uint8Array(0));
      expect(read).not.toHaveBeenCalled();
    } finally {
      await source.close();
    }
  });

  it('delegates fragmented file reads to one tokenizer request per source range', async () => {
    const input = await fs.readFile(new URL('./samples/wav/cest_id3-before-data.wav', import.meta.url));
    const directory = await fs.mkdtemp(path.join(tmpdir(), 'source-partial-'));
    const target = path.join(directory, 'audio.wav');
    await fs.writeFile(target, input);
    const open = fs.open.bind(fs);
    let reads = 0;
    vi.spyOn(fs, 'open').mockImplementation(async (...args) => {
      const handle = await open(...args);
      const read = handle.read.bind(handle);
      vi.spyOn(handle, 'read').mockImplementation((async (
        buffer: Uint8Array,
        offset: number,
        length: number,
        position: number
      ) => {
        reads++;
        return read(buffer, offset, Math.min(3, length), position);
      }) as typeof handle.read);
      return handle;
    });
    let source: TokenizerSource | undefined;
    try {
      source = new TokenizerSource(await fromFile(target));
      const read = vi.spyOn(source.tokenizer, 'readBuffer');
      expect(await source.read(7, 19)).toEqual(new Uint8Array(input.subarray(7, 26)));
      expect(source.tokenizer.position).toBe(26);
      expect(read).toHaveBeenCalledTimes(1);
      expect(await source.read(2, 3)).toEqual(new Uint8Array(input.subarray(2, 5)));
      expect(source.tokenizer.position).toBe(5);
      expect(read).toHaveBeenCalledTimes(2);
      expect(reads).toBe(8);
      expect(await fs.readFile(target)).toEqual(input);
    } finally {
      await source?.close();
      vi.restoreAllMocks();
      await fs.rm(directory, { recursive: true, force: true });
    }
  });

  for (const available of [0, 5]) {
    it(`rejects physical EOF with ${available} bytes available despite the declared file size`, async () => {
      const input = await fs.readFile(new URL('./samples/wav/cest_id3-before-data.wav', import.meta.url));
      const directory = await fs.mkdtemp(path.join(tmpdir(), 'source-truncated-'));
      const target = path.join(directory, 'audio.wav');
      await fs.writeFile(target, input);
      const source = await sources.openSource(target);
      const offset = input.length - 15;
      try {
        await fs.truncate(target, offset + available);
        expect(source.size).toBe(input.length);
        const reading = source.read(offset, 15);
        await expect(reading).rejects.toThrow(InvalidFileError);
        await expect(reading).rejects.toThrow(`Unexpected end of file while reading at offset ${offset + available}`);
        expect(source.tokenizer.position).toBe(offset + available);
      } finally {
        await source.close();
        await fs.rm(directory, { recursive: true, force: true });
      }
    });
  }

  for (const sample of [
    'mp3/discogs-album-artists-v24-primary-first.mp3',
    'aac/short-final-frame.aac',
    'flac/date-precedence-year.flac',
    'wav/pcm16-fact.wav',
    'mp4/aac-faststart.m4a',
    'ogg/generated-vorbis.ogg',
    'ogg/generated-opus.opus',
    'monkeysaudio-date.ape',
    'wavpack/unknown-count-multichannel.wv',
    'mpc/bach-goldberg-variatians-05.sv8.mpc'
  ]) {
    for (const atomic of [true, false]) {
      it(`writes ${sample} with fragmented filesystem reads, atomic=${atomic}`, async () => {
        const input = await fs.readFile(new URL(`./samples/${sample}`, import.meta.url));
        const patch = { title: 'Fragmented read update' };
        const expected = await updateBuffer(input, patch);
        const directory = await fs.mkdtemp(path.join(tmpdir(), 'write-partial-read-'));
        const target = path.join(directory, path.basename(sample));
        await fs.writeFile(target, input);
        const open = fs.open.bind(fs);
        const live = new Set<Awaited<ReturnType<typeof fs.open>>>();
        let reads = 0;
        vi.spyOn(fs, 'open').mockImplementation(async (...args) => {
          const handle = await open(...args);
          live.add(handle);
          const read = handle.read.bind(handle);
          const close = handle.close.bind(handle);
          vi.spyOn(handle, 'read').mockImplementation((async (
            buffer: Uint8Array,
            offset: number,
            length: number,
            position: number
          ) => {
            reads++;
            return read(buffer, offset, Math.min(sample.endsWith('.ape') ? 127 : 3, length), position);
          }) as typeof handle.read);
          vi.spyOn(handle, 'close').mockImplementation(async () => {
            await close();
            live.delete(handle);
          });
          return handle;
        });
        try {
          const result = await updateFile(target, patch, { atomic });
          const output = await fs.readFile(target);
          expect(output).toEqual(Buffer.from(expected));
          expect((await parseBuffer(output)).common.title).toBe(patch.title);
          expect(result.bytesWritten).toBe(output.length);
          expect(result.atomic).toBe(atomic);
          expect(reads).toBeGreaterThan(1);
          expect(live.size).toBe(0);
          expect(await fs.readdir(directory)).toEqual([path.basename(target)]);
          expect(input).toEqual(await fs.readFile(new URL(`./samples/${sample}`, import.meta.url)));
        } finally {
          vi.restoreAllMocks();
          await fs.rm(directory, { recursive: true, force: true });
        }
      });
    }
  }

  it('rejects a tokenizer that ends before its declared range', async () => {
    const source = new TokenizerSource(fromBuffer(original));
    vi.spyOn(source.tokenizer, 'readBuffer').mockResolvedValue(0);
    try {
      await expect(source.read(0, 1)).rejects.toThrow('Unexpected end of file while reading');
    } finally {
      await source.close();
    }
  });
});
