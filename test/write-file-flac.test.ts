import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { UnsupportedFormatError, updateBuffer, updateFile } from '../lib/index.js';
import { BlockHeader, BlockType, decodePicture, PICTURE_TYPES, pictureTypeToNumber } from '../lib/tokens/flac.js';
import { AttachedPictureType } from '../lib/tokens/id3v2.js';
import { encodePicture } from '../lib/write/flac/write.js';
import { encodeFrame } from '../lib/write/id3v2/frames.js';
import { extractAudio, extractBlocks, makeAudio, makeFlac, makeId3Prefix } from './helpers/flac.js';
import type { ReadResult } from './helpers/read.js';
import { readTags } from './helpers/read.js';

const temporaryDirectories: string[] = [];

function vorbisValues(result: ReadResult, id: string): string[] {
  return (result.native.vorbis ?? [])
    .filter(tag => tag.id === id && typeof tag.value === 'string')
    .map(tag => tag.value as string);
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

describe('FLAC reading', () => {
  it('reads Vorbis Comments and common tags', async () => {
    const input = makeFlac({
      comments: [
        { key: 'TITLE', value: 'Original title' },
        { key: 'ARTIST', value: 'First artist' },
        { key: 'ARTIST', value: 'Second artist' },
        { key: 'ALBUM', value: 'An album' },
        { key: 'DATE', value: '2024-01-02' },
        { key: 'TRACKNUMBER', value: '3' },
        { key: 'TRACKTOTAL', value: '12' },
        { key: 'DISCNUMBER', value: '1' },
        { key: 'DISCTOTAL', value: '2' },
        { key: 'GENRE', value: 'Rock' },
        { key: 'GENRE', value: 'Pop' },
        { key: 'MUSICBRAINZ_TRACKID', value: 'recording-id' },
        { key: 'MUSICBRAINZ_RELEASETRACKID', value: 'release-track-id' }
      ]
    });

    const result = await readTags(input);

    expect(result.format).toBe('flac');
    expect(result.common.title).toBe('Original title');
    expect(result.common.artist).toBe('First artist');
    expect(result.common.artists).toEqual(['First artist', 'Second artist']);
    expect(result.common.album).toBe('An album');
    expect(result.common.date).toBe('2024-01-02');
    expect(result.common.track).toEqual({ no: 3, of: 12 });
    expect(result.common.disk).toEqual({ no: 1, of: 2 });
    expect(result.common.genre).toEqual(['Rock', 'Pop']);
    expect(result.common.musicbrainz_recordingid).toBe('recording-id');
    expect(result.common.musicbrainz_trackid).toBe('release-track-id');
    expect(vorbisValues(result, 'TITLE')).toEqual(['Original title']);
    expect(vorbisValues(result, 'ARTIST')).toEqual(['First artist', 'Second artist']);
  });

  it('handles files without a Vorbis Comment block', async () => {
    const input = makeFlac({ comments: [] });
    const result = await readTags(input);
    expect(result.common.track).toEqual({ no: null, of: null });
    expect(result.common.disk).toEqual({ no: null, of: null });
  });

  it('adds a Vorbis Comment block when the file has none', async () => {
    const audio = makeAudio(2048);
    const input = makeFlac({ withVorbisComment: false, audio });

    const output = await updateBuffer(input, { title: 'Added', artist: 'Someone' });
    const result = await readTags(output);

    expect(result.common.title).toBe('Added');
    expect(result.common.artist).toBe('Someone');
    expect(extractAudio(output)).toEqual(audio);
  });

  it('reads native FLAC PICTURE blocks', async () => {
    const input = makeFlac({
      pictures: [
        {
          format: 'image/png',
          type: 'Cover (front)',
          description: 'front',
          data: Uint8Array.from([1, 2, 3, 4])
        }
      ]
    });

    const result = await readTags(input);
    expect(result.pictures).toHaveLength(1);
    expect(result.pictures[0]?.format).toBe('image/png');
    expect(result.pictures[0]?.type).toBe('Cover (front)');
    expect(result.pictures[0]?.description).toBe('front');
    expect(result.common.picture?.[0]?.data).toEqual(Uint8Array.from([1, 2, 3, 4]));
  });

  it('preserves an ID3v2 prefix', async () => {
    const prefix = makeId3Prefix(7);
    const input = makeFlac({ id3Prefix: prefix, comments: [{ key: 'TITLE', value: 'Old' }] });

    const output = await updateBuffer(input, { title: 'New' });
    expect(output.subarray(0, prefix.length)).toEqual(prefix);

    const result = await readTags(output);
    expect(result.common.title).toBe('New');
  });
});

describe('FLAC writing', () => {
  it('sets, preserves, and deletes tags', async () => {
    const input = makeFlac({
      comments: [
        { key: 'TITLE', value: 'Old' },
        { key: 'ARTIST', value: 'Keep me' },
        { key: 'CUSTOM_FIELD', value: 'custom' }
      ]
    });

    const output = await updateBuffer(input, {
      title: 'New',
      album: 'Added',
      genre: ['Jazz', 'Blues'],
      track: { no: 4, of: 9 },
      disk: { no: 1 },
      native: { CUSTOM_FIELD: 'updated' }
    });

    const result = await readTags(output);
    expect(result.common.title).toBe('New');
    expect(result.common.artist).toBe('Keep me');
    expect(result.common.album).toBe('Added');
    expect(result.common.genre).toEqual(['Jazz', 'Blues']);
    expect(result.common.track).toEqual({ no: 4, of: 9 });
    expect(result.common.disk).toEqual({ no: 1, of: null });
    expect(vorbisValues(result, 'CUSTOM_FIELD')).toEqual(['updated']);

    const deleted = await updateBuffer(output, { title: null, album: null, genre: null });
    const deletedResult = await readTags(deleted);
    expect(deletedResult.common.title).toBeUndefined();
    expect(deletedResult.common.album).toBeUndefined();
    expect(deletedResult.common.genre).toBeUndefined();
    expect(deletedResult.common.artist).toBe('Keep me');
  });

  it('does not modify the input buffer', async () => {
    const input = makeFlac({ comments: [{ key: 'TITLE', value: 'Old' }] });
    const before = input.slice();

    await updateBuffer(input, { title: 'New' });
    expect(input).toEqual(before);
  });

  it('preserves unknown metadata blocks and the audio payload', async () => {
    const audio = makeAudio(8192);
    const applicationData = Uint8Array.from([9, 8, 7, 6, 5]);
    const input = makeFlac({
      audio,
      comments: [{ key: 'TITLE', value: 'Old' }],
      extraBlocks: [{ type: 2, data: applicationData }]
    });

    const output = await updateBuffer(input, { title: 'New' });

    const blocks = extractBlocks(output);
    const application = blocks.find(block => block.type === 2);
    expect(application?.data).toEqual(applicationData);
    expect(extractAudio(output)).toEqual(audio);
  });

  it('writes multiple artists and album artists', async () => {
    const input = makeFlac();
    const output = await updateBuffer(input, {
      artists: ['Artist A', 'Artist B'],
      albumartists: ['Album Artist A', 'Album Artist B']
    });

    const result = await readTags(output);
    expect(result.common.artists).toEqual(['Artist A', 'Artist B']);
    expect(result.common.artist).toBe('Artist A');
    expect(result.common.albumartists).toEqual(['Album Artist A', 'Album Artist B']);
    expect(result.common.albumartist).toBe('Album Artist A');
  });

  it('writes and removes pictures', async () => {
    const picture = {
      format: 'image/jpeg',
      type: 'Cover (front)',
      description: 'front cover',
      data: Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])
    };

    const input = makeFlac();
    const withPicture = await updateBuffer(input, { picture: [picture] });
    const read = await readTags(withPicture);
    expect(read.pictures).toHaveLength(1);
    expect(read.pictures[0]?.format).toBe('image/jpeg');
    expect(read.pictures[0]?.type).toBe('Cover (front)');
    expect(read.pictures[0]?.data).toEqual(picture.data);

    const withoutPicture = await updateBuffer(withPicture, { picture: null });
    const removed = await readTags(withoutPicture);
    expect(removed.pictures).toHaveLength(0);
    expect(removed.common.picture).toBeUndefined();
  });

  it('lets a native picture override the common picture patch', async () => {
    const common = {
      format: 'image/jpeg',
      type: 'Cover (front)',
      description: 'common',
      data: Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])
    };
    const nativePicture = { ...common, description: 'native' };
    const nativeValue = Buffer.from(encodePicture(nativePicture)).toString('base64');

    const overridden = await updateBuffer(makeFlac(), {
      picture: [common],
      native: { METADATA_BLOCK_PICTURE: nativeValue }
    });
    const overriddenTags = await readTags(overridden);
    expect(overriddenTags.pictures).toHaveLength(1);
    expect(overriddenTags.pictures[0]?.description).toBe('native');
    const pictureBlocks = extractBlocks(overridden).filter(block => block.type === BlockType.PICTURE);
    expect(pictureBlocks).toHaveLength(1);
    expect(decodePicture(pictureBlocks[0]!.data).description).toBe('native');
    expect(vorbisValues(overriddenTags, 'METADATA_BLOCK_PICTURE')).toEqual([]);

    const removed = await updateBuffer(makeFlac(), {
      picture: [common],
      native: { METADATA_BLOCK_PICTURE: null }
    });
    const removedTags = await readTags(removed);
    expect(removedTags.pictures).toHaveLength(0);
    expect(removedTags.common.picture).toBeUndefined();

    const existing = await updateBuffer(makeFlac(), { picture: [common] });
    const nativeOnly = await updateBuffer(existing, { native: { METADATA_BLOCK_PICTURE: nativeValue } });
    const nativeOnlyTags = await readTags(nativeOnly);
    expect(nativeOnlyTags.pictures).toHaveLength(1);
    expect(nativeOnlyTags.pictures[0]?.description).toBe('native');

    const cleared = await updateBuffer(existing, { native: { METADATA_BLOCK_PICTURE: null } });
    expect((await readTags(cleared)).pictures).toHaveLength(0);
  });

  it('writes multiple case-insensitive native pictures as FLAC blocks without duplicate comments', async () => {
    const first = { format: 'image/png', description: 'front', data: Uint8Array.of(1, 2, 3), width: 32 };
    const second = { ...first, description: 'back', width: 64 };
    const values = [first, second].map(picture => Buffer.from(encodePicture(picture)).toString('base64'));
    const audio = makeAudio(1024);
    const input = makeFlac({
      audio,
      pictures: [first],
      comments: [{ key: 'METADATA_BLOCK_PICTURE', value: values[0]! }]
    });
    const output = await updateBuffer(input, {
      picture: null,
      native: { metadata_block_picture: values }
    });
    const blocks = extractBlocks(output).filter(block => block.type === BlockType.PICTURE);
    expect(blocks.map(block => decodePicture(block.data))).toEqual([
      expect.objectContaining({ description: 'front', width: 32, data: first.data }),
      expect.objectContaining({ description: 'back', width: 64, data: second.data })
    ]);
    const tags = await readTags(output);
    expect(tags.pictures).toHaveLength(2);
    expect(vorbisValues(tags, 'METADATA_BLOCK_PICTURE')).toEqual([]);
    expect(vorbisValues(tags, 'metadata_block_picture')).toEqual([]);
    expect(extractAudio(output)).toEqual(audio);
    expect(await updateBuffer(output, {})).toEqual(output);
  });

  it.each([null, []] as (null | string[])[])(
    'removes native and comment artwork with a native %j patch',
    async value => {
      const picture = { format: 'image/png', data: Uint8Array.of(1, 2, 3) };
      const input = makeFlac({
        pictures: [picture],
        comments: [{ key: 'METADATA_BLOCK_PICTURE', value: Buffer.from(encodePicture(picture)).toString('base64') }]
      });
      const output = await updateBuffer(input, { picture: [picture], native: { metadata_block_picture: value } });
      expect(extractBlocks(output).filter(block => block.type === BlockType.PICTURE)).toEqual([]);
      expect((await readTags(output)).pictures).toEqual([]);
    }
  );

  it.each([' ', '\t', '\n', '\r\n', '\f', '\v', ' \t\r\n'])(
    'accepts whitespace %j in native base64 artwork',
    async whitespace => {
      const picture = { format: 'image/png', description: 'wrapped', data: Uint8Array.of(1, 2, 3) };
      const encoded = encodePicture(picture);
      const base64 = Buffer.from(encoded).toString('base64');
      const value = whitespace + base64.match(/.{1,16}/g)!.join(whitespace) + whitespace;
      const output = await updateBuffer(makeFlac(), { native: { METADATA_BLOCK_PICTURE: value } });
      const blocks = extractBlocks(output).filter(block => block.type === BlockType.PICTURE);
      expect(blocks).toHaveLength(1);
      expect(blocks[0]!.data).toEqual(encoded);
      const tags = await readTags(output);
      expect(tags.pictures).toHaveLength(1);
      expect(tags.pictures[0]?.description).toBe('wrapped');
      expect(vorbisValues(tags, 'METADATA_BLOCK_PICTURE')).toEqual([]);
    }
  );

  it.each(['invalid-character', 'invalid-padding', 'truncated-picture', 'trailing-picture-data'])(
    'rejects %s in whitespace-wrapped native artwork',
    async kind => {
      const picture = encodePicture({ format: 'image/png', data: Uint8Array.of(1, 2, 3) });
      let base64 = Buffer.from(picture).toString('base64');
      if (kind === 'invalid-character') {
        base64 = `!${base64}`;
      }
      if (kind === 'invalid-padding') {
        base64 += '=';
      }
      if (kind === 'truncated-picture') {
        base64 = Buffer.from(picture.subarray(0, -1)).toString('base64');
      }
      if (kind === 'trailing-picture-data') {
        base64 = Buffer.concat([picture, Uint8Array.of(0)]).toString('base64');
      }
      await expect(
        updateBuffer(makeFlac(), { native: { METADATA_BLOCK_PICTURE: ` \n${base64}\r\n` } })
      ).rejects.toThrow('native.METADATA_BLOCK_PICTURE must contain valid base64 FLAC PICTURE data');
    }
  );

  it.each(['not base64!', Buffer.from(Uint8Array.of(1, 2, 3)).toString('base64')])(
    'rejects invalid native picture data %j',
    async value => {
      const input = makeFlac();
      const before = input.slice();
      await expect(updateBuffer(input, { native: { METADATA_BLOCK_PICTURE: value } })).rejects.toThrow(
        'native.METADATA_BLOCK_PICTURE must contain valid base64 FLAC PICTURE data'
      );
      expect(input).toEqual(before);
    }
  );

  it.each([0, 1])('bounds merged FLAC padding at the 24-bit limit (excess=%i)', async excess => {
    const sample = await readFile(
      new URL("./samples/flac/MusicBrainz - Beth Hart - Sinner's Prayer.flac", import.meta.url)
    );
    const audio = extractAudio(sample);
    const blocks = extractBlocks(sample).filter(block => block.type !== BlockType.PADDING);
    const paddedBlocks = [
      ...blocks,
      { type: BlockType.PADDING, data: new Uint8Array(0xfffffb) },
      { type: BlockType.PADDING, data: new Uint8Array(excess) }
    ];
    const encodedBlocks = paddedBlocks.flatMap((block, index) => {
      const header = new Uint8Array(4);
      BlockHeader.put(header, 0, {
        lastBlock: index === paddedBlocks.length - 1,
        type: block.type,
        length: block.data.length
      });
      return [header, block.data];
    });
    const input = Buffer.concat([Buffer.from('fLaC'), ...encodedBlocks, audio]);
    const output = await updateBuffer(input, {}, { padding: 128 });
    const padding = extractBlocks(output).filter(block => block.type === BlockType.PADDING);
    expect(padding.map(block => block.data.length)).toEqual([excess === 0 ? 0xffffff : 128]);
    expect(Buffer.from(extractAudio(output))).toEqual(Buffer.from(audio));
    expect((await readTags(output)).common.title).toBe((await readTags(sample)).common.title);
  });

  it('is idempotent with a fixed padding policy', async () => {
    const input = makeFlac({ comments: [{ key: 'TITLE', value: 'Old' }] });
    const options = { padding: 4096 };

    const once = await updateBuffer(input, { title: 'Same' }, options);
    const twice = await updateBuffer(once, { title: 'Same' }, options);

    expect(Buffer.from(twice).equals(Buffer.from(once))).toBe(true);
  });

  it('keeps audio offset stable when the new tag fits in existing padding', async () => {
    const input = makeFlac({ comments: [{ key: 'TITLE', value: 'Old' }], padding: 8192 });
    const output = await updateBuffer(input, { title: 'A slightly longer title' }, { padding: 8192 });

    expect(extractAudio(input)).toEqual(extractAudio(output));
    const inputBlocks = extractBlocks(input);
    const outputBlocks = extractBlocks(output);
    expect(inputBlocks.length).toBe(outputBlocks.length);
  });

  it('removes padding when padding is zero', async () => {
    const input = makeFlac({ padding: 4096 });
    const output = await updateBuffer(input, { title: 'No padding' }, { padding: 0 });
    const blocks = extractBlocks(output);
    expect(blocks.some(block => block.type === 1)).toBe(false);
  });

  it('rejects invalid FLAC input', async () => {
    await expect(updateBuffer(Uint8Array.from([1, 2, 3, 4, 5]), { title: 'x' })).rejects.toThrow();
  });

  it('rejects an ID3 tag without audio', async () => {
    const mp3 = Uint8Array.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0, 0, 0, 0]);
    await expect(updateBuffer(mp3, { title: 'x' })).rejects.toBeInstanceOf(UnsupportedFormatError);
  });
});

