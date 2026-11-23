import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import AsfGuid from '../lib/asf/AsfGuid.js';
import {
  InvalidFileError,
  InvalidPatchError,
  orderTags,
  parseBuffer,
  parseFile,
  type TagPatch,
  UnsupportedFeatureError,
  updateBuffer,
  updateFile
} from '../lib/index.js';
import { buildAsfUpdate } from '../lib/write/asf/asf.js';
import { MAX_HEADER_BYTES, textLength } from '../lib/write/asf/objects.js';
import { updateBuffer as updateBrowserBuffer } from '../lib/write/browser.js';
import type { ByteSource } from '../lib/write/core/source.shared.js';

const fileId = new AsfGuid('10203040-5060-7080-90A0-B0C0D0E0F000').toBin();
const reserved = new AsfGuid('ABD3D211-A9BA-11CF-8EE6-00C00C205365').toBin();
const opaqueGuid = new AsfGuid('12345678-1234-1234-1234-123456789ABC');
const utf16 = (value: string) => Buffer.from(`${value}\0`, 'utf16le');
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZkAAAAASUVORK5CYII=',
  'base64'
);
const fixture = (name = '13 Thirty Dirty Birds.wma') =>
  fs.readFile(fileURLToPath(new URL(`./samples/asf/${name}`, import.meta.url)));

function object(guid: AsfGuid, body: Uint8Array): Buffer {
  const head = Buffer.alloc(24);
  head.set(guid.toBin());
  head.writeBigUInt64LE(BigInt(24 + body.length), 16);
  return Buffer.concat([head, body]);
}
function extension(children: Uint8Array[]): Buffer {
  const head = Buffer.alloc(22);
  head.set(reserved);
  head.writeUInt16LE(6, 16);
  head.writeUInt32LE(
    children.reduce((sum, child) => sum + child.length, 0),
    18
  );
  return object(AsfGuid.HeaderExtensionObject, Buffer.concat([head, ...children]));
}
function description(values: string[]): Buffer {
  const texts = Array.from({ length: 5 }, (_, index) =>
    values[index] === undefined ? Buffer.alloc(0) : utf16(values[index])
  );
  const head = Buffer.alloc(10);
  texts.forEach((text, index) => {
    head.writeUInt16LE(text.length, index * 2);
  });
  return object(AsfGuid.ContentDescriptionObject, Buffer.concat([head, ...texts]));
}
function record(key: string, type: number, value: Uint8Array, extended = false, language = 0, stream = 0): Buffer {
  const name = utf16(key);
  if (extended) {
    const length = Buffer.alloc(2);
    length.writeUInt16LE(name.length);
    const head = Buffer.alloc(4);
    head.writeUInt16LE(type);
    head.writeUInt16LE(value.length, 2);
    return Buffer.concat([length, name, head, value]);
  }
  const head = Buffer.alloc(12);
  head.writeUInt16LE(language);
  head.writeUInt16LE(stream, 2);
  head.writeUInt16LE(name.length, 4);
  head.writeUInt16LE(type, 6);
  head.writeUInt32LE(value.length, 8);
  return Buffer.concat([head, name, value]);
}
function metadata(guid: AsfGuid, records: Uint8Array[]): Buffer {
  const count = Buffer.alloc(2);
  count.writeUInt16LE(records.length);
  return object(guid, Buffer.concat([count, ...records]));
}
function languageList(): Buffer {
  const head = Buffer.from([2, 0]);
  return object(
    AsfGuid.LanguageListObject,
    Buffer.concat([
      head,
      ...['en-US', 'nl-NL'].flatMap(language => {
        const text = utf16(language);
        return [Buffer.from([text.length]), text];
      })
    ])
  );
}
function simpleIndex(): Buffer {
  const body = Buffer.alloc(38);
  body.set(fileId);
  body.writeBigUInt64LE(10_000_000n, 16);
  body.writeUInt32LE(1, 24);
  body.writeUInt32LE(1, 28);
  body.writeUInt16LE(1, 36);
  return object(AsfGuid.SimpleIndexObject, body);
}
function synthetic(extra: Uint8Array[] = [], tail: Uint8Array[] = [], propsBody?: Buffer): Buffer {
  const props = propsBody ?? Buffer.alloc(80);
  if (!propsBody) {
    props.set(fileId);
    props.writeBigUInt64LE(2n, 32);
    props.writeBigUInt64LE(10_000_000n, 40);
    props.writeUInt32LE(2, 64);
    props.writeUInt32LE(128, 68);
    props.writeUInt32LE(128, 72);
    props.writeUInt32LE(16_000, 76);
  }
  const stream = Buffer.alloc(70);
  stream.set(AsfGuid.AudioMedia.toBin());
  stream.writeUInt32LE(16, 40);
  stream.writeUInt16LE(1, 48);
  stream.writeUInt16LE(0x161, 54);
  stream.writeUInt16LE(2, 56);
  stream.writeUInt32LE(44100, 58);
  stream.writeUInt32LE(2000, 62);
  stream.writeUInt16LE(128, 66);
  stream.writeUInt16LE(16, 68);
  const data = Buffer.alloc(26 + 256, 0xa5);
  data.set(fileId);
  data.writeBigUInt64LE(2n, 16);
  data.writeUInt16LE(0x0101, 24);
  const children = [
    object(AsfGuid.FilePropertiesObject, props),
    object(AsfGuid.StreamPropertiesObject, stream),
    ...extra
  ];
  const head = Buffer.alloc(30);
  head.set(AsfGuid.HeaderObject.toBin());
  const headerLength = 30 + children.reduce((sum, child) => sum + child.length, 0);
  head.writeBigUInt64LE(BigInt(headerLength), 16);
  head.writeUInt32LE(children.length, 24);
  head.set([1, 2], 28);
  const result = Buffer.concat([head, ...children, object(AsfGuid.DataObject, data), ...tail]);
  result.writeBigUInt64LE(BigInt(result.length), 30 + 40);
  return result;
}
interface ObjectRange {
  guid: string;
  start: number;
  end: number;
}
function objects(bytes: Uint8Array, start = 30, end = headerSize(bytes)): ObjectRange[] {
  const buffer = Buffer.from(bytes);
  const result: ObjectRange[] = [];
  while (start < end) {
    const size = Number(buffer.readBigUInt64LE(start + 16));
    result.push({ guid: AsfGuid.decode(bytes, start), start, end: start + size });
    start += size;
  }
  return result;
}
const headerSize = (bytes: Uint8Array) => Number(Buffer.from(bytes).readBigUInt64LE(16));
const dataAndIndexes = (bytes: Uint8Array) => Buffer.from(bytes.subarray(headerSize(bytes)));
const rawObject = (bytes: Uint8Array, guid: AsfGuid) => {
  const found = objects(bytes).find(obj => obj.guid === guid.str)!;
  return Buffer.from(bytes.subarray(found.start, found.end));
};
const audioPayload = (bytes: Uint8Array) => {
  // The data object follows the header; padding and index objects come after it.
  const start = headerSize(bytes);
  const size = Number(Buffer.from(bytes).readBigUInt64LE(start + 16));
  return Buffer.from(bytes.subarray(start + 24, start + size));
};
const tags = async (bytes: Uint8Array) => (await parseBuffer(bytes)).common;

