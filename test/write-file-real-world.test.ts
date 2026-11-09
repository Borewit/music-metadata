import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseBuffer, updateBuffer } from '../lib/index.js';
import { extractAudio } from './helpers/flac.js';
import { readTags } from './helpers/read.js';

const samplesDirectory = process.env.MUSIC_METADATA_SAMPLES ?? path.resolve(import.meta.dirname, 'samples/flac');

const hasSamples = await pathExists(samplesDirectory);

describe.skipIf(!hasSamples)('real-world FLAC samples', () => {
  it('round-trips Vorbis tags and preserves the audio payload', async () => {
    const files = (await readdir(samplesDirectory)).filter(name => name.toLowerCase().endsWith('.flac')).sort();

    expect(files.length).toBeGreaterThan(0);

    let checked = 0;
    for (const file of files) {
      const input = await readFile(path.join(samplesDirectory, file));
      if (!looksLikeFlac(input)) {
        continue;
      }
      checked++;
      const before = vorbisFields((await readTags(input)).native);

      const title = `music-metadata-editor: ${file}`;
      const output = await updateBuffer(input, { title, comment: 'round-trip test' });

      const after = vorbisFields((await readTags(output)).native);
      expect(after.TITLE, file).toEqual([title]);
      expect(Buffer.from(extractAudio(output)).equals(Buffer.from(extractAudio(input))), file).toBe(true);

      const parsed = await parseBuffer(output, { mimeType: 'audio/flac' });
      expect(vorbisFields(parsed.native).TITLE, file).toEqual([title]);

      // Existing values that were not part of the patch must survive.
      if (before.ARTIST !== undefined) {
        expect(after.ARTIST, file).toEqual(before.ARTIST);
      }
      if (before.ALBUM !== undefined) {
        expect(after.ALBUM, file).toEqual(before.ALBUM);
      }
    }

    expect(checked).toBeGreaterThan(0);
  }, 120_000);
});

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function vorbisFields(native: Record<string, readonly { id: string; value: unknown }[]>): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const tag of native.vorbis ?? []) {
    if (typeof tag.value === 'string') {
      (fields[tag.id] ??= []).push(tag.value);
    }
  }
  return fields;
}

function looksLikeFlac(data: Uint8Array): boolean {
  if (data[0] === 0x66 && data[1] === 0x4c && data[2] === 0x61 && data[3] === 0x43) {
    return true;
  }
  if (data[0] !== 0x49 || data[1] !== 0x44 || data[2] !== 0x33 || data.length < 10) {
    return false;
  }
  const size = ((data[6]! & 0x7f) << 21) | ((data[7]! & 0x7f) << 14) | ((data[8]! & 0x7f) << 7) | (data[9]! & 0x7f);
  const footer = data[3]! >= 4 && (data[5]! & 0x10) !== 0 ? 10 : 0;
  const offset = 10 + size + footer;
  return data[offset] === 0x66 && data[offset + 1] === 0x4c && data[offset + 2] === 0x61 && data[offset + 3] === 0x43;
}