describe('FLAC file updates', () => {
  it('updates a file atomically and leaves no temporary file behind', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'music-metadata-editor-'));
    temporaryDirectories.push(directory);
    const filePath = path.join(directory, 'sample.flac');
    await writeFile(filePath, makeFlac({ comments: [{ key: 'TITLE', value: 'Old' }] }));

    const result = await updateFile(filePath, { title: 'New', artist: 'Someone' });

    expect(result.format).toBe('flac');
    expect(result.atomic).toBe(true);
    const metadata = await readTags(filePath);
    expect(metadata.common.title).toBe('New');
    expect(metadata.common.artist).toBe('Someone');

    const entries = await import('node:fs/promises').then(fs => fs.readdir(directory));
    expect(entries.filter(entry => entry.endsWith('.tmp'))).toHaveLength(0);
  });

  it('supports dry runs without touching the file', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'music-metadata-editor-'));
    temporaryDirectories.push(directory);
    const filePath = path.join(directory, 'sample.flac');
    const original = makeFlac({ comments: [{ key: 'TITLE', value: 'Old' }] });
    await writeFile(filePath, original);

    const result = await updateFile(filePath, { title: 'New' }, { dryRun: true });

    expect(result.bytesWritten).toBeGreaterThan(0);
    expect(await readFile(filePath)).toEqual(Buffer.from(original));
  });

  it('supports non-atomic writes', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'music-metadata-editor-'));
    temporaryDirectories.push(directory);
    const filePath = path.join(directory, 'sample.flac');
    const audio = makeAudio(4096);
    await writeFile(filePath, makeFlac({ audio, comments: [{ key: 'TITLE', value: 'Old' }] }));

    const result = await updateFile(filePath, { title: 'New' }, { atomic: false });

    expect(result.atomic).toBe(false);
    const metadata = await readTags(filePath);
    expect(metadata.common.title).toBe('New');
    expect(Buffer.from(extractAudio(await readFile(filePath))).equals(Buffer.from(audio))).toBe(true);
  });

  it('creates a backup when requested', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'music-metadata-editor-'));
    temporaryDirectories.push(directory);
    const filePath = path.join(directory, 'sample.flac');
    const original = makeFlac({ comments: [{ key: 'TITLE', value: 'Old' }] });
    await writeFile(filePath, original);

    await updateFile(filePath, { title: 'New' }, { backup: true });

    const backup = await readFile(`${filePath}.bak`);
    expect(backup).toEqual(Buffer.from(original));
    await stat(`${filePath}.bak`);
  });
});

