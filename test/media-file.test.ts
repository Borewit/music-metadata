import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type ApplyPatchOptions,
  type ApplyPatchResult,
  MediaFile,
  parseFile,
  type ReloadOptions,
  updateFile,
  WriteError
} from '../lib/index.js';

const fixture = fileURLToPath(new URL('./samples/mp4/aac-faststart.m4a', import.meta.url));
const png = () =>
  Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=', 'base64');

/** Hold the next refresh open so edits during the read can be tested deterministically. */
function holdRefresh() {
  const open = MediaFile.open.bind(MediaFile);
  let release!: () => void;
  let started!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  const entered = new Promise<void>(resolve => {
    started = resolve;
  });
  vi.spyOn(MediaFile, 'open').mockImplementationOnce(async (...args) => {
    started();
    await gate;
    return open(...args);
  });
  return { release, entered };
}

describe('MediaFile operation state', () => {
  let dir: string;
  let filePath: string;
  let file: MediaFile;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'media-file-'));
    filePath = path.join(dir, 'track.m4a');
    await fs.copyFile(fixture, filePath);
    file = await MediaFile.open(filePath);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('captures a save immediately after awaiting another operation', async () => {
    await file.save({ dryRun: true });
    file.metadata.common.title = 'Submitted';
    const saving = file.save();
    file.metadata.common.title = 'Later edit';
    await saving;
    expect((await parseFile(filePath)).common.title).toBe('Submitted');
    expect(file.metadata.common.title).toBe('Later edit');
    await expect(file.applyPatch({ album: 'Do not discard edits' })).rejects.toThrow('unsaved common edits');
  });

  it('captures queued saves, nested values, artwork bytes and write options at invocation', async () => {
    const first = file.save({ dryRun: true });
    const common = file.metadata.common;
    common.title = 'Submitted';
    common.genre = ['Rock'];
    common.track = { no: 2, of: 9 };
    common.picture = [{ format: 'image/png', data: png() }];
    const options = { backup: true };
    const saving = file.save(options);
    common.title = 'Later edit';
    common.genre.push('Pop');
    common.track.no = 3;
    common.picture[0].data.fill(0);
    options.backup = false;
    await Promise.all([first, saving]);
    const written = (await parseFile(filePath)).common;
    expect(written).toMatchObject({ title: 'Submitted', genre: ['Rock'], track: { no: 2, of: 9 } });
    expect(written.picture![0].data).toEqual(new Uint8Array(png()));
    expect(await fs.readFile(`${filePath}.bak`)).toEqual(await fs.readFile(fixture));
    expect(common.title).toBe('Later edit');
    await expect(file.reload()).rejects.toThrow('unsaved common edits');
  });

  it('captures alias precedence before queued saves and preserves later edits', async () => {
    await updateFile(filePath, { date: '2001-02-03', artists: ['Original'] });
    await file.reload();
    file.metadata.common.year = 2010;
    file.metadata.common.artist = 'First';
    const first = file.save();
    file.metadata.common.year = 2020;
    file.metadata.common.artist = 'Second';
    const second = file.save();
    file.metadata.common.date = '2025-06-07';
    file.metadata.common.artists!.push('Unsaved guest');
    await Promise.all([first, second]);
    expect((await parseFile(filePath)).common).toMatchObject({ date: '2020', year: 2020, artists: ['Second'] });
    expect(file.metadata.common.date).toBe('2025-06-07');
    expect(file.metadata.common.artists).toEqual(['Original', 'Unsaved guest']);
    await expect(file.reload()).rejects.toThrow('unsaved common edits');
  });

  it('captures queued patches, native arrays and binary bodies at invocation', async () => {
    const first = file.save({ dryRun: true });
    // A complete MP4 data child containing UTF-8 text for a native copyright atom.
    const body = new Uint8Array([0, 0, 0, 17, 100, 97, 116, 97, 0, 0, 0, 1, 0, 0, 0, 0, 65]);
    const patch = {
      title: 'Submitted',
      track: { no: 2 },
      native: { '----:com.apple.iTunes:CATALOG_ID': ['identity'], cprt: body }
    };
    const applying = file.applyPatch(patch);
    patch.title = 'Later edit';
    patch.track.no = 9;
    patch.native['----:com.apple.iTunes:CATALOG_ID'].push('later');
    body[16] = 66;
    await first;
    const result: ApplyPatchResult = await applying;
    expect(result.refresh.status).toBe('ok');
    expect(file.metadata.common).toMatchObject({ title: 'Submitted', track: { no: 2 }, copyright: 'A' });
    expect(file.metadata.native.iTunes).toContainEqual({
      id: '----:com.apple.iTunes:CATALOG_ID',
      value: 'identity'
    });
    expect(file.metadata.native.iTunes).not.toContainEqual({
      id: '----:com.apple.iTunes:CATALOG_ID',
      value: 'later'
    });
  });

  it('does not turn a queued dry run into a real write when its options change', async () => {
    const original = file.metadata;
    const first = file.save({ dryRun: true });
    const options: ApplyPatchOptions = { dryRun: true };
    const applying = file.applyPatch({ title: 'Dry run' }, options);
    options.dryRun = false;
    await first;
    expect((await applying).refresh).toEqual({ status: 'skipped', reason: 'dry-run' });
    expect(file.metadata).toBe(original);
    expect(await fs.readFile(filePath)).toEqual(await fs.readFile(fixture));
  });

  it.each(['nested edit', 'deletion'])('protects a %s before patching or reloading', async kind => {
    if (kind === 'nested edit') {
      file.metadata.common.track.no = 99;
    } else {
      delete file.metadata.common.title;
    }
    const original = file.metadata;
    await expect(file.applyPatch({ title: 'Patch' })).rejects.toThrow('unsaved common edits');
    await expect(file.reload()).rejects.toThrow('unsaved common edits');
    expect(file.metadata).toBe(original);
    expect(await fs.readFile(filePath)).toEqual(await fs.readFile(fixture));
    await file.reload({ discardUnsavedChanges: true });
    expect(file.metadata).not.toBe(original);
  });

  it('recognizes a completed save as clean, including normalized dates, artists and Buffer artwork', async () => {
    file.metadata.common.year = 2015;
    file.metadata.common.artist = 'Saved artist';
    file.metadata.common.picture = [{ format: 'image/png', data: png() }];
    await file.save();
    expect((await file.applyPatch({ album: 'Patched' })).refresh.status).toBe('ok');
    expect(file.metadata.common).toMatchObject({
      year: 2015,
      date: '2015',
      artists: ['Saved artist'],
      album: 'Patched'
    });
    expect(file.metadata.common.picture![0].data).toEqual(new Uint8Array(png()));
  });

  it('does not mark edits clean after a dry run or a failed save', async () => {
    file.metadata.common.title = 'Unsaved';
    await file.save({ dryRun: true });
    await expect(file.reload()).rejects.toThrow('unsaved common edits');
    await expect(file.save({ padding: 1 })).rejects.toThrow();
    await expect(file.applyPatch({ title: 'Patch' })).rejects.toThrow('unsaved common edits');
    await file.save();
    await file.reload();
    expect(file.metadata.common.title).toBe('Unsaved');
  });

  it('keeps edits made during a patch write and reports the committed-but-unrefreshed result', async () => {
    const original = file.metadata;
    const applying = file.applyPatch({ title: 'Committed' });
    original.common.album = 'New unsaved edit';
    const result = await applying;
    expect(result.refresh.status).toBe('failed');
    if (result.refresh.status === 'failed') {
      expect(result.refresh.error).toBeInstanceOf(WriteError);
    }
    expect((await parseFile(filePath)).common.title).toBe('Committed');
    expect(file.metadata).toBe(original);
    expect(file.metadata.common.album).toBe('New unsaved edit');
    await expect(file.save()).rejects.toThrow('stale after a patch');
    await expect(file.reload()).rejects.toThrow('unsaved common edits');
    await file.reload({ discardUnsavedChanges: true });
    expect(file.metadata.common.title).toBe('Committed');
    await file.save();
  });

  it.each(['patch', 'reload'])('keeps edits made during a %s refresh', async operation => {
    const held = holdRefresh();
    const original = file.metadata;
    const result = operation === 'patch' ? file.applyPatch({ title: 'Committed' }) : file.reload();
    const checked =
      operation === 'patch'
        ? expect(result).resolves.toMatchObject({ refresh: { status: 'failed' } })
        : expect(result).rejects.toThrow('unsaved common edits');
    try {
      await held.entered;
      file.metadata.common.track.no = 99;
    } finally {
      held.release();
    }
    await checked;
    expect(file.metadata).toBe(original);
    expect(file.metadata.common.track.no).toBe(99);
    await file.reload({ discardUnsavedChanges: true });
  });

  it('captures explicit discard permission for a queued reload', async () => {
    const first = file.save({ dryRun: true });
    file.metadata.common.title = 'Unsaved';
    const options: ReloadOptions = { discardUnsavedChanges: true };
    const reloading = file.reload(options);
    options.discardUnsavedChanges = false;
    await Promise.all([first, reloading]);
    expect(file.metadata.common.title).toBe('Original');
  });

  it('continues the queue after a write fails without poisoning the next patch', async () => {
    const failed = expect(file.applyPatch({ title: 'Rejected' }, { padding: 1 })).rejects.toThrow();
    const succeeding = file.applyPatch({ title: 'Accepted' });
    await failed;
    expect((await succeeding).refresh.status).toBe('ok');
    expect(file.metadata.common.title).toBe('Accepted');
    await file.save();
  });

  it('reports even an undefined refresh rejection and recovers with another patch', async () => {
    vi.spyOn(MediaFile, 'open').mockRejectedValueOnce(undefined);
    expect((await file.applyPatch({ title: 'Committed' })).refresh).toEqual({ status: 'failed', error: undefined });
    await expect(file.save()).rejects.toThrow('stale after a patch');
    expect((await file.applyPatch({ album: 'Recovered' })).refresh.status).toBe('ok');
    expect(file.metadata.common).toMatchObject({ title: 'Committed', album: 'Recovered' });
    await file.save();
  });

  it('preserves the original read options and observer across patching and reloading', async () => {
    await updateFile(filePath, {
      picture: [{ format: 'image/png', data: png() }],
      chapters: [{ title: 'Chapter', start: 0, timeScale: 1 }]
    });
    const observer = vi.fn();
    const options = { skipCovers: true, includeChapters: true, observer };
    file = await MediaFile.open(filePath, options);
    options.skipCovers = false;
    options.includeChapters = false;
    for (const operation of [() => file.applyPatch({ title: 'Patched' }), () => file.reload()]) {
      observer.mockClear();
      await operation();
      expect(observer).toHaveBeenCalled();
      expect(file.metadata.common.picture).toBeUndefined();
      expect(file.metadata.format.chapters).toEqual([expect.objectContaining({ title: 'Chapter' })]);
    }
  });
});
