import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Token from 'token-types';
import { describe, expect, it, vi } from 'vitest';
import {
  type IChapter,
  InvalidFileError,
  InvalidPatchError,
  orderTags,
  parseBuffer,
  parseFile,
  UnsupportedFeatureError,
  updateBuffer,
  updateFile,
  WriteError
} from '../lib/index.js';
import { updateBuffer as updateBrowserBuffer } from '../lib/write/browser.js';
import * as sources from '../lib/write/core/source.js';
import { openSource } from '../lib/write/core/source.js';
import { buildMp4Update } from '../lib/write/mp4/mp4.js';
import { readTags } from './helpers/read.js';

const fixture = (name: string) => fs.readFile(fileURLToPath(new URL(`./samples/mp4/${name}.m4a`, import.meta.url)));
interface Atom {
  type: string;
  start: number;
  end: number;
  header: number;
}
function boxes(bytes: Uint8Array, start = 0, end = bytes.length): Atom[] {
  const result: Atom[] = [];
  while (start < end) {
    const raw = Token.UINT32_BE.get(bytes, start);
    const size = raw === 1 ? Number(Token.UINT64_BE.get(bytes, start + 8)) : raw || end - start;
    result.push({
      type: Buffer.from(bytes.subarray(start + 4, start + 8)).toString('latin1'),
      start,
      end: start + size,
      header: raw === 1 ? 16 : 8
    });
    start += size;
  }
  return result;
}
const atom = (type: string, body: Uint8Array) => {
  const result = Buffer.alloc(8 + body.length);
  result.writeUInt32BE(result.length);
  result.write(type, 4, 'latin1');
  result.set(body, 8);
  return result;
};
const mdat = (bytes: Uint8Array) => {
  const box = boxes(bytes).find(b => b.type === 'mdat')!;
  return bytes.subarray(box.start + box.header, box.end);
};
function offsets(bytes: Uint8Array, start = 0, end = bytes.length): number[] {
  return boxes(bytes, start, end).flatMap(b => {
    if (['moov', 'trak', 'mdia', 'minf', 'stbl'].includes(b.type)) {
      return offsets(bytes, b.start + b.header, b.end);
    }
    if (b.type !== 'stco' && b.type !== 'co64') {
      return [];
    }
    return Array.from({ length: Token.UINT32_BE.get(bytes, b.start + b.header + 4) }, (_, i) =>
      b.type === 'stco'
        ? Token.UINT32_BE.get(bytes, b.start + b.header + 8 + 4 * i)
        : Number(Token.UINT64_BE.get(bytes, b.start + b.header + 8 + 8 * i))
    );
  });
}

const chunkHeads = (bytes: Uint8Array) =>
  offsets(bytes).map(offset => Buffer.from(bytes.subarray(offset, offset + 16)));