describe('FLAC block headers', () => {
  it('round-trips the last-block flag, type and length', () => {
    const buffer = new Uint8Array(4);
    const next = BlockHeader.put(buffer, 0, {
      lastBlock: true,
      type: BlockType.PICTURE,
      length: 0x010203
    });

    expect(next).toBe(4);
    expect(Array.from(buffer)).toEqual([0x86, 0x01, 0x02, 0x03]);
    expect(BlockHeader.get(buffer, 0)).toEqual({
      lastBlock: true,
      type: BlockType.PICTURE,
      length: 0x010203
    });
  });

  it('decodes a non-final header', () => {
    const header = BlockHeader.get(Uint8Array.from([0x04, 0x00, 0x00, 0x22]), 0);
    expect(header).toEqual({
      lastBlock: false,
      type: BlockType.VORBIS_COMMENT,
      length: 0x22
    });
  });

  it('rejects lengths beyond the 24-bit field', () => {
    expect(() =>
      BlockHeader.put(new Uint8Array(4), 0, {
        lastBlock: false,
        type: BlockType.PADDING,
        length: 0x1000000
      })
    ).toThrow(RangeError);
  });

  it('rejects a truncated header', () => {
    expect(() => BlockHeader.get(new Uint8Array(3), 0)).toThrow(RangeError);
  });
});

