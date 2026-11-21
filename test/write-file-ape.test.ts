import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseBuffer } from '../lib/core.js';
import {
  InvalidFileError,
  InvalidPatchError,
  UnsupportedFeatureError,
  updateBuffer,
  updateFile
} from '../lib/index.js';
import type { TagPatch, WriteOptions } from '../lib/write/core/types.js';
import { samplePath } from './helpers/util.js';

describe('APEv2 writing', () => {
  const fixtures = [
    ['ape', 'monkeysaudio-date.ape'],
    ['wv', 'wavpack/unknown-count-multichannel.wv'],
    ['mpc', 'mpc/apev2-no-header.sv7.mpc'],
    ['mpc', 'mpc/bach-goldberg-variatians-05.sv8.mpc']
  ] as const;
  let ape: Buffer;
  let covers: Buffer;
  beforeAll(async () => {
    ape = await readFile(path.join(samplePath, 'monkeysaudio-date.ape'));
    covers = await readFile(path.join(samplePath, 'monkeysaudio.ape'));
  });

  function layout(bytes: Uint8Array) {
    const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const end = buffer.subarray(-128, -125).toString() === 'TAG' ? buffer.length - 128 : buffer.length;
    const footer = buffer.subarray(end - 32, end);
    if (footer.subarray(0, 8).toString() !== 'APETAGEX') {
      return { start: end, end, items: new Map<string, Buffer>() };
    }
    const size = footer.readUInt32LE(12);
    let offset = end - size;
    const start = offset - (footer.readUInt32LE(20) & 0x80000000 ? 32 : 0);
    const items = new Map<string, Buffer>();
    for (let index = 0; index < footer.readUInt32LE(16); index++) {
      const itemStart = offset;
      const length = buffer.readUInt32LE(offset);
      const keyEnd = buffer.indexOf(0, offset + 8);
      const key = buffer.subarray(offset + 8, keyEnd).toString();
      offset = keyEnd + 1 + length;
      items.set(key.toUpperCase(), buffer.subarray(itemStart, offset));
    }
    return { start, end, items };
  }

  function itemValue(item: Buffer): Buffer {
    return item.subarray(item.indexOf(0, 8) + 1);
  }

  function mutateEnvelopes(bytes: Uint8Array, offset: number, value: number): Buffer {
    const result = Buffer.from(bytes);
    const tag = layout(result);
    result.writeUInt32LE(value >>> 0, tag.start + offset);
    result.writeUInt32LE(value >>> 0, tag.end - 32 + offset);
    return result;
  }

  for (const [format, fixture] of fixtures) {
    it(`updates ${fixture} with a shared APEv2 plan and identical audio bytes`, async () => {
      const original = await readFile(path.join(samplePath, fixture));
      const snapshot = Buffer.from(original);
      const before = await parseBuffer(original);
      const updated = await updateBuffer(original, {
        title: '日本語 🎵',
        artists: ['Artist A', 'Artist B'],
        albumartist: 'Album artist',
        album: 'New album',
        date: '2026-11-13',
        track: { no: 2, of: 12 },
        disk: { no: 1, of: 2 },
        comment: [{ text: 'first comment' }, { text: 'second comment' }],
        genre: ['Rock', 'Jazz'],
        composer: ['Composer'],
        lyrics: {
          syncText: [
            { text: 'line one', timestamp: 0 },
            { text: 'line two', timestamp: 2000 }
          ]
        },
        compilation: true,
        bpm: 120,
        musicbrainz_recordingid: 'recording-id',
        replaygain_track_gain: { dB: -6, ratio: 0.5 },
        replaygain_album_gain: '-3 dB',
        replaygain_album_peak: '0.9',
        replaygain_track_minmax: [100, 200],
        replaygain_album_minmax: [50, 250],
        replaygain_undo: { leftChannel: 2, rightChannel: -2 },
        native: { 'Editor Note': ['één', 'two'], Binary: new Uint8Array([0, 1, 2]) }
      });
      const after = await parseBuffer(updated);
      const oldTag = layout(original);
      const newTag = layout(updated);
      expect(updated.subarray(0, newTag.start)).toEqual(new Uint8Array(original.subarray(0, oldTag.start)));
      expect(original).toEqual(snapshot);
      expect(after.format.duration).toBe(before.format.duration);
      expect(after.format.codec).toBe(before.format.codec);
      expect(after.common).toMatchObject({
        title: '日本語 🎵',
        artists: ['Artist A', 'Artist B'],
        albumartist: 'Album artist',
        album: 'New album',
        date: '2026-11-13',
        track: { no: 2, of: 12 },
        disk: { no: 1, of: 2 },
        comment: [{ text: 'first comment' }, { text: 'second comment' }],
        genre: ['Rock', 'Jazz'],
        composer: ['Composer'],
        compilation: true,
        bpm: 120,
        musicbrainz_recordingid: 'recording-id',
        replaygain_track_gain: { dB: -6 },
        replaygain_album_gain: { dB: -3 },
        replaygain_album_peak: { ratio: 0.9 },
        replaygain_track_minmax: [100, 200],
        replaygain_album_minmax: [50, 250],
        replaygain_undo: { leftChannel: 2, rightChannel: -2 }
      });
      expect(after.common.lyrics?.[0]?.text).toBe('line one\nline two');
      expect(after.native.APEv2?.filter(tag => tag.id === 'Comment')).toHaveLength(2);
      expect(after.native.APEv2).toContainEqual({ id: 'Editor Note', value: 'één' });
      // Header/footer share the size (excluding the header), count and reserved bytes.
      const buffer = Buffer.from(updated);
      expect(buffer.readUInt32LE(newTag.start + 8)).toBe(2000);
      expect(buffer.readUInt32LE(newTag.start + 12)).toBe(newTag.end - newTag.start - 32);
      expect(buffer.readUInt32LE(newTag.end - 12)).toBe(0x80000000);
      expect(format).toMatch(/ape|wv|mpc/);
      for (const [key, item] of oldTag.items) {
        if (
          ![
            'TITLE',
            'ARTIST',
            'ARTISTS',
            'ALBUM ARTIST',
            'ALBUM',
            'DATE',
            'YEAR',
            'TRACK',
            'DISC',
            'DISCNUMBER',
            'COMMENT',
            'GENRE',
            'COMPOSER',
            'LYRICS',
            'COMPILATION',
            'BPM',
            'MUSICBRAINZ_TRACKID',
            'REPLAYGAIN_TRACK_GAIN',
            'REPLAYGAIN_ALBUM_GAIN',
            'REPLAYGAIN_ALBUM_PEAK',
            'MP3GAIN_MINMAX',
            'MP3GAIN_ALBUM_MINMAX',
            'MP3GAIN_UNDO'
          ].includes(key)
        ) {
          expect(newTag.items.has(key)).toBe(true);
          expect(newTag.items.get(key)).toEqual(item);
        }
      }
    });

    it(`preserves no-op bytes and creates/removes tags in ${fixture}`, async () => {
      const original = await readFile(path.join(samplePath, fixture));
      expect(await updateBuffer(original, {})).toEqual(new Uint8Array(original));
      const audio = original.subarray(0, layout(original).start);
      expect(await updateBuffer(audio, { native: null, track: {}, picture: null })).toEqual(new Uint8Array(audio));
      const updated = await updateBuffer(audio, { title: 'Created' });
      expect((await parseBuffer(updated)).common.title).toBe('Created');
      expect(await updateBuffer(updated, { title: null })).toEqual(new Uint8Array(audio));
    });
  }

  it('reuses reader aliases, merges number pairs and applies native overrides last', async () => {
    const original = await updateBuffer(ape, {
      native: { Date: null, Year: '2001', Disc: null, DISCNUMBER: '2/4', Track: '3/9' }
    });
    const updated = await updateBuffer(original, {
      year: 2026,
      track: { no: null },
      disk: { of: 6 },
      totaltracks: '12',
      native: { Title: 'Native wins' },
      title: 'Common'
    });
    const tag = layout(updated);
    expect(tag.items.has('YEAR')).toBe(false);
    expect(tag.items.has('DISCNUMBER')).toBe(false);
    expect(itemValue(tag.items.get('DISC')!).toString()).toBe('2/6');
    expect(itemValue(tag.items.get('TRACK')!).toString()).toBe('/12');
    const after = await parseBuffer(updated);
    expect(after.common).toMatchObject({
      title: 'Native wins',
      date: '2026',
      track: { no: null, of: 12 },
      disk: { no: 2, of: 6 }
    });
    const cleared = await updateBuffer(updated, { track: { of: null }, disk: null, native: { Title: [] } });
    expect(layout(cleared).items.has('TRACK')).toBe(false);
    expect(layout(cleared).items.has('DISC')).toBe(false);
    expect(layout(cleared).items.has('TITLE')).toBe(false);
  });

  it('removes text and lyrics values without touching unrelated native data', async () => {
    const input = await updateBuffer(ape, {
      title: 'old',
      comment: 'comment',
      lyrics: 'lyrics',
      native: { Unknown: 'keep' }
    });
    const cleared = await updateBuffer(input, { title: [], comment: null, lyrics: '' });
    const tag = layout(cleared);
    for (const key of ['TITLE', 'COMMENT', 'LYRICS']) {
      expect(tag.items.has(key)).toBe(false);
    }
    expect(itemValue(tag.items.get('UNKNOWN')!).toString()).toBe('keep');
    expect(await updateBuffer(cleared, { native: { Unknown: undefined } } as unknown as TagPatch)).toEqual(cleared);
  });

  it('checks the final aggregate byte budget before encoding patched values', async () => {
    const max = 64 * 1024 * 1024;
    const audio = ape.subarray(0, layout(ape).start);
    // 64 envelope bytes + 8-byte item header + 2-byte key + NUL.
    const input = new Uint8Array(max - 75);
    const updated = await updateBuffer(audio, { native: { XX: input } });
    expect(layout(updated).end - layout(updated).start).toBe(max);
    const unchanged = await updateBuffer(updated, {});
    expect(Buffer.from(unchanged).equals(Buffer.from(updated))).toBe(true);
    await expect(updateBuffer(audio, { native: { XX: input, YY: 'one byte over budget' } })).rejects.toThrow('64 MiB');
    await expect(updateBuffer(audio, { native: { XXX: input } })).rejects.toThrow('64 MiB');
    // Budget follows the final patch, not the order of replacement/deletion.
    const replaced = await updateBuffer(updated, { native: { YY: input, XX: null } });
    expect(layout(replaced).items.has('XX')).toBe(false);
    expect(layout(replaced).items.get('YY')?.length).toBe(input.length + 11);
  });

  it('bounds declared allocation and entry counts before reading tag payloads', async () => {
    const oversized = mutateEnvelopes(ape, 12, 64 * 1024 * 1024);
    await expect(updateBuffer(oversized, {})).rejects.toThrow('64 MiB');
    const count = 100001;
    const excessiveItems = mutateEnvelopes(ape, 12, 32 + 11 * count);
    excessiveItems.writeUInt32LE(count, layout(ape).end - 32 + 16);
    excessiveItems.writeUInt32LE(count, layout(ape).start + 16);
    await expect(updateBuffer(excessiveItems, {})).rejects.toThrow('100000 items');
  });

  it('accepts exactly 100000 items and rejects one more output item', async () => {
    const audio = ape.subarray(0, layout(ape).start);
    const native = Object.fromEntries(Array.from({ length: 100000 }, (_, i) => [`Field ${i}`, '']));
    const updated = await updateBuffer(audio, { native });
    expect(layout(updated).items.size).toBe(100000);
    const unchanged = await updateBuffer(updated, {});
    expect(Buffer.from(unchanged).equals(Buffer.from(updated))).toBe(true);
    await expect(updateBuffer(updated, { native: { Extra: '' } })).rejects.toThrow('100000 items');
    const replaced = await updateBuffer(updated, { native: { Extra: '', 'Field 0': null } });
    expect(layout(replaced).items.size).toBe(100000);
  });

  it('rejects a header-only tag at the declared Monkey’s Audio end', async () => {
    const tag = layout(ape);
    const input = Buffer.from(ape.subarray(0, tag.end - 32));
    input.writeUInt32LE(0xe0000000, tag.start + 20);
    await expect(updateBuffer(input, { title: 'Update' })).rejects.toThrow('footer-delimited');
  });

  it('preserves untouched cover and unknown item bytes; writes owned front/back pictures', async () => {
    const before = await parseBuffer(covers);
    const originalTag = layout(covers);
    const textUpdate = await updateBuffer(covers, { title: 'Text edit' });
    for (const key of ['COVER ART (FRONT)', 'COVER ART (BACK)', 'ENSEMBLE']) {
      expect(layout(textUpdate).items.get(key)).toEqual(originalTag.items.get(key));
    }
    const pictures = before.common.picture!.map((picture, index) => ({ ...picture, description: `${index}.jpg` }));
    expect(pictures.map(picture => picture.type)).toEqual(['Cover (front)', 'Cover (back)']);
    const snapshot = pictures[0].data.slice();
    const updated = await updateBuffer(covers, { picture: pictures });
    const after = await parseBuffer(updated);
    expect(after.common.picture).toEqual(pictures);
    expect(pictures[0].data).toEqual(snapshot);
    const deleted = await updateBuffer(updated, { picture: [] });
    expect((await parseBuffer(deleted)).common.picture).toBeUndefined();
    // Default front role, filename takes precedence over description.
    const front = await updateBuffer(ape, { picture: [{ format: 'image/jpeg', data: snapshot, name: 'front.jpg' }] });
    expect((await parseBuffer(front)).common.picture?.[0]).toMatchObject({
      type: 'Cover (front)',
      description: 'front.jpg'
    });
  });

  it('preserves binary, external, reserved and read-only native items byte-for-byte', async () => {
    let input = Buffer.from(
      await updateBuffer(ape, {
        native: {
          Binary: new Uint8Array([0, 4, 5]),
          External: 'https://example.invalid',
          Reserved: 'private',
          Locked: 'unchanged'
        }
      })
    );
    const tag = layout(input);
    for (const [key, flags] of [
      ['EXTERNAL', 4],
      ['RESERVED', 6],
      ['LOCKED', 1]
    ] as const) {
      input.writeUInt32LE(flags, tag.items.get(key)!.byteOffset - input.byteOffset + 4);
    }
    input = Buffer.from(input);
    const updated = await updateBuffer(input, { title: 'Update' });
    for (const key of ['BINARY', 'EXTERNAL', 'RESERVED', 'LOCKED']) {
      expect(layout(updated).items.get(key)).toEqual(layout(input).items.get(key));
    }
    await expect(updateBuffer(input, { native: { locked: null } })).rejects.toThrow('read-only');
    await expect(updateBuffer(input, { native: { Locked: 'replace' } })).rejects.toThrow(UnsupportedFeatureError);
  });

  it('respects read-only tag and cover flags while allowing untouched tags', async () => {
    const lockedTag = mutateEnvelopes(ape, 20, 0x80000001);
    // Header must additionally carry the header marker.
    lockedTag.writeUInt32LE(0xa0000001, layout(lockedTag).start + 20);
    expect(await updateBuffer(lockedTag, {})).toEqual(new Uint8Array(lockedTag));
    await expect(updateBuffer(lockedTag, { title: 'Update' })).rejects.toThrow('read-only APEv2 tag');
    const lockedCover = Buffer.from(covers);
    const item = layout(lockedCover).items.get('COVER ART (BACK)')!;
    lockedCover.writeUInt32LE(3, item.byteOffset - lockedCover.byteOffset + 4);
    await expect(updateBuffer(lockedCover, { picture: null })).rejects.toThrow('read-only APEv2 item');
  });

  it('preserves a trailing ID3v1 tag on creation, replacement and deletion', async () => {
    const id3v1 = Buffer.alloc(128);
    id3v1.write('TAGLegacy title');
    const input = Buffer.concat([ape, id3v1]);
    const updated = await updateBuffer(input, { title: 'APEv2 title' });
    expect(updated.subarray(-128)).toEqual(new Uint8Array(id3v1));
    expect((await parseBuffer(updated)).common.title).toBe('APEv2 title');
    const removed = await updateBuffer(updated, { title: null, date: null });
    expect(removed).toEqual(new Uint8Array(Buffer.concat([ape.subarray(0, layout(ape).start), id3v1])));
  });

  const invalidPatches: [string, TagPatch, typeof InvalidPatchError | typeof UnsupportedFeatureError][] = [
    ['unmapped common field', { rating: [] }, UnsupportedFeatureError],
    ['reserved native key', { native: { ID3: 'bad' } }, InvalidPatchError],
    ['short native key', { native: { X: 'bad' } }, InvalidPatchError],
    ['non-ASCII native key', { native: { Éditeur: 'bad' } }, InvalidPatchError],
    ['long native key', { native: { ['X'.repeat(256)]: 'bad' } }, InvalidPatchError],
    ['NUL key', { native: { 'bad\0key': 'bad' } }, InvalidPatchError],
    ['case-insensitive duplicate patch keys', { native: { Title: 'one', TITLE: 'two' } }, InvalidPatchError],
    ['structured native object', { native: { Custom: { text: 'bad' } } }, InvalidPatchError],
    ['NUL text', { title: 'one\0two' }, InvalidPatchError],
    ['invalid number pair', { track: { no: -1 } }, InvalidPatchError],
    ['invalid common object', { title: {} } as TagPatch, InvalidPatchError],
    ['invalid native root', { native: [] } as unknown as TagPatch, InvalidPatchError],
    [
      'unsupported cover role',
      { picture: [{ format: 'image/jpeg', data: new Uint8Array(), type: 'Artist' }] },
      UnsupportedFeatureError
    ],
    [
      'duplicate cover roles',
      { picture: [0, 1].map(() => ({ format: 'image/jpeg', data: new Uint8Array() })) },
      InvalidPatchError
    ],
    [
      'NUL cover filename',
      { picture: [{ format: 'image/jpeg', data: new Uint8Array(), name: 'bad\0.jpg' }] },
      InvalidPatchError
    ]
  ];
  it.each(invalidPatches)('rejects %s without changing input', async (_label, patch, error) => {
    const original = Buffer.from(ape);
    await expect(updateBuffer(ape, patch)).rejects.toThrow(error);
    expect(ape).toEqual(original);
  });

  it.each([{ padding: 0 }, { replaceId3: true }, { stripFlacId3: true }] satisfies WriteOptions[])(
    'rejects unsupported options %j',
    async options => {
      await expect(updateBuffer(ape, {}, options)).rejects.toThrow(UnsupportedFeatureError);
    }
  );

  it('rejects a leading ID3 tag rather than mixing separately writable tag systems', async () => {
    const id3 = Buffer.from('49443304000000000000', 'hex');
    await expect(updateBuffer(Buffer.concat([id3, ape]), { title: 'Update' })).rejects.toThrow('leading ID3');
  });

  it('rejects partial number-pair edits on binary native values', async () => {
    const input = await updateBuffer(ape, { native: { Track: new Uint8Array([0, 1]) } });
    await expect(updateBuffer(input, { track: { no: 1 } })).rejects.toThrow('non-text');
    expect((await parseBuffer(await updateBuffer(input, { track: { no: 1, of: 2 } }))).common.track).toEqual({
      no: 1,
      of: 2
    });
  });

  it.each([
    ['old tag version', 8, 1000, UnsupportedFeatureError],
    ['tag overlaps audio', 12, 83880, InvalidFileError],
    ['tag extends before file', 12, 90000, InvalidFileError],
    ['impossible item count', 16, 100, InvalidFileError],
    ['unused payload', 16, 0, InvalidFileError],
    ['footer header marker', 20, 0xa0000000, InvalidFileError],
    ['no-footer flag', 20, 0xc0000000, InvalidFileError],
    ['reserved flags', 20, 0x80000008, InvalidFileError],
    ['reserved bytes', 24, 1, InvalidFileError]
  ] as const)('rejects malformed %s', async (_label, offset, value, error) => {
    const input = mutateEnvelopes(ape, offset, value);
    await expect(updateBuffer(input, { title: 'Update' })).rejects.toThrow(error);
  });

  it.each([
    'header signature',
    'header mismatch',
    'item flags',
    'value boundary',
    'key terminator',
    'invalid key'
  ] as const)('rejects malformed %s', async kind => {
    const input = Buffer.from(ape);
    const tag = layout(input);
    const item = [...tag.items.values()][0];
    const offset = item.byteOffset - input.byteOffset;
    if (kind === 'header signature') {
      input[tag.start] = 0;
    }
    if (kind === 'header mismatch') {
      input.writeUInt32LE(99, tag.start + 12);
    }
    if (kind === 'item flags') {
      input.writeUInt32LE(8, offset + 4);
    }
    if (kind === 'value boundary') {
      input.writeUInt32LE(1000, offset);
    }
    if (kind === 'key terminator') {
      input.fill(65, offset + 8, tag.end - 32);
    }
    if (kind === 'invalid key') {
      input[offset + 8] = 1;
    }
    await expect(updateBuffer(input, {})).rejects.toThrow(InvalidFileError);
  });

  it('rejects duplicate case-insensitive native items in existing tags', async () => {
    const input = Buffer.from(await updateBuffer(ape, { native: { First: 'one', Other: 'two' } }));
    const item = layout(input).items.get('OTHER')!;
    input.write('FIRST', item.byteOffset - input.byteOffset + 8);
    await expect(updateBuffer(input, {})).rejects.toThrow('Duplicate APEv2 item');
  });

  it('rejects truncated native container extents', async () => {
    const truncated = ape.subarray(0, 60);
    await expect(updateBuffer(truncated, { title: 'Update' })).rejects.toThrow('audio is truncated');
    const oldApe = Buffer.from(ape);
    oldApe.writeUInt32LE(3970, 4);
    await expect(updateBuffer(oldApe, {})).rejects.toThrow('before version 3.98');
    const wv = await readFile(path.join(samplePath, fixtures[1][1]));
    wv.writeUInt32LE(wv.length, 4);
    await expect(updateBuffer(wv, {})).rejects.toThrow('WavPack block');
  });

  for (const atomic of [true, false]) {
    it(`uses shared file writing, backup and dry-run behavior (atomic=${atomic})`, async () => {
      const directory = await mkdtemp(path.join(tmpdir(), 'ape-write-'));
      const file = path.join(directory, 'sample.ape');
      try {
        await writeFile(file, ape);
        const patch = { title: 'File update' };
        const expected = await updateBuffer(ape, patch);
        const dryRun = await updateFile(file, patch, { dryRun: true, atomic });
        expect(dryRun).toMatchObject({ format: 'ape', bytesWritten: expected.length, paddingBytes: 0, atomic });
        expect(await readFile(file)).toEqual(ape);
        expect(await readdir(directory)).toEqual(['sample.ape']);
        const result = await updateFile(file, patch, { atomic, backup: true });
        expect(result).toMatchObject({ format: 'ape', bytesWritten: expected.length, paddingBytes: 0, atomic });
        expect(await readFile(file)).toEqual(Buffer.from(expected));
        expect(await readFile(`${file}.bak`)).toEqual(ape);
        const invalid = Buffer.from(ape);
        invalid.writeUInt32LE(8, layout(invalid).end - 12);
        await writeFile(file, invalid);
        await expect(updateFile(file, patch, { atomic })).rejects.toThrow(InvalidFileError);
        expect(await readFile(file)).toEqual(invalid);
        expect((await readdir(directory)).sort()).toEqual(['sample.ape', 'sample.ape.bak']);
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    });
  }
});
