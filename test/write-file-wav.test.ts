import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseBuffer, updateBuffer, updateFile } from '../lib/index.js';
import { readTags } from './helpers/read.js';

function chunk(id: string, data: Buffer, pad = 0) {
  const header = Buffer.alloc(8);
  header.write(id);
  header.writeUInt32LE(data.length, 4);
  return Buffer.concat([header, data, ...(data.length % 2 ? [Buffer.from([pad])] : [])]);
}
function wav(extra: Buffer[] = []) {
  const fmt = Buffer.alloc(16);
  fmt.writeUInt16LE(1, 0);
  fmt.writeUInt16LE(1, 2);
  fmt.writeUInt32LE(8000, 4);
  fmt.writeUInt32LE(16000, 8);
  fmt.writeUInt16LE(2, 12);
  fmt.writeUInt16LE(16, 14);
  const body = Buffer.concat([
    Buffer.from('WAVE'),
    chunk('fmt ', fmt),
    chunk('JUNK', Buffer.from('odd'), 127),
    ...extra,
    chunk('data', Buffer.alloc(1600, 42))
  ]);
  const header = Buffer.alloc(8);
  header.write('RIFF');
  header.writeUInt32LE(body.length, 4);
  return Buffer.concat([header, body]);
}
function chunks(data: Uint8Array) {
  const buffer = Buffer.from(data);
  const result: { id: string; bytes: Buffer; data: Buffer }[] = [];
  for (let p = 12; p < buffer.readUInt32LE(4) + 8; ) {
    const size = buffer.readUInt32LE(p + 4);
    const end = p + 8 + size + (size % 2);
    result.push({
      id: buffer.toString('ascii', p, p + 4),
      bytes: buffer.subarray(p, end),
      data: buffer.subarray(p + 8, p + 8 + size)
    });
    p = end;
  }
  return result;
}

describe('WAV ID3v2.4 writing', () => {
  it('round-trips tags, preserves audio/unknown chunks/padding/trailers and is idempotent', async () => {
    const input = wav();
    const original = Buffer.from(input);
    const source = Buffer.concat([input, Buffer.from('trailer')]);
    const patch = {
      title: '音楽',
      artists: ['A', 'B'],
      track: { no: 2, of: 9 },
      lyrics: 'Lyrics',
      picture: [{ format: 'image/png', type: 'Cover (front)', data: Buffer.from('image') }],
      native: { 'TXXX:PRIVATE': 'keep' }
    };
    const output = await updateBuffer(source, patch, { padding: 0 });
    const metadata = await parseBuffer(output, { mimeType: 'audio/wav' });
    expect(metadata.common.title).toBe('音楽');
    expect(Buffer.from(metadata.common.picture![0]!.data)).toEqual(Buffer.from('image'));
    expect(metadata.common.artists).toEqual(['A', 'B']);
    expect(metadata.common.track).toEqual({ no: 2, of: 9 });
    expect(
      chunks(output)
        .filter(c => c.id !== 'id3 ')
        .map(c => c.bytes)
    ).toEqual(chunks(input).map(c => c.bytes));
    expect(chunks(output).find(c => c.id === 'id3 ')!.data[3]).toBe(4);
    expect(Buffer.from(output).subarray(-7).toString()).toBe('trailer');
    expect(input).toEqual(original);
    expect(await updateBuffer(output, patch, { padding: 0 })).toEqual(output);
    const deleted = await updateBuffer(output, { title: null, lyrics: null, picture: null });
    const after = await parseBuffer(deleted, { mimeType: 'audio/wav' });
    expect(after.common.title).toBeUndefined();
    expect(after.common.picture).toBeUndefined();
    expect(after.native['ID3v2.4']!.some(t => t.id === 'TXXX:PRIVATE')).toBe(true);
  });

  it('applies the shared lyrics shapes and clearing semantics', async () => {
    const synchronized = {
      language: 'zho',
      descriptor: '原文',
      text: '第一行',
      contentType: 1,
      timeStampFormat: 2,
      syncText: [{ text: '第一行', timestamp: 1250 }]
    } as const;
    const both = await updateBuffer(wav(), { lyrics: synchronized });
    const bothMetadata = await parseBuffer(both, { mimeType: 'audio/wav' });
    expect(bothMetadata.native['ID3v2.4']?.filter(tag => tag.id === 'USLT')).toHaveLength(1);
    expect(bothMetadata.native['ID3v2.4']?.filter(tag => tag.id === 'SYLT')).toHaveLength(1);

    const textOnly = await updateBuffer(both, { lyrics: 'Plain' });
    const textMetadata = await parseBuffer(textOnly, { mimeType: 'audio/wav' });
    expect(textMetadata.native['ID3v2.4']?.filter(tag => tag.id === 'USLT')).toHaveLength(1);
    expect(textMetadata.native['ID3v2.4']?.some(tag => tag.id === 'SYLT')).toBe(false);
    expect(textMetadata.common.lyrics?.[0]?.language).toBe('eng');

    for (const value of ['', [], null] as const) {
      const cleared = await updateBuffer(both, { lyrics: value });
      const metadata = await parseBuffer(cleared, { mimeType: 'audio/wav' });
      expect((metadata.native['ID3v2.4'] ?? []).some(tag => tag.id === 'USLT' || tag.id === 'SYLT')).toBe(false);
    }
  });

  it('replaces uppercase legacy chunks only with explicit opt-in', async () => {
    const legacy = Buffer.from([73, 68, 51, 3, 0, 0, 0, 0, 0, 0]);
    const input = wav([chunk('ID3 ', legacy)]);
    await expect(updateBuffer(input, { title: 'New' })).rejects.toThrow('Only ID3v2.4');
    const output = await updateBuffer(input, { title: 'New' }, { replaceId3: true });
    expect(chunks(output).filter(c => c.id.toLowerCase() === 'id3 ')).toHaveLength(1);
    expect((await parseBuffer(output, { mimeType: 'audio/wav' })).common.title).toBe('New');
  });

  it('supports atomic file writes, backup, dry run and delegated reads', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'wav-editor-'));
    try {
      const target = path.join(dir, 'test.wav');
      const input = wav();
      await writeFile(target, input);
      const dry = await updateFile(target, { title: 'New' }, { dryRun: true });
      expect(await readFile(target)).toEqual(input);
      const result = await updateFile(target, { title: 'New' }, { backup: true });
      expect(result.format).toBe('wav');
      expect(result.atomic).toBe(true);
      expect(result.bytesWritten).toBe(dry.bytesWritten);
      expect(await readFile(`${target}.bak`)).toEqual(input);
      expect((await readTags(target)).common.title).toBe('New');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects truncated containers, invalid chunk sizes and duplicate tags', async () => {
    const input = wav();
    await expect(updateBuffer(input.subarray(0, -1), {})).rejects.toThrow();
    const broken = Buffer.from(input);
    broken.writeUInt32LE(0xffffffff, 16);
    await expect(updateBuffer(broken, {})).rejects.toThrow('chunk exceeds');
    const tag = Buffer.from([73, 68, 51, 4, 0, 0, 0, 0, 0, 0]);
    await expect(updateBuffer(wav([chunk('id3 ', tag), chunk('ID3 ', tag)]), {})).rejects.toThrow('Multiple');
    await expect(updateBuffer(wav([chunk('id3 ', Buffer.from('invalid'))]), {})).rejects.toThrow('Invalid WAV ID3');
  });
});
