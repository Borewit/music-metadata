import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import * as browserRoot from '../lib/core.js';
import { updateBuffer } from '../lib/core.js';
import {
  type IAudioMetadata,
  type IPicture,
  parseBlob,
  parseBuffer,
  updateBuffer as updateNodeBuffer
} from '../lib/index.js';
import { syncSafe } from '../lib/write/id3v2/frames.js';
import { makeFlac } from './helpers/flac.js';

interface ReadTags {
  format: string;
  common: IAudioMetadata['common'];
  native: IAudioMetadata['native'];
  pictures: IPicture[];
}

async function readTags(input: Uint8Array | Blob): Promise<ReadTags> {
  const metadata: IAudioMetadata = input instanceof Blob ? await parseBlob(input) : await parseBuffer(input);
  const container = metadata.format.container?.toLowerCase() ?? '';
  let format = container;
  if (/^(m4a|m4b|mp4|isom|iso2|mp42)(\/|$)/.test(container)) {
    format = 'mp4';
  } else if (container.includes('flac')) {
    format = 'flac';
  } else if (container === 'mpeg' || container.includes('mpeg') || container === 'mp3') {
    format = 'mp3';
  }
  return {
    format,
    common: metadata.common,
    native: metadata.native,
    pictures: metadata.common.picture ? [...metadata.common.picture] : []
  };
}

function toBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes] as any);
}

const mp3Fixture = "test/samples/mp3/MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.4].V2.mp3";

async function loadMp3(): Promise<Uint8Array> {
  return new Uint8Array(await readFile(mp3Fixture));
}

describe('browser root entry', () => {
  it('exports buffer writing without Node file writing', () => {
    expect(browserRoot.updateBuffer).toBeTypeOf('function');
    expect(browserRoot).not.toHaveProperty('updateFile');
  });
  it('round-trips tags from a Blob input', async () => {
    const flac = makeFlac({ comments: [{ key: 'TITLE', value: 'Original' }] });
    const blob = toBlob(flac);

    const before = await readTags(blob);
    expect(before.common.title).toBe('Original');

    const updated = await updateBuffer(blob, { title: 'Updated' });
    expect(updated).toBeInstanceOf(Uint8Array);

    const after = await readTags(updated);
    expect(after.common.title).toBe('Updated');
  });

  it('round-trips tags from a Uint8Array input', async () => {
    const flac = makeFlac({ comments: [{ key: 'TITLE', value: 'Original' }] });

    const before = await readTags(flac);
    expect(before.common.title).toBe('Original');

    const updated = await updateBuffer(flac, { title: 'Updated' });
    expect(updated).toBeInstanceOf(Uint8Array);

    const after = await readTags(updated);
    expect(after.common.title).toBe('Updated');
  });

  it('reads MP3 tags from a Blob input', async () => {
    const mp3 = await loadMp3();
    const blob = toBlob(mp3);

    const tags = await readTags(blob);
    expect(tags.format).toBe('mp3');
    expect(tags.common.title).toBe("Sinner's Prayer");
    expect(tags.common.artists).toEqual(['Beth Hart', 'Joe Bonamassa']);
  });

  it('updates MP3 tags from a Uint8Array input', async () => {
    const mp3 = await loadMp3();

    const updated = await updateBuffer(mp3, { title: 'Browser Test' });
    const after = await readTags(updated);
    expect(after.common.title).toBe('Browser Test');
  });
});

describe('browser ADTS AAC writing', () => {
  it.each(['Uint8Array', 'Blob'])('writes and clears AAC tags from a %s without modifying its input', async kind => {
    const original = new Uint8Array(await readFile('test/samples/aac/adts-mpeg4-2.aac'));
    const snapshot = original.slice();
    const source = kind === 'Blob' ? toBlob(original) : original;
    const updated = await updateBuffer(source, { title: 'Browser AAC', artist: 'AAC artist' }, { padding: 0 });
    const before = await parseBuffer(original, undefined, { duration: true });
    const after = await parseBuffer(updated, undefined, { duration: true });
    expect(after.format).toEqual({
      ...before.format,
      tagTypes: ['ID3v2.4'],
      overallBitrate: (8 * updated.length) / before.format.duration!
    });
    expect(updated.subarray(10 + syncSafe(updated, 6))).toEqual(original);
    expect(after.common.title).toBe('Browser AAC');
    expect(after.common.artist).toBe('AAC artist');
    expect(original).toEqual(snapshot);
    if (source instanceof Blob) {
      expect(new Uint8Array(await source.arrayBuffer())).toEqual(snapshot);
    }
    const cleared = await updateBuffer(toBlob(updated), { title: null }, { padding: 0 });
    const tags = await parseBuffer(cleared);
    expect(tags.common.title).toBeUndefined();
    expect(tags.common.artist).toBe('AAC artist');
    expect(cleared.subarray(10 + syncSafe(cleared, 6))).toEqual(original);
  });

  it('explicitly replaces legacy AAC ID3 tags from a Blob', async () => {
    const original = new Uint8Array(await readFile('test/samples/aac/id3v23-mpeg2.aac'));
    const before = await parseBuffer(original);
    const source = toBlob(original);
    const updated = await updateBuffer(source, { ...before.common, title: 'Browser legacy AAC' }, { replaceId3: true });
    const after = await parseBuffer(updated);
    expect(after.format.container).toBe('ADTS/MPEG-2');
    expect(after.format.tagTypes).toEqual(['ID3v2.4']);
    expect(after.common.title).toBe('Browser legacy AAC');
    expect(after.common.artist).toBe(before.common.artist);
    expect(updated.subarray(10 + syncSafe(updated, 6))).toEqual(original.subarray(10 + syncSafe(original, 6), -128));
    expect(new Uint8Array(await source.arrayBuffer())).toEqual(original);
  });
});

// One chunk plan must produce identical bytes through each public buffer entry.
describe('Node/browser writer parity', () => {
  it.each([
    mp3Fixture,
    'test/samples/aac/adts-mpeg4-2.aac',
    "test/samples/flac/MusicBrainz - Beth Hart - Sinner's Prayer.flac",
    'test/samples/wav/pcm16-fact.wav',
    'test/samples/mp4/aac-faststart.m4a',
    'test/samples/ogg/generated-vorbis.ogg',
    'test/samples/ogg/generated-opus.opus'
  ])('shares patch and deletion behavior for %s', async fixture => {
    const input = new Uint8Array(await readFile(fixture));
    const snapshot = input.slice();
    const patch = { title: 'Shared writer', artist: 'Parity artist', track: { no: 2, of: 7 } };
    const options = {};
    const expected = await updateNodeBuffer(input, patch, options);
    expect(await updateBuffer(input, patch, options)).toEqual(expected);
    expect(await updateBuffer(toBlob(input), patch, options)).toEqual(expected);
    const tags = await parseBuffer(expected);
    expect(tags.common.title).toBe(patch.title);
    expect(tags.common.artist).toBe(patch.artist);
    expect(tags.common.track).toEqual(patch.track);
    const cleared = await updateNodeBuffer(expected, { title: null }, options);
    expect(await updateBuffer(toBlob(expected), { title: null }, options)).toEqual(cleared);
    expect((await parseBuffer(cleared)).common.title).toBeUndefined();
    expect(input).toEqual(snapshot);
  });
});
