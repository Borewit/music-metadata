import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import * as browserRoot from '../lib/core.js';
import { updateBuffer } from '../lib/core.js';
import { type IAudioMetadata, type IPicture, parseBlob, parseBuffer } from '../lib/index.js';
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