describe('MP4 metadata', () => {
  for (const name of ['aac-faststart', 'alac']) {
    it(`round-trips ${name}, relocating offsets and preserving encoded samples`, async () => {
      const input = await fixture(name);
      const inputCopy = Buffer.from(input);
      const cover = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZkAAAAASUVORK5CYII=',
        'base64'
      );
      const output = await updateBuffer(input, {
        title: '标题 🎵',
        artist: 'Artist',
        albumartist: 'Album artist',
        album: 'Album',
        genre: ['Ambient', 'Electronic'],
        date: '2026-11-02',
        year: 2025,
        track: { no: 2, of: 12 },
        disk: { no: 1, of: 2 },
        bpm: 123,
        lyrics: [{ language: 'eng', text: 'Words' }],
        comment: [{ text: 'Notes' }],
        compilation: true,
        copyright: 'Copyright',
        composer: ['A', 'B'],
        isrc: ['USAAA2600001'],
        catalognumber: 'CAT-1',
        musicbrainz_albumid: 'release-id',
        replaygain_track_gain: { dB: -6, ratio: 0.5 },
        picture: [{ format: 'image/png', data: cover }],
        native: { '----:com.apple.iTunes:PRIVATE': 'Keep me' }
      });
      expect(input).toEqual(inputCopy);
      const tags = await readTags(output);
      expect(tags.format).toBe('mp4');
      expect(tags.common.title).toBe('标题 🎵');
      expect(tags.common.genre).toEqual(['Ambient', 'Electronic']);
      expect(tags.common.track).toEqual({ no: 2, of: 12 });
      expect(tags.common.disk).toEqual({ no: 1, of: 2 });
      expect(tags.common.year).toBe(2026);
      expect(tags.common.bpm).toBe(123);
      expect(tags.common.compilation).toBe(true);
      expect(tags.common.lyrics?.[0]?.text).toBe('Words');
      expect(tags.common.comment?.[0]?.text).toBe('Notes');
      expect(tags.common.isrc).toEqual(['USAAA2600001']);
      expect(tags.common.catalognumber).toEqual(['CAT-1']);
      expect(tags.common.musicbrainz_albumid).toBe('release-id');
      expect(tags.common.replaygain_track_gain?.dB).toBe(-6);
      expect(Buffer.from(tags.pictures[0]!.data)).toEqual(cover);
      expect(Buffer.from(mdat(output))).toEqual(Buffer.from(mdat(input)));
      expect(chunkHeads(output)).toEqual(chunkHeads(input));
      const oldOffsets = offsets(input);
      const newOffsets = offsets(output);
      const delta = output.length - input.length;
      expect(newOffsets).toEqual(oldOffsets.map(offset => offset + (name === 'aac-faststart' ? delta : 0)));
      const again = await updateBuffer(output, { title: 'Short', track: { no: 3 }, picture: null, genre: null });
      expect(chunkHeads(again)).toEqual(chunkHeads(input));
      const updated = await readTags(again);
      expect(updated.common.track).toEqual({ no: 3, of: 12 });
      expect(updated.pictures).toEqual([]);
      expect(updated.common.genre).toBeUndefined();
      expect(orderTags(updated.native.iTunes ?? [])['----:com.apple.iTunes:PRIVATE']?.[0]).toBe('Keep me');
      expect(Buffer.from(mdat(again))).toEqual(Buffer.from(mdat(input)));
    });
  }

  it('stores text lyrics, derives text from synchronized input, and clears consistently', async () => {
    const input = await fixture('alac');
    const text = await updateBuffer(input, {
      lyrics: { language: 'zho', descriptor: '原文', text: '第一行\n第二行' }
    });
    const textTags = await readTags(text);
    expect(textTags.common.lyrics?.map(lyrics => lyrics.text)).toEqual(['第一行\n第二行']);
    expect(textTags.common.lyrics?.[0]?.language).toBeUndefined();
    expect(textTags.common.lyrics?.[0]?.descriptor).toBeUndefined();

    const synchronized = await updateBuffer(input, {
      lyrics: {
        contentType: 1,
        timeStampFormat: 2,
        syncText: [
          { text: 'First', timestamp: 1250 },
          { text: 'Second', timestamp: 2000 }
        ]
      }
    });
    const synchronizedTags = await readTags(synchronized);
    expect(synchronizedTags.common.lyrics?.map(lyrics => lyrics.text)).toEqual(['First\nSecond']);
    expect(synchronizedTags.common.lyrics?.[0]?.syncText).toEqual([]);

    const combined = await updateBuffer(input, {
      lyrics: { text: 'Text wins', contentType: 1, timeStampFormat: 2, syncText: [{ text: 'Ignored', timestamp: 0 }] }
    });
    expect((await readTags(combined)).common.lyrics?.map(lyrics => lyrics.text)).toEqual(['Text wins']);

    for (const value of ['', [], null] as const) {
      const cleared = await updateBuffer(synchronized, { lyrics: value });
      expect((await readTags(cleared)).common.lyrics).toBeUndefined();
    }
  });

  it.each(['M4A ', 'M4B ', 'isom', 'iso2', 'iso6', 'mp41', 'mp42', 'zzzz'])(
    'uses the same read and write format for the %s major brand',
    async brand => {
      const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'editor-mp4-brand-'));
      try {
        const input = await fixture('aac-faststart');
        input.write(brand, 8, 'latin1');
        // Remove recognized compatible brands so normalization depends on detection.
        const ftyp = boxes(input)[0]!;
        input.fill(0, 16, ftyp.end);
        const file = path.join(dir, 'track.m4a');
        await fs.writeFile(file, input);
        expect((await readTags(input)).format).toBe('mp4');
        expect((await readTags(file)).format).toBe('mp4');
        expect((await updateFile(file, { title: 'Brand' })).format).toBe('mp4');
        expect((await readTags(file)).common.title).toBe('Brand');
      } finally {
        await fs.rm(dir, { recursive: true, force: true });
      }
    }
  );

  it('round-trips complete raw freeform bodies, preserves them and deletes them', async () => {
    const input = await fixture('alac');
    const key = '----:com.apple.iTunes:PRIVATE:DETAIL';
    const body = Buffer.concat([
      atom('mean', Buffer.concat([Buffer.alloc(4), Buffer.from('com.apple.iTunes')])),
      atom('name', Buffer.concat([Buffer.alloc(4), Buffer.from('PRIVATE:DETAIL')])),
      atom('data', Buffer.concat([Buffer.from([0, 0, 0, 1, 0, 0, 0, 0]), Buffer.from('Raw text')]))
    ]);
    const output = await updateBuffer(input, { native: { [key]: body } });
    expect((await readTags(output)).native.iTunes).toContainEqual({ id: key, value: 'Raw text' });
    expect(Buffer.from(output).includes(atom('----', body))).toBe(true);
    const preserved = await updateBuffer(output, { title: 'Other edit' });
    expect(Buffer.from(preserved).includes(atom('----', body))).toBe(true);
    const removed = await updateBuffer(preserved, { native: { [key]: null } });
    expect(Object.hasOwn(orderTags((await readTags(removed)).native.iTunes ?? []), key)).toBe(false);
    await expect(updateBuffer(input, { native: { [key]: new Uint8Array() } })).rejects.toBeInstanceOf(
      InvalidPatchError
    );
    await expect(updateBuffer(input, { native: { '----:other:NAME': body } })).rejects.toBeInstanceOf(
      InvalidPatchError
    );
    // Ordinary raw item bodies retain their existing encoding.
    const titleBody = atom('data', Buffer.concat([Buffer.from([0, 0, 0, 1, 0, 0, 0, 0]), Buffer.from('Raw title')]));
    const title = await updateBuffer(input, { native: { '©nam': titleBody } });
    expect((await readTags(title)).common.title).toBe('Raw title');
  });

  it.each([false, true])('bounds non-atomic media reads and preserves the input on staging failure: %s', async fail => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'editor-mp4-staging-'));
    const file = path.join(dir, 'track.m4a');
    const original = await fixture('aac-faststart');
    const input = Buffer.concat([original, Buffer.alloc(2 * 1024 * 1024 + 17, 0xa5)]);
    const media = boxes(original).find(box => box.type === 'mdat')!;
    input.writeUInt32BE(input.length - media.start, media.start);
    await fs.writeFile(file, input);
    const open = sources.openSource;
    let largeReads = 0;
    vi.spyOn(sources, 'openSource').mockImplementation(async value => {
      const source = await open(value);
      const read = source.read.bind(source);
      source.read = async (offset, length) => {
        expect(length).toBeLessThanOrEqual(1024 * 1024);
        if (length === 1024 * 1024 && ++largeReads === 2 && fail) {
          throw new Error('Staging failed');
        }
        return read(offset, length);
      };
      return source;
    });
    try {
      if (fail) {
        await expect(updateFile(file, { title: 'New' }, { atomic: false, backup: true })).rejects.toBeInstanceOf(
          WriteError
        );
        expect((await fs.readFile(file)).equals(input)).toBe(true);
        expect(await fs.readdir(dir)).toEqual(['track.m4a']);
      } else {
        const dry = await updateFile(file, { title: 'Dry' }, { atomic: false, dryRun: true, backup: true });
        expect(dry.atomic).toBe(false);
        expect((await fs.readFile(file)).equals(input)).toBe(true);
        expect(await fs.readdir(dir)).toEqual(['track.m4a']);
        const result = await updateFile(file, { title: 'A longer title' }, { atomic: false, backup: true });
        expect(result.atomic).toBe(false);
        const output = await fs.readFile(file);
        expect(result.bytesWritten).toBe(output.length);
        expect(Buffer.from(mdat(output)).equals(Buffer.from(mdat(input)))).toBe(true);
        expect(offsets(output)).toEqual(offsets(input).map(offset => offset + output.length - input.length));
        expect((await readTags(file)).common.title).toBe('A longer title');
        expect((await fs.readFile(`${file}.bak`)).equals(input)).toBe(true);
        await updateFile(file, { title: 'X' }, { atomic: false });
        expect((await readTags(file)).common.title).toBe('X');
        expect(Buffer.from(mdat(await fs.readFile(file))).equals(Buffer.from(mdat(input)))).toBe(true);
        expect((await fs.readdir(dir)).sort()).toEqual(['track.m4a', 'track.m4a.bak']);
      }
      expect(largeReads).toBeGreaterThanOrEqual(2);
    } finally {
      vi.restoreAllMocks();
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  // Behavioral references: node-taglib-sharp's M4A #701689 and extended-tag tests.
  // Use our generated fixtures and assert native identities as well as reader values.
  it.each(['aac-faststart', 'alac'])('keeps distinct MusicBrainz IDs in %s', async name => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'editor-mp4-musicbrainz-'));
    try {
      const file = path.join(dir, 'track.m4a');
      const input = await fixture(name);
      const recording = '883821fc-9bbc-4e04-be79-b4b12c4c4a4e';
      const releaseTrack = 'a046e3d1-650b-4b6f-9ace-e1b83c853528';
      await fs.writeFile(file, input);
      await updateFile(file, { musicbrainz_recordingid: recording, musicbrainz_trackid: releaseTrack });
      const tags = await readTags(file);
      expect(tags.common.musicbrainz_recordingid).toBe(recording);
      expect(tags.common.musicbrainz_trackid).toBe(releaseTrack);
      expect(tags.native.iTunes).toContainEqual({ id: '----:com.apple.iTunes:MusicBrainz Track Id', value: recording });
      expect(tags.native.iTunes).toContainEqual({
        id: '----:com.apple.iTunes:MusicBrainz Release Track Id',
        value: releaseTrack
      });
      // Changing a recording must leave the release-track identity intact.
      await updateFile(file, { musicbrainz_recordingid: releaseTrack, title: 'Other edit' });
      const changed = await readTags(file);
      expect(changed.common.musicbrainz_recordingid).toBe(releaseTrack);
      expect(changed.common.musicbrainz_trackid).toBe(releaseTrack);
      expect(
        changed.native.iTunes?.filter(tag => tag.id === '----:com.apple.iTunes:MusicBrainz Track Id')
      ).toHaveLength(1);
      await updateFile(file, { musicbrainz_recordingid: null });
      const removed = await readTags(file);
      expect(removed.common.musicbrainz_recordingid).toBeUndefined();
      expect(removed.common.musicbrainz_trackid).toBe(releaseTrack);
      const output = await fs.readFile(file);
      expect(Buffer.from(mdat(output))).toEqual(Buffer.from(mdat(input)));
      expect(offsets(output)).toEqual(
        offsets(input).map(offset => offset + (name === 'aac-faststart' ? output.length - input.length : 0))
      );
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it.each(['aac-faststart', 'alac'])('round-trips all ReplayGain fields in %s', async name => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'editor-mp4-replaygain-'));
    try {
      const file = path.join(dir, 'track.m4a');
      const input = await fixture(name);
      await fs.writeFile(file, input);
      await updateFile(file, {
        replaygain_track_gain: '-10.28 dB',
        replaygain_track_peak: '0.999969',
        replaygain_album_gain: '-9.98 dB',
        replaygain_album_peak: '0.999980'
      });
      // Reopen after an unrelated edit to check persistence of untouched items.
      await updateFile(file, { title: 'Preserve ReplayGain' });
      const tags = await readTags(file);
      expect(tags.common.replaygain_track_gain?.dB).toBeCloseTo(-10.28, 6);
      expect(tags.common.replaygain_track_peak?.ratio).toBeCloseTo(0.999969, 6);
      expect(tags.common.replaygain_album_gain?.dB).toBeCloseTo(-9.98, 6);
      expect(tags.common.replaygain_album_peak?.ratio).toBeCloseTo(0.99998, 6);
      for (const [field, value] of Object.entries({
        replaygain_track_gain: '-10.28 dB',
        replaygain_track_peak: '0.999969',
        replaygain_album_gain: '-9.98 dB',
        replaygain_album_peak: '0.999980'
      })) {
        expect(tags.native.iTunes?.filter(tag => tag.id === `----:com.apple.iTunes:${field}`)).toEqual([
          { id: `----:com.apple.iTunes:${field}`, value }
        ]);
      }
      await updateFile(file, { replaygain_track_gain: null, replaygain_album_peak: null });
      const removed = await readTags(file);
      expect(removed.common.replaygain_track_gain).toBeUndefined();
      expect(removed.common.replaygain_album_peak).toBeUndefined();
      expect(removed.common.replaygain_track_peak?.ratio).toBeCloseTo(0.999969, 6);
      expect(removed.common.replaygain_album_gain?.dB).toBeCloseTo(-9.98, 6);
      const output = await fs.readFile(file);
      expect(Buffer.from(mdat(output))).toEqual(Buffer.from(mdat(input)));
      expect(offsets(output)).toEqual(
        offsets(input).map(offset => offset + (name === 'aac-faststart' ? output.length - input.length : 0))
      );
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('supports atomic file writes, backup and dry-run', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'editor-mp4-'));
    try {
      const file = path.join(dir, 'track.m4a');
      const input = await fixture('aac-faststart');
      await fs.writeFile(file, input);
      const dry = await updateFile(file, { title: 'Dry run' }, { dryRun: true });
      expect(dry.format).toBe('mp4');
      expect(await fs.readFile(file)).toEqual(input);
      const result = await updateFile(file, { title: 'File title' }, { backup: true });
      expect(result.format).toBe('mp4');
      expect(result.atomic).toBe(true);
      expect((await readTags(file)).common.title).toBe('File title');
      expect(await fs.readFile(`${file}.bak`)).toEqual(input);
      expect((await fs.readdir(dir)).sort()).toEqual(['track.m4a', 'track.m4a.bak']);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects fragmented MP4 before changing a file', async () => {
    const input = await fixture('aac-faststart');
    const output = Buffer.concat([input, atom('moof', new Uint8Array())]);
    await expect(updateBuffer(output, { title: 'Unsafe' })).rejects.toBeInstanceOf(UnsupportedFeatureError);
    await expect(updateBuffer(input, { title: 'Unsafe' }, { replaceId3: true })).rejects.toBeInstanceOf(
      UnsupportedFeatureError
    );
  });

  it('rejects malformed top-level atom sizes', async () => {
    const input = await fixture('aac-faststart');
    const movie = boxes(input).find(b => b.type === 'moov')!;
    input.writeUInt32BE(7, movie.start);
    await expect(updateBuffer(input, { title: 'Bad' })).rejects.toBeInstanceOf(InvalidFileError);
  });
});