// These fixtures validate container and metadata layouts, not encoded packet contents; real WMA files are tested below.
describe('WMA / ASF metadata writing', () => {
  for (const name of ['13 Thirty Dirty Birds.wma', 'issue_57.wma', 'wma_rating.wma', 'compilation-bool.wma']) {
    it(`writes Unicode, common/native metadata and artwork in ${name} without changing packets`, async () => {
      const input = await fixture(name);
      const copy = Buffer.from(input);
      const output = await updateBuffer(input, {
        title: '标题 🎵 café',
        artist: ['歌手 A', 'Artist B'],
        albumArtist: 'Album artist',
        album: '专辑',
        genres: ['Ambient', 'Electronic'],
        date: '2026-11-16',
        trackNumber: 2,
        trackTotal: 12,
        discNumber: 1,
        discTotal: 2,
        compilation: true,
        composers: ['Composer A', 'Composer B'],
        comments: [{ text: '评论', descriptor: 'Not stored', language: 'zho' }],
        lyrics: { language: 'zho', text: '歌词\n第二行' },
        bpm: 123,
        mbReleaseId: 'release-id',
        replayGainTrackGain: { dB: -6, ratio: 0.5 },
        picture: [{ format: 'image/png', type: 'Cover (front)', description: '封面 🎨', data: png }],
        native: { 'Custom/标题': 'Private 🌏', 'Custom/Binary': Buffer.from([0, 255, 2]) }
      });
      expect(input).toEqual(copy);
      const parsed = await parseBuffer(output);
      expect(parsed.common.title).toBe('标题 🎵 café');
      expect(parsed.common.artists).toEqual(['歌手 A', 'Artist B']);
      expect(parsed.common.album).toBe('专辑');
      expect(parsed.common.genres).toEqual(['Ambient', 'Electronic']);
      expect(parsed.common.date).toBe('2026-11-16');
      expect(parsed.common.trackNumber).toBe(2);
      expect(parsed.common.trackTotal).toBe(12);
      expect(parsed.common.discNumber).toBe(1);
      expect(parsed.common.discTotal).toBe(2);
      expect(parsed.common.compilation).toBe(true);
      expect(parsed.common.composers).toEqual(['Composer A', 'Composer B']);
      expect(parsed.common.comments?.[0]?.text).toBe('评论');
      expect(parsed.common.lyrics?.[0]?.text).toBe('歌词\n第二行');
      expect(parsed.common.bpm).toBe(123);
      expect(parsed.common.mbReleaseId).toBe('release-id');
      expect(parsed.common.replayGainTrackGain?.dB).toBe(-6);
      expect(parsed.common.picture?.[0]?.description).toBe('封面 🎨');
      expect(Buffer.from(parsed.common.picture![0].data)).toEqual(png);
      const native = orderTags(parsed.native.asf!);
      expect(native['Custom/标题']).toEqual(['Private 🌏']);
      expect(native['Custom/Binary']).toEqual([new Uint8Array([0, 255, 2])]);
      expect(audioPayload(output)).toEqual(audioPayload(input));
      const props = rawObject(output, AsfGuid.FilePropertiesObject);
      expect(Number(props.readBigUInt64LE(40))).toBe(output.length);
      const oldProps = rawObject(input, AsfGuid.FilePropertiesObject);
      oldProps.writeBigUInt64LE(BigInt(output.length), 40);
      expect(props).toEqual(oldProps);
      const again = await updateBuffer(output, {
        title: 'Short',
        trackNumber: 3,
        discTotal: 4,
        genres: null,
        picture: []
      });
      const common = await tags(again);
      expect(common.trackNumber).toBe(3);
      expect(common.discNumber).toBe(1);
      expect(common.discTotal).toBe(4);
      expect(common.genres).toBeUndefined();
      expect(common.picture).toBeUndefined();
      expect(orderTags((await parseBuffer(again)).native.asf!)['Custom/标题']).toEqual(['Private 🌏']);
      expect(dataAndIndexes(again)).toEqual(dataAndIndexes(input));
    });
  }

  it('reads bare ARTISTS and replaces it with WM/ARTISTS on a common edit', async () => {
    const artist = 'A feat. B';
    const original = await updateBuffer(await fixture(), { artist, native: { ARTISTS: ['A', 'B'] } });
    expect((await parseBuffer(original)).common).toMatchObject({ artist, artists: ['A', 'B'] });
    const artists = ['A', 'Guest'];
    const saved = await parseBuffer(await updateBuffer(original, { artists }));
    expect(saved.common).toMatchObject({ artist, artists });
    expect(saved.native.asf.filter(tag => tag.id === 'WM/ARTISTS').map(tag => tag.value)).toEqual(artists);
    expect(saved.native.asf.some(tag => tag.id === 'ARTISTS')).toBe(false);
  });

  it('preserves the album artist credit and individual names', async () => {
    const tags = { albumArtist: 'A feat. B', albumArtists: ['A', 'B'] };
    const updated = await updateBuffer(await fixture(), tags);
    expect((await parseBuffer(updated)).common).toMatchObject(tags);
  });

  it('creates missing metadata objects, writes large/multiple covers, and is identical in the browser', async () => {
    const input = synthetic([], [simpleIndex()]);
    const large = Buffer.concat([png, Buffer.alloc(80_000)]);
    const patch: TagPatch = {
      title: '作品 🎼',
      artist: ['One', 'Two'],
      native: { Multiple: ['甲', '乙'], Long: '字'.repeat(40_000) },
      picture: [
        { format: 'png', description: '正面', type: 'Cover (front)', data: large },
        { format: 'image/png', type: 'Cover (back)', data: png }
      ]
    };
    const output = await updateBuffer(input, patch);
    expect(await updateBrowserBuffer(input, patch)).toEqual(output);
    expect(await updateBrowserBuffer(new Blob([new Uint8Array(input)]), patch)).toEqual(output);
    const parsed = await parseBuffer(output);
    expect(parsed.common.artists).toEqual(['One', 'Two']);
    expect(parsed.common.picture).toHaveLength(2);
    expect(Buffer.from(parsed.common.picture![0].data)).toEqual(large);
    expect(orderTags(parsed.native.asf!).Multiple).toEqual(['甲', '乙']);
    expect(orderTags(parsed.native.asf!).Long).toEqual(['字'.repeat(40_000)]);
    const headerExtension = objects(output).find(obj => obj.guid === AsfGuid.HeaderExtensionObject.str)!;
    const nested = objects(output, headerExtension.start + 46, headerExtension.end);
    expect(nested.some(obj => obj.guid === AsfGuid.MetadataLibraryObject.str)).toBe(true);
    expect(dataAndIndexes(output)).toEqual(dataAndIndexes(input));
  });

  it('preserves opaque objects and every untouched raw attribute, including language/stream scopes and types', async () => {
    const libraryRecords = [
      record('Private', 0, utf16('旧值'), false, 1, 1),
      record('Bool', 2, Buffer.from([1, 0, 0, 0]), false, 1, 1),
      record('Unknown', 99, Buffer.from([4, 3, 2, 1]))
    ];
    const extRecords = [record('Binary', 1, Buffer.from([255, 0, 12]), true)];
    const opaque = object(opaqueGuid, Buffer.from([0, 1, 2, 3, 255]));
    const input = synthetic(
      [
        description(['Old title', 'Old author', 'Copyright', 'Comment', 'Legacy rating']),
        metadata(AsfGuid.ExtendedContentDescriptionObject, extRecords),
        opaque,
        extension([languageList(), opaque, metadata(AsfGuid.MetadataLibraryObject, libraryRecords)])
      ],
      [simpleIndex()]
    );
    const output = await updateBuffer(input, { title: '新标题', native: { Added: 'New' } }, { padding: 0 });
    expect(rawObject(output, opaqueGuid)).toEqual(opaque);
    const oldDescription = rawObject(input, AsfGuid.ContentDescriptionObject);
    const newDescription = rawObject(output, AsfGuid.ContentDescriptionObject);
    const suffix = oldDescription.subarray(34 + oldDescription.readUInt16LE(24));
    expect(newDescription.subarray(34 + newDescription.readUInt16LE(24))).toEqual(suffix);
    for (const raw of [...libraryRecords, ...extRecords, opaque]) {
      expect(Buffer.from(output).includes(raw)).toBe(true);
    }
    expect(dataAndIndexes(output)).toEqual(dataAndIndexes(input));
  });

  it('preserves extended audio stream properties with variable names and payload systems', async () => {
    const head = Buffer.alloc(64);
    head.writeUInt16LE(1, 48);
    head.writeUInt16LE(1, 60);
    head.writeUInt16LE(1, 62);
    const name = utf16('Audio 音声');
    const nameHead = Buffer.alloc(4);
    nameHead.writeUInt16LE(name.length, 2);
    const system = Buffer.alloc(25);
    system.set(opaqueGuid.toBin());
    system.writeUInt32LE(3, 18);
    system.set([1, 2, 3], 22);
    const extended = object(AsfGuid.ExtendedStreamPropertiesObject, Buffer.concat([head, nameHead, name, system]));
    const input = synthetic([extension([extended])]);
    const output = await updateBuffer(input, { title: 'New' });
    expect(Buffer.from(output).includes(extended)).toBe(true);
    expect(dataAndIndexes(output)).toEqual(dataAndIndexes(input));
  });

  it('rejects embedded stream definitions and malformed extended stream records', async () => {
    const head = Buffer.alloc(64);
    head.writeUInt16LE(1, 48);
    const embedded = rawObject(synthetic(), AsfGuid.StreamPropertiesObject);
    embedded.set(AsfGuid.VideoMedia.toBin(), 24);
    const extended = object(AsfGuid.ExtendedStreamPropertiesObject, Buffer.concat([head, embedded]));
    await expect(updateBuffer(synthetic([extension([extended])]), {})).rejects.toBeInstanceOf(UnsupportedFeatureError);
    head.writeUInt16LE(2, 48);
    await expect(
      updateBuffer(synthetic([extension([object(AsfGuid.ExtendedStreamPropertiesObject, head)])]), {})
    ).rejects.toBeInstanceOf(UnsupportedFeatureError);
    head.writeUInt16LE(1, 48);
    const expectInvalid = async (bytes: Uint8Array) => {
      await expect(
        updateBuffer(synthetic([extension([object(AsfGuid.ExtendedStreamPropertiesObject, bytes)])]), {})
      ).rejects.toBeInstanceOf(InvalidFileError);
    };
    await expectInvalid(head.subarray(0, 63));
    head.writeUInt16LE(1, 60);
    await expectInvalid(head);
    await expectInvalid(Buffer.concat([head, Buffer.from([0, 0, 1, 0, 255])]));
    head.writeUInt16LE(0, 60);
    head.writeUInt16LE(1, 62);
    const system = Buffer.alloc(22);
    system.writeUInt32LE(5, 18);
    await expectInvalid(Buffer.concat([head, system]));
  });

  it('clears competing content/extended/metadata/library values and merges typed track numbers', async () => {
    const track = Buffer.alloc(4);
    track.writeUInt32LE(7);
    const input = synthetic([
      description(['Old', 'Author']),
      metadata(AsfGuid.ExtendedContentDescriptionObject, [
        record('WM/TrackNumber', 3, track, true),
        record('TotalTracks', 0, utf16('20'), true),
        record('WM/PartOfSet', 0, utf16('2/5'), true),
        record('Title', 0, utf16('ECD title'), true)
      ]),
      extension([
        languageList(),
        metadata(AsfGuid.MetadataObject, [record('Title', 0, utf16('Metadata title'), false, 0, 1)]),
        metadata(AsfGuid.MetadataLibraryObject, [record('Title', 0, utf16('Library title'), false, 1, 1)])
      ])
    ]);
    const output = await updateBuffer(input, { title: 'Only one', trackNumber: 8, discTotal: null });
    expect(orderTags((await parseBuffer(output)).native.asf!).Title).toEqual(['Only one']);
    expect((await tags(output)).trackNumber).toBe(8);
    expect((await tags(output)).trackTotal).toBe(20);
    expect((await tags(output)).discNumber).toBe(2);
    expect((await tags(output)).discTotal).toBeUndefined();
    const cleared = await updateBuffer(output, { title: [], artist: null, trackNumber: null, discNumber: null });
    expect((await tags(cleared)).title).toBeUndefined();
    expect((await tags(cleared)).artist).toBeUndefined();
    expect((await tags(cleared)).trackNumber).toBeUndefined();
    expect((await tags(cleared)).trackTotal).toBeUndefined();
    expect((await tags(cleared)).discNumber).toBeUndefined();
    expect((await tags(cleared)).discTotal).toBeUndefined();
    expect(audioPayload(cleared)).toEqual(audioPayload(input));
    const nativeCleared = await updateBuffer(input, { trackNumber: null, discNumber: null, native: null });
    const removedNumberKeys = new Set(['WM/TrackNumber', 'TotalTracks', 'WM/PartOfSet', 'TotalDiscs']);
    expect((await parseBuffer(nativeCleared)).native.asf).toEqual(
      (await parseBuffer(input)).native.asf!.filter(tag => !removedNumberKeys.has(tag.id))
    );
    const clearedNumbers = await tags(nativeCleared);
    expect(clearedNumbers.trackNumber).toBeUndefined();
    expect(clearedNumbers.trackTotal).toBeUndefined();
    expect(clearedNumbers.discNumber).toBeUndefined();
    expect(clearedNumbers.discTotal).toBeUndefined();
    expect(audioPayload(nativeCleared)).toEqual(audioPayload(input));
    const totals = await updateBuffer(synthetic(), { year: 2026, trackTotal: 12, discTotal: 3 });
    expect((await tags(totals)).year).toBe(2026);
    expect((await tags(totals)).trackNumber).toBeUndefined();
    expect((await tags(totals)).trackTotal).toBe(12);
    expect((await tags(totals)).discNumber).toBeUndefined();
    expect((await tags(totals)).discTotal).toBe(3);
  });

  it('supports typed native values, scoped values, native precedence, and both rating forms', async () => {
    const input = synthetic([extension([languageList()])]);
    const output = await updateBuffer(input, {
      title: 'Common',
      compilation: false,
      rating: [{ rating: 0.8 }, { source: 'test@example.com', rating: 0.5 }, { rating: 0 }],
      native: {
        Title: 'Native',
        Text: { type: 'unicode', value: '世界', language: 1, stream: 1 },
        Flag: { type: 'bool', value: true },
        Word: { type: 'word', value: 65535 },
        Dword: { type: 'dword', value: 0xffffffff },
        Qword: { type: 'qword', value: 0xffffffffffffffffn },
        Guid: { type: 'guid', value: opaqueGuid.str },
        Blob: { type: 'binary', value: Buffer.from([1, 0, 255]) }
      }
    });
    const parsed = await parseBuffer(output);
    expect(parsed.common.title).toBe('Native');
    expect(parsed.common.compilation).toBe(false);
    expect(parsed.common.rating?.[0]?.rating).toBeCloseTo(0.8, 2);
    expect(parsed.common.rating?.[1]).toEqual({ source: 'test@example.com', rating: 0.5 });
    expect(parsed.common.rating?.[2]?.rating).toBe(0);
    const native = orderTags(parsed.native.asf!);
    expect(native.Flag).toEqual([true]);
    expect(native.Word).toEqual([65535]);
    expect(native.Dword).toEqual([0xffffffff]);
    expect(native.Qword).toEqual([0xffffffffffffffffn]);
    expect(native.Guid).toEqual([opaqueGuid.toBin()]);
    expect(Buffer.from(output).includes(record('Text', 0, utf16('世界'), false, 1, 1))).toBe(true);
    const sourceOnly = await updateBuffer(output, { rating: [{ source: 'test@example.com' }] });
    expect((await tags(sourceOnly)).rating).toBeUndefined();
    const removed = await updateBuffer(output, { native: { Text: null }, rating: [] });
    expect(orderTags((await parseBuffer(removed)).native.asf!).Text).toBeUndefined();
    expect((await tags(removed)).rating).toBeUndefined();
  });

  it('removes track and total values without decoding their previous native types', async () => {
    const input = await updateBuffer(synthetic(), {
      native: { 'WM/TrackNumber': '3', TotalTracks: Buffer.from([1, 2, 3]) }
    });
    expect((await tags(await updateBuffer(input, { trackTotal: 12 }))).trackNumber).toBe(3);
    expect((await tags(await updateBuffer(input, { trackTotal: 12 }))).trackTotal).toBe(12);
    const output = await updateBuffer(input, { trackNumber: null });
    expect((await tags(output)).trackNumber).toBeUndefined();
    expect((await tags(output)).trackTotal).toBeUndefined();
    const native = orderTags((await parseBuffer(output)).native.asf ?? []);
    expect(native['WM/TrackNumber']).toBeUndefined();
    expect(native.TotalTracks).toBeUndefined();
    expect(dataAndIndexes(output)).toEqual(dataAndIndexes(input));
  });

  it.each([
    { type: 4, value: Buffer.from('0500000000000000', 'hex') },
    { type: 5, value: Buffer.from('0500', 'hex') }
  ])('merges existing type $type track numbers', async ({ type, value }) => {
    const input = synthetic([
      metadata(AsfGuid.ExtendedContentDescriptionObject, [record('WM/TrackNumber', type, value, true)])
    ]);
    expect((await tags(await updateBuffer(input, { trackTotal: 12 }))).trackNumber).toBe(5);
    expect((await tags(await updateBuffer(input, { trackTotal: 12 }))).trackTotal).toBe(12);
  });

  it('accepts the empty movement index supplied by the reader', async () => {
    const input = await fixture();
    const { movementNumber } = (await parseBuffer(input)).common;
    expect(movementNumber).toBeUndefined();
    const updated = await updateBuffer(input, { title: 'Edited', movementNumber });
    expect((await parseBuffer(updated)).common).toMatchObject({ title: 'Edited' });
  });

  it('rejects merging track numbers with unsupported native types', async () => {
    const input = synthetic([
      metadata(AsfGuid.ExtendedContentDescriptionObject, [record('WM/TrackNumber', 2, Buffer.from([1, 0]), true)])
    ]);
    await expect(updateBuffer(input, { trackTotal: 12 })).rejects.toBeInstanceOf(UnsupportedFeatureError);
  });

  it.each([0.001, 0.005])('retains a specified rating when %s rounds to a zero shared rating', async rating => {
    for (const source of [undefined, 'player@example.com']) {
      const output = await updateBuffer(synthetic(), { rating: [{ rating, source }] });
      const parsed = await parseBuffer(output);
      expect(parsed.common.rating?.[0]?.rating).toBeGreaterThan(0);
      expect(parsed.common.rating?.[0]?.rating).toBeCloseTo(rating, 2);
      expect(orderTags(parsed.native.asf!).POPULARIMETER).toHaveLength(1);
    }
  });

  it('batches 60000 native replacements while preserving omitted fields and native precedence', async () => {
    const keep = record('Keep', 0, utf16('Untouched'), true);
    const scopedKeep = record('ScopedKeep', 0, utf16('Scoped'), false, 1, 1);
    const input = synthetic([
      description(['Old']),
      metadata(AsfGuid.ExtendedContentDescriptionObject, [
        keep,
        record('Removed', 0, utf16('Delete'), true),
        record('Custom/0', 0, utf16('Old'), true)
      ]),
      extension([
        languageList(),
        metadata(AsfGuid.MetadataLibraryObject, [scopedKeep, record('Custom/0', 0, utf16('Scoped old'), false, 1, 1)])
      ])
    ]);
    const native: NonNullable<TagPatch['native']> = {
      ...Object.fromEntries(Array.from({ length: 60_000 }, (_, index) => [`Custom/${index}`, `${index}`])),
      Title: 'Native',
      Removed: null,
      Keep: undefined
    };
    const output = await updateBuffer(input, { title: 'Common', native }, { padding: 0 });
    const parsed = await parseBuffer(output);
    const written = orderTags(parsed.native.asf!);
    expect(parsed.common.title).toBe('Native');
    expect(Object.keys(written)).toHaveLength(60_003);
    expect(written['Custom/0']).toEqual(['0']);
    expect(written['Custom/59999']).toEqual(['59999']);
    expect(written.Keep).toEqual(['Untouched']);
    expect(written.Removed).toBeUndefined();
    expect(Buffer.from(output).includes(keep)).toBe(true);
    expect(Buffer.from(output).includes(scopedKeep)).toBe(true);
    expect(dataAndIndexes(output)).toEqual(dataAndIndexes(input));
  });

  it('preserves reader-visible pairs during partial updates of duplicate number records', async () => {
    const input = await updateBuffer(synthetic(), {
      native: { 'WM/TrackNumber': ['1', '4'], 'WM/PartOfSet': ['1/3', '4/7'], TotalTracks: ['10', '20'] }
    });
    expect((await tags(input)).trackNumber).toBe(4);
    expect((await tags(input)).trackTotal).toBe(20);
    expect((await tags(input)).discNumber).toBe(4);
    expect((await tags(input)).discTotal).toBe(3);
    const output = await updateBuffer(input, { trackTotal: 12, discTotal: 5 });
    expect((await tags(output)).trackNumber).toBe(4);
    expect((await tags(output)).trackTotal).toBe(12);
    expect((await tags(output)).discNumber).toBe(4);
    expect((await tags(output)).discTotal).toBe(5);
    const numbers = await updateBuffer(input, { trackNumber: 8, discNumber: 2 });
    expect((await tags(numbers)).trackNumber).toBe(8);
    expect((await tags(numbers)).trackTotal).toBe(20);
    expect((await tags(numbers)).discNumber).toBe(2);
    expect((await tags(numbers)).discTotal).toBe(3);
    expect(dataAndIndexes(output)).toEqual(dataAndIndexes(input));
  });

  it('resolves number records in source order across extended, metadata and library objects', async () => {
    const input = synthetic([
      metadata(AsfGuid.ExtendedContentDescriptionObject, [
        record('WM/TrackNumber', 0, utf16('1/10'), true),
        record('WM/PartOfSet', 0, utf16('1/3'), true)
      ]),
      extension([
        metadata(AsfGuid.MetadataObject, [record('WM/TrackNumber', 0, utf16('2/20'))]),
        metadata(AsfGuid.MetadataLibraryObject, [
          record('WM/TrackNumber', 0, utf16('4/30')),
          record('TotalTracks', 0, utf16('40')),
          record('TotalTracks', 0, utf16('50')),
          record('WM/PartOfSet', 0, utf16('4/7'))
        ])
      ])
    ]);
    expect((await tags(input)).trackNumber).toBe(4);
    expect((await tags(input)).trackTotal).toBe(50);
    expect((await tags(input)).discNumber).toBe(4);
    expect((await tags(input)).discTotal).toBe(3);
    const output = await updateBuffer(input, { trackTotal: 12, discNumber: 2 });
    expect((await tags(output)).trackNumber).toBe(4);
    expect((await tags(output)).trackTotal).toBe(12);
    expect((await tags(output)).discNumber).toBe(2);
    expect((await tags(output)).discTotal).toBe(3);
    const numbers = await updateBuffer(input, { trackNumber: 8 });
    expect((await tags(numbers)).trackNumber).toBe(8);
    expect((await tags(numbers)).trackTotal).toBe(50);
    expect(dataAndIndexes(output)).toEqual(dataAndIndexes(input));
  });

  it('stores plain-text lyrics and drops timing/ID3 attributes on synchronized input', async () => {
    const input = synthetic();
    const output = await updateBuffer(input, {
      lyrics: {
        language: 'eng',
        descriptor: 'Original',
        timeStampFormat: 2,
        syncText: [
          { text: 'First', timestamp: 1000 },
          { text: 'Second', timestamp: 2000 }
        ]
      }
    });
    const lyrics = (await tags(output)).lyrics!;
    expect(lyrics[0].text).toBe('First\nSecond');
    expect(lyrics[0].language).toBeUndefined();
    expect(lyrics[0].descriptor).toBeUndefined();
    expect(lyrics[0].syncText).toEqual([]);
    for (const value of ['', [], null] as const) {
      expect((await tags(await updateBuffer(output, { lyrics: value }))).lyrics).toBeUndefined();
    }
  });

  it('preserves ASF number tags when both pair values are undefined', async () => {
    const input = await updateBuffer(synthetic(), {
      native: { 'WM/TrackNumber': '02', TotalTracks: '13', 'WM/PartOfSet': '01/03' }
    });
    const output = await updateBuffer(input, { track: undefined, disk: undefined });
    expect(output).toEqual(input);
  });

  it('preserves ASF totals when explicit partial pairs clear their numbers', async () => {
    const input = await updateBuffer(synthetic(), { trackNumber: 2, trackTotal: 13, discNumber: 1, discTotal: 3 });
    const output = await updateBuffer(input, { track: { no: null }, disk: { no: null } });
    const common = await tags(output);
    expect(common.trackNumber).toBeUndefined();
    expect(common.trackTotal).toBe(13);
    expect(common.discNumber).toBeUndefined();
    expect(common.discTotal).toBe(3);
  });

  it('clears a disc pair without decoding its existing binary value', async () => {
    const input = await updateBuffer(synthetic(), {
      native: { 'WM/PartOfSet': Buffer.from([1, 2, 3]) }
    });
    const output = await updateBuffer(input, { disk: null });
    expect(orderTags((await parseBuffer(output)).native.asf ?? [])['WM/PartOfSet']).toBeUndefined();
    expect(dataAndIndexes(output)).toEqual(dataAndIndexes(input));
  });

  it('preserves absent number pairs and removes a standalone track total', async () => {
    const input = synthetic();
    const untouched = await updateBuffer(input, { track: null, disk: null });
    expect(Buffer.from(untouched)).toEqual(input);

    const withTotal = await updateBuffer(input, { native: { TotalTracks: '13' } });
    expect((await tags(withTotal)).trackTotal).toBe(13);
    expect((await tags(await updateBuffer(withTotal, { track: null }))).trackTotal).toBeUndefined();
  });

  it('keeps no-op writes byte-identical and honors explicit padding', async () => {
    const input = await fixture();
    expect(Buffer.from(await updateBuffer(input, {}))).toEqual(input);
    expect(Buffer.from(await updateBuffer(input, { title: undefined }))).toEqual(input);
    const output = await updateBuffer(input, {}, { padding: 37 });
    expect(rawObject(output, AsfGuid.PaddingObject)).toHaveLength(61);
    expect(dataAndIndexes(output)).toEqual(dataAndIndexes(input));
    const removed = await updateBuffer(output, {}, { padding: 0 });
    expect(objects(removed).some(obj => obj.guid === AsfGuid.PaddingObject.str)).toBe(false);
    expect(dataAndIndexes(removed)).toEqual(dataAndIndexes(input));
  });

  it.each([0n, 1n, 999_999n, 0xffffffffffffffffn])(
    'repairs stale declared file size %s on an edit, but preserves no-op bytes',
    async declaredSize => {
      const input = synthetic([], [simpleIndex()]);
      input.writeBigUInt64LE(declaredSize, 70);
      expect(Buffer.from(await updateBuffer(input, {}))).toEqual(input);
      for (const output of [
        await updateBuffer(input, { title: 'Repaired' }),
        await updateBuffer(input, {}, { padding: 0 })
      ]) {
        expect(rawObject(output, AsfGuid.FilePropertiesObject).readBigUInt64LE(40)).toBe(BigInt(output.length));
        expect(dataAndIndexes(output)).toEqual(dataAndIndexes(input));
      }
      const truncated = input.subarray(0, headerSize(input) + 50);
      await expect(updateBuffer(truncated, { title: 'Repaired' })).rejects.toBeInstanceOf(InvalidFileError);
    }
  );

  it('supports file results, dry-run, backup and non-atomic disk staging', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'music-metadata-asf-'));
    try {
      const file = path.join(dir, 'track.wma');
      const input = await fixture();
      await fs.writeFile(file, input);
      const dryRun = await updateFile(file, { title: 'New' }, { dryRun: true, padding: 10 });
      expect(dryRun.format).toBe('asf');
      expect(dryRun.paddingBytes).toBe(10);
      expect(await fs.readFile(file)).toEqual(input);
      const result = await updateFile(file, { title: 'New' }, { backup: true, padding: 10 });
      expect(result).toMatchObject({ format: 'asf', atomic: true, paddingBytes: 10 });
      expect(result.bytesWritten).toBe((await fs.stat(file)).size);
      expect(result.bytesWritten).toBe(dryRun.bytesWritten);
      expect(await fs.readFile(`${file}.bak`)).toEqual(input);
      expect((await parseFile(file)).common.title).toBe('New');
      const inPlace = await updateFile(file, { title: 'In place' }, { atomic: false });
      expect(inPlace.atomic).toBe(false);
      expect((await parseFile(file)).common.title).toBe('In place');
      expect(dataAndIndexes(await fs.readFile(file))).toEqual(dataAndIndexes(input));
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it.each([
    { title: 'Bad\0text' },
    { title: '\ud800' },
    { title: '\udc00' },
    { native: { '': 'Value' } },
    { native: { ['x'.repeat(32767)]: 'Value' } },
    { native: { Flag: { type: 'bool', value: 1 } } },
    { native: { Number: { type: 'word', value: 65536 } } },
    { native: { Number: { type: 'dword', value: -1 } } },
    { native: { Number: { type: 'qword', value: 2 ** 60 } } },
    { native: { Number: { type: 'qword', value: -1n } } },
    { native: { Number: { type: 'qword', value: 2n ** 64n } } },
    { native: { Guid: { type: 'guid', value: 'not-a-guid' } } },
    { native: { Text: { type: 'unicode', value: 'x', language: 1 } } },
    { native: { Text: { type: 'unicode', value: 'x', stream: 2 } } },
    { native: { Text: { type: 'unicode', value: 'x', extra: true } } },
    { native: { Unsupported: { value: 1 } } },
    { native: { Invalid: [null] } },
    { native: { Text: { type: 'unicode', value: 'x', language: -1 } } },
    { native: { Text: { type: 'unicode', value: 'x', stream: 128 } } },
    { native: [] },
    { compilation: 'yes' },
    { rating: 1 },
    { rating: [null] },
    { rating: [{ rating: 2 }] },
    { rating: [{ source: 'a|b', rating: 0.5 }] },
    { picture: [{ format: 'image/png', data: png, type: 'Unknown role' }] }
  ])('rejects invalid patch %#', async patch => {
    await expect(updateBuffer(synthetic(), patch as TagPatch)).rejects.toBeInstanceOf(InvalidPatchError);
  });

  it('rejects unsupported fields/options and bounds metadata size/count before rendering', async () => {
    const input = synthetic();
    await expect(updateBuffer(input, { chapters: [] })).rejects.toBeInstanceOf(UnsupportedFeatureError);
    await expect(updateBuffer(input, { movementTotal: 2 })).rejects.toBeInstanceOf(UnsupportedFeatureError);
    await expect(updateBuffer(input, {}, { replaceId3: true })).rejects.toBeInstanceOf(UnsupportedFeatureError);
    await expect(updateBuffer(input, {}, { stripFlacId3: true })).rejects.toBeInstanceOf(UnsupportedFeatureError);
    for (const padding of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(updateBuffer(input, {}, { padding })).rejects.toBeInstanceOf(InvalidPatchError);
    }
    await expect(updateBuffer(input, {}, { padding: 64 * 1024 * 1024 })).rejects.toBeInstanceOf(
      UnsupportedFeatureError
    );
    await expect(updateBuffer(input, { native: { Many: new Array(65536).fill('x') } })).rejects.toBeInstanceOf(
      UnsupportedFeatureError
    );
    await expect(updateBuffer(input, { native: { Huge: 'x'.repeat(34 * 1024 * 1024) } })).rejects.toBeInstanceOf(
      UnsupportedFeatureError
    );
    const overBudget = 'x'.repeat(17 * 1024 * 1024);
    await expect(updateBuffer(input, { native: { A: overBudget, B: overBudget } })).rejects.toBeInstanceOf(
      UnsupportedFeatureError
    );
  });

  it('rejects malformed header, object, metadata and data boundaries', async () => {
    const input = synthetic();
    const cases: Buffer[] = [];
    const mutate = (callback: (buffer: Buffer) => void) => {
      const buffer = Buffer.from(input);
      callback(buffer);
      cases.push(buffer);
    };
    mutate(buffer => buffer.writeBigUInt64LE(29n, 16));
    mutate(buffer => buffer.writeUInt32LE(3, 24));
    mutate(buffer => (buffer[28] = 0));
    mutate(buffer => buffer.writeBigUInt64LE(23n, 46));
    mutate(buffer => buffer.writeBigUInt64LE(0xffffffffffffffffn, 46));
    mutate(buffer => buffer.writeBigUInt64LE(5000n, headerSize(buffer) + 16));
    mutate(buffer => (buffer[headerSize(buffer) + 24] ^= 1));
    mutate(buffer => buffer.writeBigUInt64LE(3n, headerSize(buffer) + 40));
    mutate(buffer => buffer.writeUInt16LE(0, headerSize(buffer) + 48));
    mutate(buffer => buffer.writeUInt32LE(0, 30 + 92));
    mutate(buffer => buffer.writeUInt32LE(1, 30 + 96));
    mutate(buffer => {
      buffer.writeUInt32LE(200, 30 + 92);
      buffer.writeUInt32LE(300, 30 + 96);
    });
    mutate(buffer => buffer.writeUInt32LE(17, 30 + 104 + 64));
    for (const buffer of cases) {
      await expect(updateBuffer(buffer, {})).rejects.toBeInstanceOf(InvalidFileError);
    }
    const badMeta = metadata(AsfGuid.ExtendedContentDescriptionObject, [record('Key', 0, utf16('value'), true)]);
    badMeta.writeUInt16LE(2, 24);
    await expect(updateBuffer(synthetic([badMeta]), {})).rejects.toBeInstanceOf(InvalidFileError);
    const badName = metadata(AsfGuid.MetadataLibraryObject, [record('Key', 0, utf16('value'))]);
    badName.writeUInt16LE(65535, 30);
    await expect(updateBuffer(synthetic([extension([badName])]), {})).rejects.toBeInstanceOf(InvalidFileError);
    const badBool = metadata(AsfGuid.MetadataLibraryObject, [record('Bool', 2, Buffer.from([1]))]);
    await expect(updateBuffer(synthetic([extension([badBool])]), {})).rejects.toBeInstanceOf(InvalidFileError);
    const badExt = extension([]);
    badExt.writeUInt32LE(1, 42);
    await expect(updateBuffer(synthetic([badExt]), {})).rejects.toBeInstanceOf(InvalidFileError);
    await expect(updateBuffer(synthetic([extension([extension([])])]), {})).rejects.toBeInstanceOf(InvalidFileError);
    await expect(updateBuffer(synthetic([description(['A']), description(['B'])]), {})).rejects.toBeInstanceOf(
      InvalidFileError
    );
    await expect(updateBuffer(input.subarray(0, 30), {})).rejects.toBeInstanceOf(InvalidFileError);
    const missingStream = Buffer.from(input);
    missingStream.set(opaqueGuid.toBin(), 134);
    await expect(updateBuffer(missingStream, {})).rejects.toBeInstanceOf(InvalidFileError);
    const badIndexSize = simpleIndex();
    badIndexSize.writeBigUInt64LE(10n, 16);
    await expect(updateBuffer(synthetic([], [badIndexSize]), {})).rejects.toBeInstanceOf(InvalidFileError);
    const shortIndex = simpleIndex();
    shortIndex.writeBigUInt64LE(48n, 16);
    await expect(updateBuffer(synthetic([], [shortIndex]), {})).rejects.toBeInstanceOf(InvalidFileError);
    const badIndexEntries = simpleIndex();
    badIndexEntries.writeUInt32LE(2, 24 + 28);
    await expect(updateBuffer(synthetic([], [badIndexEntries]), {})).rejects.toBeInstanceOf(InvalidFileError);
  });

  it('rejects malformed ASF language lists', async () => {
    const oddStringLength = object(AsfGuid.LanguageListObject, Buffer.from([1, 0, 1, 0x41]));
    const trailingBytes = object(AsfGuid.LanguageListObject, Buffer.from([0, 0, 0]));
    for (const languageList of [oddStringLength, trailingBytes]) {
      await expect(updateBuffer(synthetic([extension([languageList])]), {})).rejects.toBeInstanceOf(InvalidFileError);
    }
  });

  it('rejects oversized ASF object, record and index counts', async () => {
    const tooManyObjects = synthetic();
    tooManyObjects.writeUInt32LE(10_001, 24);
    await expect(updateBuffer(tooManyObjects, {})).rejects.toBeInstanceOf(UnsupportedFeatureError);
    const nested = extension(Array.from({ length: 10_001 }, () => object(opaqueGuid, new Uint8Array(0))));
    await expect(updateBuffer(synthetic([nested]), {})).rejects.toBeInstanceOf(UnsupportedFeatureError);
    const records = Array.from({ length: 0xffff }, () => record('A', 0, new Uint8Array(0), true));
    const manyRecords = metadata(AsfGuid.ExtendedContentDescriptionObject, records);
    await expect(updateBuffer(synthetic([manyRecords, manyRecords]), {})).rejects.toBeInstanceOf(
      UnsupportedFeatureError
    );
    const indexes = Array.from({ length: 10_001 }, () => simpleIndex());
    await expect(updateBuffer(synthetic([], indexes), {})).rejects.toBeInstanceOf(UnsupportedFeatureError);
  });

  it('rejects malformed ASF object layouts', async () => {
    await expect(updateBuffer(synthetic([], [], Buffer.alloc(79)), {})).rejects.toBeInstanceOf(InvalidFileError);
    const badContentLength = description(['A']);
    badContentLength.writeUInt16LE(0, 24);
    await expect(updateBuffer(synthetic([badContentLength]), {})).rejects.toBeInstanceOf(InvalidFileError);
    await expect(updateBuffer(synthetic([extension([description(['A'])])]), {})).rejects.toBeInstanceOf(
      InvalidFileError
    );
    await expect(
      updateBuffer(synthetic([extension([metadata(AsfGuid.ExtendedContentDescriptionObject, [])])]), {})
    ).rejects.toBeInstanceOf(InvalidFileError);
    const nestedProperties = rawObject(synthetic(), AsfGuid.FilePropertiesObject);
    await expect(updateBuffer(synthetic([extension([nestedProperties])]), {})).rejects.toBeInstanceOf(
      UnsupportedFeatureError
    );
    const extraAttributeByte = object(AsfGuid.ExtendedContentDescriptionObject, Buffer.from([0, 0, 1]));
    await expect(updateBuffer(synthetic([extraAttributeByte]), {})).rejects.toBeInstanceOf(InvalidFileError);
    const oddName = object(
      AsfGuid.ExtendedContentDescriptionObject,
      Buffer.concat([Buffer.from([1, 0]), Buffer.from([1, 0, 0x41, 0, 0, 0, 0])])
    );
    await expect(updateBuffer(synthetic([oddName]), {})).rejects.toBeInstanceOf(InvalidFileError);
  });

  it('rejects ASF cover art and native values larger than the header budget', async () => {
    const huge = new Uint8Array(MAX_HEADER_BYTES);
    await expect(updateBuffer(synthetic(), { picture: [{ format: 'image/png', data: huge }] })).rejects.toBeInstanceOf(
      UnsupportedFeatureError
    );
    await expect(updateBuffer(synthetic(), { native: { Huge: huge } })).rejects.toBeInstanceOf(UnsupportedFeatureError);
  });

  it('rejects non-string ASF text and unsafe output sizes', async () => {
    expect(() => textLength(123 as unknown as string)).toThrow(InvalidPatchError);
    const base = synthetic();
    const oldSize = headerSize(base);
    const header = Buffer.from(base.subarray(0, oldSize));
    const dataHeader = Buffer.from(base.subarray(oldSize, oldSize + 50));
    const packetCount = BigInt(Math.floor((Number.MAX_SAFE_INTEGER - oldSize - 50) / 128));
    const dataSize = 50 + Number(packetCount * 128n);
    const sourceSize = oldSize + dataSize;
    header.writeBigUInt64LE(packetCount, 30 + 24 + 32);
    dataHeader.writeBigUInt64LE(BigInt(dataSize), 16);
    dataHeader.writeBigUInt64LE(packetCount, 40);
    const source = {
      size: sourceSize,
      tokenizer: {} as never,
      read: async (offset: number, length: number) => {
        const bytes = offset === 0 ? header : offset === oldSize ? dataHeader : undefined;
        if (!bytes) {
          throw new Error(`Unexpected ASF read at ${offset}`);
        }
        return bytes.subarray(0, length);
      },
      close: async () => undefined
    } as ByteSource;
    await expect(buildAsfUpdate(source, { title: 'New' }, {})).rejects.toBeInstanceOf(UnsupportedFeatureError);
  });

  it('rejects DRM/signatures, broadcast/video, complex indexes and populated placeholders', async () => {
    for (const guid of [
      AsfGuid.ContentEncryptionObject,
      AsfGuid.ExtendedContentEncryptionObject,
      AsfGuid.AdvancedContentEncryptionObject,
      AsfGuid.DigitalSignatureObject,
      AsfGuid.MarkerObject
    ]) {
      await expect(updateBuffer(synthetic([object(guid, Buffer.alloc(0))]), { title: 'New' })).rejects.toBeInstanceOf(
        UnsupportedFeatureError
      );
    }
    const broadcast = synthetic();
    broadcast.writeUInt32LE(3, 30 + 88);
    await expect(updateBuffer(broadcast, {})).rejects.toBeInstanceOf(UnsupportedFeatureError);
    const video = synthetic();
    video.set(AsfGuid.VideoMedia.toBin(), 134 + 24);
    await expect(updateBuffer(video, {})).rejects.toBeInstanceOf(UnsupportedFeatureError);
    const encrypted = synthetic();
    encrypted.writeUInt16LE(0x8001, 134 + 72);
    await expect(updateBuffer(encrypted, {})).rejects.toBeInstanceOf(UnsupportedFeatureError);
    const complexIndex = synthetic([], [object(AsfGuid.IndexObject, Buffer.alloc(32))]);
    await expect(updateBuffer(complexIndex, {})).rejects.toBeInstanceOf(UnsupportedFeatureError);
    const placeholder = object(AsfGuid.ASF_Index_Placeholder_Object, Buffer.from([1]));
    await expect(updateBuffer(synthetic([extension([placeholder])]), {})).rejects.toBeInstanceOf(
      UnsupportedFeatureError
    );
  });
});