describe('FLAC PICTURE codec', () => {
  const data = Uint8Array.from([0x89, 0x50, 0x4e, 0x47]);

  it('round-trips numeric picture types and dimensions', () => {
    const encoded = encodePicture({
      typeId: 3,
      format: 'image/png',
      description: 'front',
      width: 32,
      height: 16,
      colourDepth: 24,
      colours: 0,
      data
    });

    const picture = decodePicture(encoded);
    expect(picture).toEqual({
      typeId: 3,
      type: 'Cover (front)',
      format: 'image/png',
      description: 'front',
      width: 32,
      height: 16,
      colour_depth: 24,
      indexed_color: 0,
      colourDepth: 24,
      colours: 0,
      data
    });
  });

  it('preserves the legacy colour fields on encode', () => {
    const encoded = encodePicture({
      type: 'Cover (back)',
      format: 'image/jpeg',
      description: '',
      colour_depth: 8,
      indexed_color: 16,
      data
    });

    const picture = decodePicture(encoded);
    expect(picture.typeId).toBe(4);
    expect(picture.type).toBe('Cover (back)');
    expect(picture.colour_depth).toBe(8);
    expect(picture.indexed_color).toBe(16);
  });

  it('normalizes common MIME aliases', () => {
    expect(decodePicture(encodePicture({ format: 'jpg', data })).format).toBe('image/jpeg');
    expect(decodePicture(encodePicture({ format: 'JPEG', data })).format).toBe('image/jpeg');
    expect(decodePicture(encodePicture({ format: 'png', data })).format).toBe('image/png');
    expect(decodePicture(encodePicture({ format: 'image/gif', data })).format).toBe('image/gif');
  });

  it('maps unknown picture types to Other when encoding from a name', () => {
    const encoded = encodePicture({ type: 'Unknown', format: 'image/png', data });
    expect(decodePicture(encoded).typeId).toBe(0);
    expect(pictureTypeToNumber(undefined)).toBe(0);
    expect(pictureTypeToNumber('Cover (front)')).toBe(3);
  });

  it('rejects truncated field lengths', () => {
    const encoded = encodePicture({ format: 'image/png', description: 'description', data });
    encoded[7] = 0xff;
    encoded[8] = 0xff;
    encoded[9] = 0xff;
    encoded[10] = 0xff;
    expect(() => decodePicture(encoded)).toThrow(RangeError);
  });

  it('rejects trailing bytes when exact data is required', () => {
    const encoded = encodePicture({ format: 'image/png', data });
    const withTrailing = new Uint8Array(encoded.length + 1);
    withTrailing.set(encoded);
    expect(() => decodePicture(withTrailing, 0, { requireExactData: true })).toThrow(RangeError);
    expect(decodePicture(withTrailing).data).toEqual(data);
  });
});