describe('MP4 structure variants', () => {
  const rewrite = (bytes: Uint8Array, transform: (box: Atom, body: Uint8Array) => Uint8Array | null): Buffer =>
    Buffer.concat(
      boxes(bytes).flatMap(box => {
        let body = bytes.subarray(box.start + box.header, box.end);
        if (['moov', 'trak', 'mdia', 'minf', 'stbl', 'dinf', 'udta'].includes(box.type)) {
          body = rewrite(body, transform);
        }
        const replacement = transform(box, body);
        return replacement === null ? [] : [atom(box.type, replacement)];
      })
    );

  // Independent behavioral counterparts to Mutagen's MP4 duplicate/binary/bad-item cases.
  const mapItems = (input: Uint8Array, transform: (items: Uint8Array) => Uint8Array) =>
    rewrite(input, (box, body) =>
      box.type !== 'meta'
        ? body
        : Buffer.concat([
            body.subarray(0, 4),
            ...boxes(body, 4).map(child =>
              child.type === 'ilst'
                ? atom('ilst', transform(body.subarray(child.start + child.header, child.end)))
                : body.subarray(child.start, child.end)
            )
          ])
    );
  const textData = (text: string) =>
    atom('data', Buffer.concat([Buffer.from([0, 0, 0, 1, 0, 0, 0, 0]), Buffer.from(text)]));
  const freeformBody = (name: string, ...data: Uint8Array[]) =>
    Buffer.concat([
      atom('mean', Buffer.concat([Buffer.alloc(4), Buffer.from('com.apple.iTunes')])),
      atom('name', Buffer.concat([Buffer.alloc(4), Buffer.from(name)])),
      ...data
    ]);

  describe('Nero chapters', () => {
    const chapterFixture = (name = 'chapters-leading') =>
      fs.readFile(fileURLToPath(new URL(`./samples/mp4/${name}.m4b`, import.meta.url)));
    const movieChildren = (bytes: Uint8Array) => {
      const movie = boxes(bytes).find(box => box.type === 'moov')!;
      return boxes(bytes, movie.start + movie.header, movie.end);
    };
    const chapterLists = (bytes: Uint8Array) =>
      movieChildren(bytes)
        .filter(box => box.type === 'udta')
        .flatMap(box => boxes(bytes, box.start + box.header, box.end).filter(child => child.type === 'chpl'));
    const tracks = (bytes: Uint8Array) => movieChildren(bytes).filter(box => box.type === 'trak');
    const chapterRefs = (bytes: Uint8Array) =>
      tracks(bytes).flatMap(track =>
        boxes(bytes, track.start + track.header, track.end)
          .filter(box => box.type === 'tref')
          .flatMap(box => boxes(bytes, box.start + box.header, box.end).filter(child => child.type === 'chap'))
      );
    const readChapters = async (bytes: Uint8Array) =>
      (await parseBuffer(bytes, 'audio/mp4', { includeChapters: true })).format.chapters;
    const replacement: readonly IChapter[] = Object.freeze([
      Object.freeze({ title: '序章 🎵', start: 0, end: 3000, timeScale: 1000 }),
      Object.freeze({ title: '', start: 3, end: 7 }),
      Object.freeze({ title: 'Finale', start: 70_000_000, timeScale: 10_000_000 })
    ]);
    const expected = [
      { title: '序章 🎵', start: 0, timeScale: 10_000_000 },
      { title: '', start: 30_000_000, timeScale: 10_000_000 },
      { title: 'Finale', start: 70_000_000, timeScale: 10_000_000 }
    ];
    // These transformations affect moov only. Keep the playable fixture's media
    // references valid when its leading moov grows or shrinks.
    const alter = (input: Uint8Array, transform: Parameters<typeof rewrite>[1]) => {
      const modified = rewrite(input, transform);
      const movie = boxes(input).find(box => box.type === 'moov')!;
      const media = boxes(input).find(box => box.type === 'mdat')!;
      const delta = movie.end <= media.start ? modified.length - input.length : 0;
      return rewrite(modified, (box, body) => {
        if (box.type === 'stco') {
          const updated = Buffer.from(body);
          for (let p = 8; p < updated.length; p += 4) {
            updated.writeUInt32BE(updated.readUInt32BE(p) + delta, p);
          }
          return updated;
        }
        return body;
      });
    };

    it.each(['chapters-leading', 'chapters-nero'])('preserves omitted chapters while editing %s tags', async name => {
      const input = await chapterFixture(name);
      const output = await updateBuffer(input, { title: 'Unrelated', chapters: undefined });
      expect(await readChapters(output)).toEqual(await readChapters(input));
      expect(chapterRefs(output)).toHaveLength(chapterRefs(input).length);
      expect(chapterLists(output)).toHaveLength(chapterLists(input).length);
      expect(chunkHeads(output)).toEqual(chunkHeads(input));
      expect(Buffer.from(mdat(output))).toEqual(Buffer.from(mdat(input)));
    });

    it.each(['chapters-leading', 'chapters-nero'])(
      'replaces %s chapters and preserves media and ownership',
      async name => {
        const input = await chapterFixture(name);
        const copy = Buffer.from(input);
        const output = await updateBuffer(input, { chapters: replacement, title: 'Edited' });
        expect(input).toEqual(copy);
        expect(await readChapters(output)).toEqual(expected);
        expect((await readTags(output)).common.title).toBe('Edited');
        expect(chapterLists(output)).toHaveLength(1);
        expect(chapterRefs(output)).toHaveLength(0);
        expect(tracks(output)).toHaveLength(1);
        expect(chunkHeads(output)).toEqual(chunkHeads(input).slice(0, offsets(output).length));
        expect(Buffer.from(mdat(output))).toEqual(Buffer.from(mdat(input)));
        const again = await updateBuffer(output, { chapters: [{ title: 'Only', start: 0 }] });
        expect(await readChapters(again)).toEqual([{ title: 'Only', start: 0, timeScale: 10_000_000 }]);
        expect(chapterLists(again)).toHaveLength(1);
        expect(Buffer.from(mdat(again))).toEqual(Buffer.from(mdat(input)));
      }
    );

    for (const name of ['chapters-leading', 'chapters-nero']) {
      it.each([{ chapters: null }, { chapters: [] }] as const)(
        `removes ${name} chapters with %j`,
        async ({ chapters }) => {
          const input = await chapterFixture(name);
          const output = await updateBuffer(input, { chapters });
          expect(await readChapters(output)).toBeUndefined();
          expect(chapterLists(output)).toHaveLength(0);
          expect(chapterRefs(output)).toHaveLength(0);
          expect(tracks(output)).toHaveLength(1);
          expect(chunkHeads(output)).toEqual(chunkHeads(input).slice(0, offsets(output).length));
          expect(Buffer.from(mdat(output))).toEqual(Buffer.from(mdat(input)));
        }
      );
    }

    it.each(['existing', 'without meta', 'without udta', 'root meta', 'multiple udta'])(
      'inserts one list into %s metadata',
      async shape => {
        let input: Buffer = await chapterFixture('chapters-nero');
        if (shape === 'without meta' || shape === 'without udta') {
          input = alter(input, (box, body) =>
            box.type === (shape === 'without meta' ? 'meta' : 'udta') ? null : body
          );
        } else if (shape === 'root meta') {
          const udta = movieChildren(input).find(box => box.type === 'udta')!;
          const meta = boxes(input, udta.start + udta.header, udta.end).find(box => box.type === 'meta')!;
          const raw = input.subarray(meta.start, meta.end);
          input = alter(input, (box, body) =>
            box.type === 'udta' ? null : box.type === 'moov' ? Buffer.concat([body, raw]) : body
          );
        } else if (shape === 'multiple udta') {
          const old = atom('chpl', Buffer.from([0, 0, 0, 0, 0]));
          input = alter(input, (box, body) =>
            box.type === 'moov' ? Buffer.concat([body, atom('udta', old), atom('udta', old)]) : body
          );
        }
        const output = await updateBuffer(input, { chapters: replacement, title: 'Created' });
        expect(await readChapters(output)).toEqual(expected);
        expect(chapterLists(output)).toHaveLength(1);
        expect((await readTags(output)).common.title).toBe('Created');
        expect(Buffer.from(mdat(output))).toEqual(Buffer.from(mdat(input)));
        expect(chunkHeads(output)).toEqual(chunkHeads(input));
      }
    );

    it.each(['bytes', 'blob'])('supports browser %s updates from a borrowed view', async kind => {
      const input = await chapterFixture('chapters-nero');
      const backing = Buffer.concat([Buffer.alloc(17, 0xa5), input, Buffer.alloc(19, 0x5a)]);
      const copy = Buffer.from(backing);
      const view = backing.subarray(17, 17 + input.length);
      const output = await updateBrowserBuffer(kind === 'bytes' ? view : new Blob([view]), { chapters: replacement });
      expect(backing).toEqual(copy);
      expect(await readChapters(output)).toEqual(expected);
      expect(Buffer.from(mdat(output))).toEqual(Buffer.from(mdat(input)));
    });

    it('supports file backup, dry-run and rejection without side effects', async () => {
      const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mp4-chapters-'));
      try {
        const input = await chapterFixture();
        const file = path.join(dir, 'book.m4b');
        await fs.writeFile(file, input);
        const dry = await updateFile(file, { chapters: replacement }, { dryRun: true, backup: true });
        expect(await fs.readFile(file)).toEqual(input);
        expect(await fs.readdir(dir)).toEqual(['book.m4b']);
        await expect(
          updateFile(file, { chapters: [{ title: 'Bad', start: -1 }] }, { backup: true })
        ).rejects.toBeInstanceOf(InvalidPatchError);
        expect(await fs.readFile(file)).toEqual(input);
        expect(await fs.readdir(dir)).toEqual(['book.m4b']);
        const written = await updateFile(file, { chapters: replacement }, { backup: true });
        expect(written.bytesWritten).toBe(dry.bytesWritten);
        expect((await parseFile(file, { includeChapters: true })).format.chapters).toEqual(expected);
        expect(await fs.readFile(`${file}.bak`)).toEqual(input);
      } finally {
        await fs.rm(dir, { recursive: true, force: true });
      }
    });

    it('accepts exactly 255 chapters and 255 UTF-8 title bytes', async () => {
      const input = await chapterFixture('chapters-nero');
      const title = '界'.repeat(85);
      const chapters = Array.from({ length: 255 }, (_, i) => ({ title, start: i / 100 }));
      const output = await updateBuffer(input, { chapters });
      expect(await readChapters(output)).toEqual(
        chapters.map(chapter => ({ ...chapter, start: Math.round(chapter.start * 10_000_000), timeScale: 10_000_000 }))
      );
      expect(chapterLists(output)).toHaveLength(1);
    });

    it('round-trips reader chapter units and accepts matching explicit ends', async () => {
      const input = await chapterFixture();
      const metadata = await parseBuffer(input, 'audio/mp4', { includeChapters: true });
      const chapters = metadata.format.chapters!.map((chapter, i, all) => ({
        ...chapter,
        end: all[i + 1]?.start ?? metadata.format.containerDuration! * chapter.timeScale!
      }));
      const output = await updateBuffer(input, { chapters });
      expect(await readChapters(output)).toEqual([
        { title: 'Opening Credits', start: 0, timeScale: 10_000_000 },
        { title: 'Chapter 1', start: 30_000_000, timeScale: 10_000_000 },
        { title: 'Chapter 2', start: 70_000_000, timeScale: 10_000_000 }
      ]);
    });

    const wideHeader = (type: string, body: Uint8Array) => {
      const wide = Buffer.alloc(body.length + 12);
      wide.set(body.subarray(0, 4));
      wide[0] = 1;
      wide.writeBigUInt64BE(BigInt(Token.UINT32_BE.get(body, 4)), 4);
      wide.writeBigUInt64BE(BigInt(Token.UINT32_BE.get(body, 8)), 12);
      if (type === 'mvhd') {
        wide.set(body.subarray(12, 16), 20);
        wide.writeBigUInt64BE(BigInt(Token.UINT32_BE.get(body, 16)), 24);
        wide.set(body.subarray(20), 32);
      } else {
        wide.set(body.subarray(12, 20), 20);
        wide.writeBigUInt64BE(BigInt(Token.UINT32_BE.get(body, 20)), 28);
        wide.set(body.subarray(24), 36);
      }
      return wide;
    };

    it.each(['text', 'sbtl'])('retires %s chapter tracks with version-1 movie and track headers', async handler => {
      const input = alter(await chapterFixture(), (box, body) => {
        if (box.type === 'mvhd' || box.type === 'tkhd') {
          return wideHeader(box.type, body);
        }
        if (box.type === 'hdlr' && Buffer.from(body.subarray(8, 12)).toString('latin1') === 'text') {
          const changed = Buffer.from(body);
          changed.write(handler, 8, 'latin1');
          return changed;
        }
        return body;
      });
      const output = await updateBuffer(input, { chapters: replacement });
      expect(await readChapters(output)).toEqual(expected);
      expect(tracks(output)).toHaveLength(1);
      expect(chapterRefs(output)).toHaveLength(0);
      expect(Buffer.from(mdat(output))).toEqual(Buffer.from(mdat(input)));
      expect(chunkHeads(output)).toEqual(chunkHeads(input).slice(0, offsets(output).length));
    });

    it.each([
      { version: 0, handler: 'text', flags: 1 },
      { version: 0, handler: 'sbtl', flags: 3 },
      { version: 1, handler: 'text', flags: 5 },
      { version: 1, handler: 'sbtl', flags: 7 }
    ])('preserves enabled $handler tracks with v$version tkhd flags $flags', async ({ version, handler, flags }) => {
      const input = alter(await chapterFixture(), (box, body) => {
        if (box.type === 'tkhd' && Token.UINT32_BE.get(body, 12) === 2) {
          const header = version === 1 ? wideHeader(box.type, body) : Buffer.from(body);
          header.writeUIntBE(flags, 1, 3);
          return header;
        }
        if (box.type === 'hdlr' && Buffer.from(body.subarray(8, 12)).toString('latin1') === 'text') {
          const changed = Buffer.from(body);
          changed.write(handler, 8, 'latin1');
          return changed;
        }
        return body;
      });
      const copy = Buffer.from(input);
      for (const chapters of [replacement, null, []]) {
        await expect(updateBuffer(input, { chapters })).rejects.toBeInstanceOf(UnsupportedFeatureError);
        expect(input).toEqual(copy);
      }
      const output = await updateBuffer(input, { title: 'Unrelated' });
      expect(tracks(output)).toHaveLength(2);
      expect(chapterRefs(output)).toHaveLength(1);
      expect(Buffer.from(mdat(output))).toEqual(Buffer.from(mdat(input)));
      const track = tracks(output)[1];
      const header = boxes(output, track.start + track.header, track.end).find(box => box.type === 'tkhd')!;
      expect(Buffer.from(output).readUIntBE(header.start + header.header + 1, 3)).toBe(flags);
    });

    it('preserves exact Nero ticks near the safe-integer limit', async () => {
      const input = alter(await chapterFixture('chapters-nero'), (box, body) => {
        if (box.type !== 'mvhd') {
          return body;
        }
        const wide = wideHeader(box.type, body);
        wide.writeUInt32BE(10_000_000, 20);
        wide.writeBigUInt64BE(BigInt(Number.MAX_SAFE_INTEGER), 24);
        return wide;
      });
      const chapters = [{ title: 'Exact', start: Number.MAX_SAFE_INTEGER - 1, timeScale: 10_000_000 }];
      const output = await updateBuffer(input, { chapters });
      expect(await readChapters(output)).toEqual(chapters);
    });

    it('plans chapter edits without reading media or taking ownership of a borrowed source', async () => {
      const input = await chapterFixture();
      const before = Buffer.from(input);
      const movie = boxes(input).find(box => box.type === 'moov')!;
      const backing = await openSource(input);
      const source: sources.ByteSource = {
        size: input.length,
        tokenizer: backing.tokenizer,
        read: vi.fn(async (offset, length) => {
          if (length > 16 && (offset !== movie.start || length !== movie.end - movie.start)) {
            throw new Error('Unexpected media payload read');
          }
          return input.subarray(offset, offset + length);
        }),
        close: vi.fn(async () => {
          // A borrowed source remains owned by the caller.
        })
      };
      try {
        const position = backing.tokenizer.position;
        const plan = await buildMp4Update(source, { chapters: replacement }, {});
        expect(source.close).not.toHaveBeenCalled();
        expect(backing.tokenizer.position).toBe(position);
        expect(input).toEqual(before);
        const output = Buffer.concat(
          plan.chunks.map(chunk =>
            chunk instanceof Uint8Array ? chunk : input.subarray(chunk.offset, chunk.offset + chunk.length)
          )
        );
        expect(await readChapters(output)).toEqual(expected);
        for (const chunk of plan.chunks) {
          if (!(chunk instanceof Uint8Array)) {
            expect(chunk.source).toBe(source);
          }
        }
        expect(Buffer.from(mdat(output))).toEqual(Buffer.from(mdat(input)));
        await expect(buildMp4Update(source, { chapters: [{ title: '', start: -1 }] }, {})).rejects.toBeInstanceOf(
          InvalidPatchError
        );
        expect(source.close).not.toHaveBeenCalled();
        expect(input).toEqual(before);
      } finally {
        await backing.close();
      }
    });

    it('bounds chapter-reference traversal before rebuilding the movie', async () => {
      const input = alter(await chapterFixture(), (box, body) => {
        if (box.type !== 'tref') {
          return body;
        }
        const targets = Buffer.alloc(4 * 100_000);
        for (let p = 0; p < targets.length; p += 4) {
          targets.writeUInt32BE(2, p);
        }
        return atom('chap', targets);
      });
      const copy = Buffer.from(input);
      await expect(updateBuffer(input, { chapters: null })).rejects.toThrow(
        'MP4 chapter reference count exceeds limit'
      );
      expect(input).toEqual(copy);
    });

    it.each([
      ['non-array', { length: 0 }],
      ['too many chapters', Array.from({ length: 256 }, () => ({ title: '', start: 0 }))],
      ['sparse array', new Array(1)],
      ['null entry', [null]],
      ['primitive entry', [1]],
      ['array entry', [[]]],
      ['missing start', [{ title: '' }]],
      ['negative start', [{ title: '', start: -1 }]],
      ['non-finite start', [{ title: '', start: Number.POSITIVE_INFINITY }]],
      ['unsafe start', [{ title: '', start: Number.MAX_SAFE_INTEGER }]],
      ['zero timescale', [{ title: '', start: 0, timeScale: 0 }]],
      ['fractional timescale', [{ title: '', start: 0, timeScale: 0.5 }]],
      ['unsafe timescale', [{ title: '', start: 0, timeScale: Number.MAX_SAFE_INTEGER + 1 }]],
      [
        'duplicate starts',
        [
          { title: 'A', start: 0 },
          { title: 'B', start: 0 }
        ]
      ],
      [
        'descending starts',
        [
          { title: 'A', start: 2 },
          { title: 'B', start: 1 }
        ]
      ],
      [
        'rounded duplicate starts',
        [
          { title: 'A', start: 0 },
          { title: 'B', start: 0.00000001 }
        ]
      ],
      ['past duration', [{ title: '', start: 11 }]],
      ['at duration', [{ title: '', start: 10.008 }]],
      ['missing title', [{ start: 0 }]],
      ['non-string title', [{ title: 1, start: 0 }]],
      ['long ASCII title', [{ title: 'a'.repeat(256), start: 0 }]],
      ['long UTF-8 title', [{ title: '界'.repeat(86), start: 0 }]],
      ['invalid end', [{ title: '', start: 0, end: -1 }]]
    ])('rejects %s patches as InvalidPatchError', async (_name, chapters) => {
      const input = await chapterFixture('chapters-nero');
      const copy = Buffer.from(input);
      await expect(updateBuffer(input, { chapters: chapters as readonly IChapter[] })).rejects.toBeInstanceOf(
        InvalidPatchError
      );
      expect(input).toEqual(copy);
    });

    it.each([
      { title: '', start: 0, url: { url: 'https://example.com', description: '' } },
      { title: '', start: 0, image: { format: 'image/png', data: new Uint8Array() } },
      { title: '', start: 0, end: 0 },
      { title: '', start: 0, end: 5 }
    ])('rejects unrepresentable chapter fields: %j', async chapter => {
      await expect(updateBuffer(await chapterFixture(), { chapters: [chapter] })).rejects.toBeInstanceOf(
        UnsupportedFeatureError
      );
    });

    it('retains non-chapter references but refuses shared chapter targets', async () => {
      const original = await chapterFixture();
      const reference = Buffer.alloc(4);
      reference.writeUInt32BE(1);
      const other = atom('hint', reference);
      const independent = alter(original, (box, body) =>
        box.type === 'trak' && !boxes(body).some(child => child.type === 'tref')
          ? Buffer.concat([body, atom('tref', other)])
          : body
      );
      const output = await updateBuffer(independent, { chapters: replacement });
      expect(await readChapters(output)).toEqual(expected);
      reference.writeUInt32BE(2);
      const shared = alter(original, (box, body) =>
        box.type === 'trak' && boxes(body).some(child => child.type === 'tref')
          ? Buffer.concat([body, atom('tref', atom('hint', reference))])
          : body
      );
      const copy = Buffer.from(shared);
      await expect(updateBuffer(shared, { chapters: null })).rejects.toBeInstanceOf(UnsupportedFeatureError);
      expect(shared).toEqual(copy);
      const retained = alter(original, (box, body) => (box.type === 'tref' ? Buffer.concat([body, other]) : body));
      const cleared = await updateBuffer(retained, { chapters: null });
      expect(Buffer.from(cleared).includes(other)).toBe(true);
      expect(chapterRefs(cleared)).toHaveLength(0);
      expect(Buffer.from(mdat(cleared))).toEqual(Buffer.from(mdat(retained)));
    });

    it.each(['soun', 'vide'])('refuses to delete a %s track referenced as a chapter', async handler => {
      const input = await chapterFixture();
      const at = input.indexOf(Buffer.from('text'), input.indexOf(Buffer.from('hdlr')) + 4);
      input.write(handler, at);
      await expect(updateBuffer(input, { chapters: null })).rejects.toBeInstanceOf(UnsupportedFeatureError);
    });

    it.each([
      { version: 0, length: 16 },
      { version: 0, length: 37 },
      { version: 1, length: 24 },
      { version: 1, length: 49 }
    ])('rejects v$version tkhd payloads of $length bytes', async ({ version, length }) => {
      const input = alter(await chapterFixture(), (box, body) =>
        box.type === 'tkhd' ? (version === 1 ? wideHeader(box.type, body) : body).subarray(0, length) : body
      );
      const copy = Buffer.from(input);
      for (const chapters of [replacement, null, []]) {
        await expect(updateBuffer(input, { chapters })).rejects.toBeInstanceOf(InvalidFileError);
        expect(input).toEqual(copy);
      }
    });

    it.each([
      { version: 0, length: 38 },
      { version: 1, length: 50 }
    ])('accepts v$version tkhd payloads at the $length-byte reader boundary', async ({ version, length }) => {
      const input = alter(await chapterFixture(), (box, body) =>
        box.type === 'tkhd' ? (version === 1 ? wideHeader(box.type, body) : body).subarray(0, length) : body
      );
      expect(await readChapters(input)).toHaveLength(3);
      const output = await updateBuffer(input, { chapters: replacement });
      expect(await readChapters(output)).toEqual(expected);
      expect(tracks(output)).toHaveLength(1);
      expect(Buffer.from(mdat(output))).toEqual(Buffer.from(mdat(input)));
    });

    it.each([
      { version: 0, length: 20 },
      { version: 0, length: 99 },
      { version: 1, length: 32 },
      { version: 1, length: 100 },
      { version: 1, length: 111 }
    ])('rejects v$version mvhd payloads of $length bytes', async ({ version, length }) => {
      const input = alter(await chapterFixture('chapters-nero'), (box, body) =>
        box.type === 'mvhd' ? (version === 1 ? wideHeader(box.type, body) : body).subarray(0, length) : body
      );
      const copy = Buffer.from(input);
      await expect(updateBuffer(input, { chapters: replacement })).rejects.toBeInstanceOf(InvalidFileError);
      expect(input).toEqual(copy);
    });

    it.each([
      { version: 0, length: 100 },
      { version: 1, length: 112 }
    ])('accepts v$version mvhd payloads at the $length-byte reader boundary', async ({ version, length }) => {
      const input = alter(await chapterFixture('chapters-nero'), (box, body) =>
        box.type === 'mvhd' ? (version === 1 ? wideHeader(box.type, body) : body).subarray(0, length) : body
      );
      expect(await readChapters(input)).toHaveLength(3);
      const output = await updateBuffer(input, { chapters: replacement });
      expect(await readChapters(output)).toEqual(expected);
      expect(Buffer.from(mdat(output))).toEqual(Buffer.from(mdat(input)));
    });

    it.each([
      'missing tkhd',
      'duplicate tkhd',
      'zero ID',
      'duplicate ID',
      'bad tkhd version',
      'truncated tkhd',
      'missing target',
      'bad reference length',
      'missing handler',
      'truncated handler',
      'duplicate handler',
      'duplicate media'
    ])('rejects malformed chapter structure: %s', async kind => {
      let input: Buffer = await chapterFixture();
      if (kind === 'duplicate tkhd') {
        input = alter(input, (box, body) =>
          box.type === 'trak' ? Buffer.concat([body, body.subarray(0, boxes(body)[0]!.end)]) : body
        );
      } else if (kind === 'duplicate handler' || kind === 'duplicate media') {
        input = alter(input, (box, body) => {
          const target = kind === 'duplicate media' ? 'trak' : 'mdia';
          const childType = kind === 'duplicate media' ? 'mdia' : 'hdlr';
          if (box.type !== target) {
            return body;
          }
          const child = boxes(body).find(c => c.type === childType)!;
          return Buffer.concat([body, body.subarray(child.start, child.end)]);
        });
      } else if (kind === 'truncated tkhd' || kind === 'truncated handler' || kind === 'bad reference length') {
        const type = kind === 'truncated tkhd' ? 'tkhd' : kind === 'truncated handler' ? 'mdia' : 'tref';
        input = alter(input, (box, body) => {
          if (box.type !== type) {
            return body;
          }
          if (type === 'tkhd') {
            return body.subarray(0, 15);
          }
          if (type === 'tref') {
            return atom('chap', Buffer.alloc(3));
          }
          return Buffer.concat(
            boxes(body).map(child =>
              child.type === 'hdlr' ? atom('hdlr', Buffer.alloc(11)) : body.subarray(child.start, child.end)
            )
          );
        });
      } else {
        const header = input.indexOf(Buffer.from('tkhd'));
        const secondHeader = input.indexOf(Buffer.from('tkhd'), header + 4);
        if (kind === 'missing tkhd') {
          input.write('free', header);
        }
        if (kind === 'zero ID') {
          input.writeUInt32BE(0, header + 16);
        }
        if (kind === 'duplicate ID') {
          input.writeUInt32BE(1, secondHeader + 16);
        }
        if (kind === 'bad tkhd version') {
          input[header + 4] = 2;
        }
        if (kind === 'missing target') {
          input.writeUInt32BE(99, input.indexOf(Buffer.from('chap')) + 4);
        }
        if (kind === 'missing handler') {
          input.write('free', input.indexOf(Buffer.from('hdlr'), secondHeader));
        }
      }
      await expect(updateBuffer(input, { chapters: null })).rejects.toBeInstanceOf(InvalidFileError);
    });

    it.each([
      'missing',
      'duplicate',
      'bad version',
      'truncated',
      'zero timescale',
      'unknown duration',
      'unsafe duration',
      'unsafe ticks'
    ])('rejects a %s movie header when writing chapters', async kind => {
      let input: Buffer = await chapterFixture('chapters-nero');
      if (kind === 'duplicate') {
        input = alter(input, (box, body) => {
          if (box.type !== 'moov') {
            return body;
          }
          const header = boxes(body).find(c => c.type === 'mvhd')!;
          return Buffer.concat([body, body.subarray(header.start, header.end)]);
        });
      } else if (kind === 'truncated' || kind === 'unsafe duration' || kind === 'unsafe ticks') {
        input = alter(input, (box, body) => {
          if (box.type !== 'mvhd') {
            return body;
          }
          if (kind === 'truncated') {
            return body.subarray(0, 19);
          }
          const wide = wideHeader(box.type, body);
          wide.writeUInt32BE(1000, 20);
          wide.writeBigUInt64BE(
            kind === 'unsafe duration' ? BigInt(Number.MAX_SAFE_INTEGER) + 1n : 1_000_000_000_000n,
            24
          );
          return wide;
        });
      } else {
        const at = input.indexOf(Buffer.from('mvhd'));
        if (kind === 'missing') {
          input.write('free', at);
        }
        if (kind === 'bad version') {
          input[at + 4] = 2;
        }
        if (kind === 'zero timescale') {
          input.writeUInt32BE(0, at + 16);
        }
        if (kind === 'unknown duration') {
          input.writeUInt32BE(0xffffffff, at + 20);
        }
      }
      await expect(updateBuffer(input, { chapters: [{ title: '', start: 0 }] })).rejects.toBeInstanceOf(
        ['unknown duration', 'unsafe duration', 'unsafe ticks'].includes(kind)
          ? UnsupportedFeatureError
          : InvalidFileError
      );
      // Removal does not need a duration header.
      const cleared = await updateBuffer(input, { chapters: [] });
      expect(chapterLists(cleared)).toHaveLength(0);
    });
  });

  it.each(['text', 'freeform'])('preserves duplicate %s items and replaces or deletes every occurrence', async kind => {
    const key = kind === 'text' ? '©grp' : '----:com.apple.iTunes:DUPLICATE';
    const encode = (value: string) =>
      kind === 'text' ? atom('©grp', textData(value)) : atom('----', freeformBody('DUPLICATE', textData(value)));
    const duplicates = Buffer.concat([encode('First value'), encode('Second value')]);
    const input = mapItems(await fixture('alac'), items => Buffer.concat([items, duplicates]));
    const preserved = await updateBuffer(input, { title: 'Unrelated edit' });
    expect(Buffer.from(preserved).includes(duplicates)).toBe(true);
    expect((await readTags(preserved)).native.iTunes?.filter(tag => tag.id === key).map(tag => tag.value)).toEqual([
      'First value',
      'Second value'
    ]);
    const replaced = await updateBuffer(preserved, { native: { [key]: ['Replacement A', 'Replacement B'] } });
    expect((await readTags(replaced)).native.iTunes?.filter(tag => tag.id === key).map(tag => tag.value)).toEqual([
      'Replacement A',
      'Replacement B'
    ]);
    expect(Buffer.from(replaced).includes(duplicates)).toBe(false);
    const removed = await updateBuffer(preserved, { native: { [key]: null } });
    expect(Object.hasOwn(orderTags((await readTags(removed)).native.iTunes ?? []), key)).toBe(false);
    for (const output of [preserved, replaced, removed]) {
      expect(Buffer.from(mdat(output))).toEqual(Buffer.from(mdat(input)));
      expect(chunkHeads(output)).toEqual(chunkHeads(input));
    }
  });

  it('preserves binary freeform data types, versions and locales across unrelated edits', async () => {
    const body = freeformBody(
      'BINARY',
      atom('data', Buffer.from([0, 0, 0, 0, 0, 0, 0, 7, 0, 255, 128, 1])),
      atom('data', Buffer.from([42, 0, 0, 142, 0, 0, 0, 9, 254, 0, 129, 2]))
    );
    const item = atom('----', body);
    const input = mapItems(await fixture('alac'), items => Buffer.concat([items, item]));
    const preserved = await updateBuffer(input, { album: 'Keep opaque data' });
    expect(Buffer.from(preserved).includes(item)).toBe(true);
    const copied = await updateBuffer(await fixture('alac'), {
      native: { '----:com.apple.iTunes:BINARY': body }
    });
    expect(Buffer.from(copied).includes(item)).toBe(true);
    const removed = await updateBuffer(preserved, { native: { '----:com.apple.iTunes:BINARY': null } });
    expect(Buffer.from(removed).includes(item)).toBe(false);
    expect(Buffer.from(mdat(preserved))).toEqual(Buffer.from(mdat(input)));
  });

  it.each(['aART', 'zzzz'])('preserves an unreadable %s item until explicitly replaced or deleted', async key => {
    // The outer item is well framed; its internal payload is intentionally undecodable.
    const opaque = atom(key, atom('datA', Buffer.from([255, 0, 128, 1, 2])));
    const input = mapItems(await fixture('alac'), items => Buffer.concat([items, opaque]));
    const preserved = await updateBuffer(input, { title: 'Unrelated edit' });
    expect(Buffer.from(preserved).includes(opaque)).toBe(true);
    const replaced = await updateBuffer(preserved, { native: { [key]: 'Readable replacement' } });
    expect(Buffer.from(replaced).includes(opaque)).toBe(false);
    expect(Buffer.from(replaced).includes(atom(key, textData('Readable replacement')))).toBe(true);
    const removed = await updateBuffer(preserved, { native: { [key]: null } });
    expect(Buffer.from(removed).includes(opaque)).toBe(false);
    for (const output of [preserved, replaced, removed]) {
      expect(Buffer.from(mdat(output))).toEqual(Buffer.from(mdat(input)));
    }
  });

  it('retains explicit false flags and zero numeric values until null deletion', async () => {
    const initial = await updateBuffer(await fixture('alac'), {
      compilation: true,
      gapless: true,
      bpm: 140,
      track: { no: 3, of: 8 },
      disk: { no: 2, of: 4 }
    });
    const output = await updateBuffer(initial, {
      compilation: false,
      gapless: false,
      bpm: 0,
      track: { no: 0 },
      disk: { of: 0 }
    });
    const tags = await readTags(output);
    expect(tags.common.compilation).toBe(false);
    expect(tags.common.gapless).toBe(false);
    expect(tags.common.bpm).toBe(0);
    // music-metadata normalizes zero pair components to null in common tags.
    expect(tags.common.track).toEqual({ no: null, of: 8 });
    expect(tags.common.disk).toEqual({ no: 2, of: null });
    expect(tags.native.iTunes).toContainEqual({ id: 'trkn', value: '0/8' });
    expect(tags.native.iTunes).toContainEqual({ id: 'disk', value: '2/0' });
    for (const id of ['cpil', 'pgap', 'tmpo']) {
      expect(tags.native.iTunes?.filter(tag => tag.id === id)).toEqual([{ id, value: 0 }]);
    }
    const removed = await updateBuffer(output, { compilation: null, gapless: null, bpm: null });
    expect((await readTags(removed)).native.iTunes?.filter(tag => ['cpil', 'pgap', 'tmpo'].includes(tag.id))).toEqual(
      []
    );
    expect(Buffer.from(mdat(output))).toEqual(Buffer.from(mdat(initial)));
  });

  it('round-trips mixed JPEG and PNG artwork and preserves it across text edits', async () => {
    const input = await fixture('aac-faststart');
    // Payload signatures are enough here: this tests tag encoding, not image decoding.
    const jpeg = Uint8Array.of(255, 216, 255, 217);
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZkAAAAASUVORK5CYII=',
      'base64'
    );
    const tagged = await updateBuffer(input, {
      picture: [
        { format: 'image/jpeg', data: jpeg },
        { format: 'image/png', data: png }
      ]
    });
    const preserved = await updateBuffer(tagged, { title: 'Keep both pictures' });
    const pictures = (await readTags(preserved)).pictures;
    expect(pictures.map(picture => picture.format)).toEqual(['image/jpeg', 'image/png']);
    expect(pictures.map(picture => Buffer.from(picture.data))).toEqual([Buffer.from(jpeg), png]);
    const replaced = await updateBuffer(preserved, { picture: [{ format: 'image/png', data: png }] });
    expect((await readTags(replaced)).pictures.map(picture => Buffer.from(picture.data))).toEqual([png]);
    const removed = await updateBuffer(replaced, { picture: null });
    expect((await readTags(removed)).pictures).toEqual([]);
    for (const output of [preserved, replaced, removed]) {
      expect(Buffer.from(mdat(output))).toEqual(Buffer.from(mdat(input)));
      expect(chunkHeads(output)).toEqual(chunkHeads(input));
    }
  });

  it('rebuilds nested extended-size metadata parents through growth and shrinkage', async () => {
    const parents = new Set(['moov', 'udta', 'meta', 'ilst']);
    const widen = (bytes: Uint8Array): Buffer =>
      Buffer.concat(
        boxes(bytes).map(box => {
          let body = bytes.subarray(box.start + box.header, box.end);
          if (!parents.has(box.type)) {
            return bytes.subarray(box.start, box.end);
          }
          if (box.type === 'meta') {
            body = Buffer.concat([body.subarray(0, 4), widen(body.subarray(4))]);
          } else if (box.type !== 'ilst') {
            body = widen(body);
          }
          const header = Buffer.alloc(16);
          header.writeUInt32BE(1);
          header.write(box.type, 4, 'latin1');
          header.writeBigUInt64BE(BigInt(body.length + 16), 8);
          return Buffer.concat([header, body]);
        })
      );
    const input = widen(await fixture('alac'));
    const grown = await updateBuffer(input, { title: 'Extended metadata '.repeat(40), gapless: true });
    const shrunk = await updateBuffer(grown, { title: 'Small', gapless: null });
    expect(grown.length).toBeGreaterThan(input.length);
    expect(shrunk.length).toBeLessThan(grown.length);
    expect((await readTags(shrunk)).common.title).toBe('Small');
    for (const output of [grown, shrunk]) {
      const movie = boxes(output).find(box => box.type === 'moov')!;
      expect(movie.end).toBe(output.length);
      const udta = boxes(output, movie.start + movie.header, movie.end).find(box => box.type === 'udta')!;
      const meta = boxes(output, udta.start + udta.header, udta.end).find(box => box.type === 'meta')!;
      const list = boxes(output, meta.start + meta.header + 4, meta.end).find(box => box.type === 'ilst')!;
      expect(boxes(output, list.start + list.header, list.end).map(box => box.type)).toContain('©nam');
      expect(Buffer.from(mdat(output))).toEqual(Buffer.from(mdat(input)));
      expect(chunkHeads(output)).toEqual(chunkHeads(input));
    }
  });

  // Recreate the multiple-udta shape of node-taglib-sharp's #658920 fixture.
  it('preserves an empty name in a separate udta while editing the metadata container', async () => {
    const opaque = atom('udta', atom('name', Buffer.alloc(4)));
    const input = rewrite(await fixture('alac'), (box, body) =>
      box.type === 'moov' ? Buffer.concat([opaque, body]) : body
    );
    const output = await updateBuffer(input, { title: 'Edited across multiple udta containers' });
    expect((await readTags(output)).common.title).toBe('Edited across multiple udta containers');
    const movie = boxes(output).find(box => box.type === 'moov')!;
    const userData = boxes(output, movie.start + movie.header, movie.end).filter(box => box.type === 'udta');
    expect(userData).toHaveLength(2);
    expect(Buffer.from(output.subarray(userData[0]!.start, userData[0]!.end))).toEqual(opaque);
    const metadata = boxes(output, userData[1]!.start + userData[1]!.header, userData[1]!.end);
    expect(metadata.filter(box => box.type === 'meta')).toHaveLength(1);
    expect(Buffer.from(mdat(output))).toEqual(Buffer.from(mdat(input)));
    expect(offsets(output)).toEqual(offsets(input));
  });

  // #676934 declares an ~800 MB atom in a small file. Never allocate its claimed size.
  it.each(['top-level', 'nested'])('rejects oversized %s atoms before writing', async location => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'editor-mp4-oversized-'));
    try {
      const file = path.join(dir, 'bad.m4a');
      const input = await fixture('alac');
      const movie = boxes(input).find(box => box.type === 'moov')!;
      const target =
        location === 'top-level'
          ? movie
          : boxes(input, movie.start + movie.header, movie.end).find(box => box.type === 'trak')!;
      input.writeUInt32BE(800 * 1024 * 1024, target.start);
      await fs.writeFile(file, input);
      const source = await openSource(file);
      try {
        const read = vi.spyOn(source, 'read');
        await expect(buildMp4Update(source, { title: 'No' }, {})).rejects.toBeInstanceOf(InvalidFileError);
        expect(read.mock.calls.length).toBeGreaterThan(0);
        expect(read.mock.calls.every(([, length]) => length <= input.length)).toBe(true);
      } finally {
        await source.close();
      }
      await expect(updateFile(file, { title: 'No' }, { backup: true })).rejects.toBeInstanceOf(InvalidFileError);
      expect(await fs.readFile(file)).toEqual(input);
      expect(await fs.readdir(dir)).toEqual(['bad.m4a']);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('creates metadata without duplicating an existing udta container', async () => {
    const input = rewrite(await fixture('alac'), (box, body) => (box.type === 'meta' ? null : body));
    const result = await updateBuffer(input, { title: 'Created' });
    expect((await readTags(result)).common.title).toBe('Created');
    const movie = boxes(result).find(b => b.type === 'moov')!;
    expect(boxes(result, movie.start + movie.header, movie.end).filter(b => b.type === 'udta')).toHaveLength(1);
    expect(Buffer.from(mdat(result))).toEqual(Buffer.from(mdat(input)));
  });

  it('creates missing udta, preserves size-to-end children and repeated artists', async () => {
    const input = rewrite(await fixture('alac'), (box, body) => (box.type === 'udta' ? null : body));
    // The terminal moov uses a size-to-end header.
    const movie = boxes(input).find(b => b.type === 'moov')!;
    input.writeUInt32BE(0, movie.start);
    const result = await updateBuffer(input, { artists: ['One', 'Two'], totaltracks: '9' });
    const common = (await readTags(result)).common;
    expect(common.artists).toEqual(['One', 'Two']);
    expect(common.track.of).toBe(9);
    expect(Buffer.from(mdat(result))).toEqual(Buffer.from(mdat(input)));
  });

  it('preserves a size-to-end opaque child when appending a metadata container', async () => {
    const input = rewrite(await fixture('alac'), (box, body) => (box.type === 'udta' ? null : body));
    const movie = boxes(input).find(b => b.type === 'moov')!;
    const tail = atom('zzzz', Uint8Array.of(1, 2, 3));
    tail.writeUInt32BE(0);
    const modified = Buffer.concat([
      input.subarray(0, movie.start),
      atom('moov', Buffer.concat([input.subarray(movie.start + 8), tail]))
    ]);
    const result = await updateBuffer(modified, { title: 'Created' });
    expect((await readTags(result)).common.title).toBe('Created');
    const moov = boxes(result).find(b => b.type === 'moov')!;
    expect(boxes(result, moov.start + moov.header, moov.end).map(b => b.type)).toContain('zzzz');
  });

  it('handles co64 tables and extended movie sizes', async () => {
    const input = rewrite(await fixture('alac'), (box, body) => {
      if (box.type !== 'stco') {
        return body;
      }
      const count = Token.UINT32_BE.get(body, 4);
      const wide = Buffer.alloc(8 + 8 * count);
      body.subarray(0, 8).forEach((v, i) => {
        wide[i] = v;
      });
      for (let i = 0; i < count; i++) {
        wide.writeBigUInt64BE(BigInt(Token.UINT32_BE.get(body, 8 + i * 4)), 8 + i * 8);
      }
      return wide;
    });
    // Rename the changed table and give the trailing moov an extended header.
    const stco = input.indexOf(Buffer.from('stco'));
    input.write('co64', stco);
    const movie = boxes(input).find(b => b.type === 'moov')!;
    const h = Buffer.alloc(16);
    h.writeUInt32BE(1);
    h.write('moov', 4);
    h.writeBigUInt64BE(BigInt(movie.end - movie.start + 8), 8);
    const extended = Buffer.concat([input.subarray(0, movie.start), h, input.subarray(movie.start + 8)]);
    const result = await updateBuffer(extended, { title: 'Wide' });
    expect(offsets(result)).toEqual(offsets(input));
    expect((await readTags(result)).common.title).toBe('Wide');
    expect(Buffer.from(mdat(result))).toEqual(Buffer.from(mdat(input)));
  });

  it('rejects external data references, unsupported metadata handlers and malformed nested sizes', async () => {
    const original = await fixture('alac');
    const external = Buffer.from(original);
    const url = external.indexOf(Buffer.from('url '));
    external.writeUInt32BE(0, url + 4);
    await expect(updateBuffer(external, { title: 'No' })).rejects.toBeInstanceOf(UnsupportedFeatureError);
    const mdta = Buffer.from(original);
    const handler = mdta.indexOf(Buffer.from('mdir'));
    mdta.write('mdta', handler);
    await expect(updateBuffer(mdta, { title: 'No' })).rejects.toBeInstanceOf(UnsupportedFeatureError);
    const truncated = Buffer.from(original);
    const table = truncated.indexOf(Buffer.from('stco'));
    truncated.writeUInt32BE(1000, table + 8);
    await expect(updateBuffer(truncated, { title: 'No' })).rejects.toBeInstanceOf(InvalidFileError);
  });

  it('promotes overflowing stco entries to co64 without reading a multi-gigabyte media payload', async () => {
    const input = await fixture('aac-faststart');
    const top = boxes(input);
    const ftyp = top.find(b => b.type === 'ftyp')!;
    const movie = top.find(b => b.type === 'moov')!;
    const moov = Buffer.from(input.subarray(movie.start, movie.end));
    const table = moov.indexOf(Buffer.from('stco'));
    const count = moov.readUInt32BE(table + 8);
    for (let i = 0; i < count; i++) {
      moov.writeUInt32BE(0xfffffff0, table + 12 + 4 * i);
    }
    const size = 0x100000100;
    const mdatHeader = Buffer.alloc(16);
    mdatHeader.writeUInt32BE(1);
    mdatHeader.write('mdat', 4);
    mdatHeader.writeBigUInt64BE(BigInt(size - (ftyp.end - ftyp.start) - moov.length), 8);
    const prefix = Buffer.concat([input.subarray(ftyp.start, ftyp.end), moov, mdatHeader]);
    const backing = await openSource(prefix);
    try {
      const source = {
        tokenizer: backing.tokenizer,
        size,
        read: async (offset: number, length: number) => {
          if (offset + length > prefix.length) {
            throw new Error('Unexpected media payload read');
          }
          return prefix.subarray(offset, offset + length);
        },
        close: async () => {
          /* The borrowed source remains owned by the caller. */
        }
      };
      const update = await buildMp4Update(source, { title: 'Growing metadata '.repeat(100) }, {});
      const result = update.chunks.find((chunk): chunk is Uint8Array => chunk instanceof Uint8Array)!;
      expect(Buffer.from(result).includes(Buffer.from('co64'))).toBe(true);
      expect(offsets(result)).toEqual(new Array(count).fill(0xfffffff0 + result.length - moov.length));
    } finally {
      await backing.close();
    }
  });

  it('rejects duplicate movies, unsupported structures and missing chunk tables', async () => {
    const input = await fixture('alac');
    const movie = boxes(input).find(b => b.type === 'moov')!;
    const duplicate = Buffer.concat([input, input.subarray(movie.start, movie.end)]);
    await expect(updateBuffer(duplicate, { title: 'No' })).rejects.toBeInstanceOf(InvalidFileError);
    for (const type of ['mvex', 'cmov', 'saio']) {
      const modified = rewrite(input, (box, body) =>
        box.type === 'moov' ? Buffer.concat([body, atom(type, new Uint8Array())]) : body
      );
      await expect(updateBuffer(modified, { title: 'No' })).rejects.toBeInstanceOf(UnsupportedFeatureError);
    }
    const missing = rewrite(input, (box, body) => (box.type === 'stco' ? null : body));
    await expect(updateBuffer(missing, { title: 'No' })).rejects.toBeInstanceOf(UnsupportedFeatureError);
    await expect(updateBuffer(input, { title: 'No' }, { padding: 100 })).rejects.toBeInstanceOf(
      UnsupportedFeatureError
    );
  });

  it('handles size-to-end media and clears complete number pairs and numeric fields', async () => {
    const input = await fixture('aac-faststart');
    const media = boxes(input).find(b => b.type === 'mdat')!;
    input.writeUInt32BE(0, media.start);
    const first = await updateBuffer(input, {
      track: { no: 2, of: 10 },
      disk: { no: 1, of: 2 },
      bpm: 120,
      gapless: true
    });
    const output = await updateBuffer(first, { track: null, disk: null, bpm: null, gapless: null });
    const tags = await readTags(output);
    expect(tags.common.track).toEqual({ no: null, of: null });
    expect(tags.common.disk).toEqual({ no: null, of: null });
    expect(tags.common.bpm).toBeUndefined();
    expect(tags.common.gapless).toBeUndefined();
    expect(Buffer.from(mdat(output))).toEqual(Buffer.from(mdat(input)));
  });

  it('replaces freeform names without case sensitivity and applies native overrides last', async () => {
    const input = await updateBuffer(await fixture('alac'), {
      native: { '----:com.apple.iTunes:REPLAYGAIN_TRACK_GAIN': '-10 dB' }
    });
    const output = await updateBuffer(input, {
      replaygain_track_gain: '-6 dB',
      native: { '----:com.apple.iTunes:ReplayGain_Track_Gain': '-3 dB' }
    });
    const tags = await readTags(output);
    expect(tags.common.replaygain_track_gain?.dB).toBe(-3);
    expect(tags.native.iTunes?.filter(tag => tag.id.toLowerCase().endsWith(':replaygain_track_gain'))).toHaveLength(1);
  });

  it('rejects unsafe file rewrites without changing the original or creating a backup', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'editor-mp4-rejected-'));
    try {
      const file = path.join(dir, 'bad.m4a');
      const input = Buffer.concat([await fixture('aac-faststart'), atom('moof', new Uint8Array())]);
      await fs.writeFile(file, input);
      await expect(updateFile(file, { title: 'No' }, { backup: true })).rejects.toBeInstanceOf(UnsupportedFeatureError);
      expect(await fs.readFile(file)).toEqual(input);
      expect(await fs.readdir(dir)).toEqual(['bad.m4a']);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('supports native deletion and rejects unsupported values without touching input', async () => {
    const original = await fixture('alac');
    const copy = Buffer.from(original);
    await expect(
      updateBuffer(original, { picture: [{ format: 'image/webp', data: new Uint8Array() }] })
    ).rejects.toBeInstanceOf(UnsupportedFeatureError);
    await expect(updateBuffer(original, { bpm: -1 })).rejects.toThrow();
    await expect(updateBuffer(original, { track: { no: 65536 } })).rejects.toThrow();
    await expect(updateBuffer(original, { native: { 'bad-key': 'value' } })).rejects.toThrow();
    const result = await updateBuffer(original, {
      native: { '©nam': null, '----:com.apple.iTunes:PRIVATE': ['A', 'B'] }
    });
    expect((await readTags(result)).common.title).toBeUndefined();
    expect(original).toEqual(copy);
  });
});