describe('shared picture type table', () => {
  it('matches the ID3v2 attached-picture table', () => {
    expect(PICTURE_TYPES).toEqual(Object.values(AttachedPictureType));
  });
});

describe('picture ownership', () => {
  it('copies artwork from a Node Buffer', () => {
    const input = Buffer.from(encodePicture({ format: 'png', data: Uint8Array.of(1, 2, 3) }));
    const picture = decodePicture(input);
    input.fill(0);
    expect(Array.from(picture.data)).toEqual([1, 2, 3]);
  });
});

describe('competing FLAC tag families', () => {
  it('falls back to preserved ID3 after Vorbis deletion and prevents fallback when stripped', async () => {
    const frame = encodeFrame({ id: 'TIT2', flags: 0, data: Buffer.from('\x03Stale prefix title') });
    const prefix = Buffer.concat([makeId3Prefix(frame.length).subarray(0, 10), frame]);
    const input = makeFlac({ id3Prefix: prefix, comments: [{ key: 'TITLE', value: 'Vorbis title' }] });
    expect((await readTags(input)).common.title).toBe('Vorbis title');
    const preserved = await updateBuffer(input, { title: null });
    expect(Buffer.from(preserved.subarray(0, prefix.length)).equals(prefix)).toBe(true);
    expect(extractAudio(preserved)).toEqual(extractAudio(input));
    const fallback = await readTags(preserved);
    expect(vorbisValues(fallback, 'TITLE')).toEqual([]);
    expect(fallback.common.title).toBe('Stale prefix title');
    expect(fallback.native['ID3v2.4']).toContainEqual({ id: 'TIT2', value: 'Stale prefix title' });
    const stripped = await updateBuffer(input, { title: null }, { stripFlacId3: true });
    expect(Buffer.from(stripped.subarray(0, 4)).toString()).toBe('fLaC');
    expect(extractAudio(stripped)).toEqual(extractAudio(input));
    const deleted = await readTags(stripped);
    expect(deleted.common.title).toBeUndefined();
    expect(deleted.native['ID3v2.4']).toBeUndefined();
    expect(vorbisValues(deleted, 'TITLE')).toEqual([]);
  });
});
