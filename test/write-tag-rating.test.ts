import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { orderTags, parseBuffer, updateBuffer } from '../lib/index.js';
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

const fixtures = [
  "mp3/MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.4].V2.mp3",
  "flac/MusicBrainz - Beth Hart - Sinner's Prayer.flac",
  'ogg/generated-vorbis.ogg',
  'ogg/generated-opus.opus',
  'wav'
];
// Read the written bytes with the consumer's parser, not the editor's read API.
async function commonRatings(data: Uint8Array) {
  return (await parseBuffer(data)).common.rating;
}

async function fixtureData(file: string): Promise<Uint8Array> {
  return file === 'wav' ? wav() : readFile(new URL(`./samples/${file}`, import.meta.url));
}

describe.each(fixtures)('common rating round trips: %s', file => {
  async function assertNativeRatings(data: Uint8Array, ratings: { source?: string; rating: number }[]) {
    if (file !== fixtures[0] && file !== 'wav') {
      return;
    }
    const metadata = await parseBuffer(data);
    const popm = metadata.native['ID3v2.4']?.filter(tag => tag.id === 'POPM').map(tag => tag.value) ?? [];
    expect(popm).toEqual(
      ratings.map(value =>
        expect.objectContaining({
          email: value.source ?? '',
          // Match the common-to-POPM mapping in src/mapping/id3v2.ts exactly.
          rating: Math.round(value.rating * 254) + 1
        })
      )
    );
  }

  it.each([undefined, 'dopamine'])('writes normalized steps with source %s, preserves and deletes', async source => {
    let data = await fixtureData(file);
    for (let step = 0; step <= 10; step++) {
      data = await updateBuffer(data, { rating: [{ ...(source === undefined ? {} : { source }), rating: step / 10 }] });
      const assertRating = async () => {
        const ratings = await commonRatings(data);
        expect(ratings).toHaveLength(1);
        // ID3 POPM represents an unspecified owner as an empty string.
        const expectedSource = source ?? (file === fixtures[0] || file === 'wav' ? '' : undefined);
        expect(ratings![0]!.source).toBe(expectedSource);
        // POPM quantizes to 254 intervals; Vorbis comments retain the decimal.
        expect(ratings![0]!.rating).toBeCloseTo(step / 10, 2);
        await assertNativeRatings(data, [{ ...(source === undefined ? {} : { source }), rating: step / 10 }]);
      };
      await assertRating();
      data = await updateBuffer(data, { title: 'Unrelated change' });
      await assertRating();
    }
    data = await updateBuffer(data, { rating: null });
    expect(await commonRatings(data)).toBeUndefined();
    await assertNativeRatings(data, []);
  });

  it('reads multiple sources through common.rating and replaces the whole rating list', async () => {
    let data = await updateBuffer(await fixtureData(file), {
      rating: [
        { source: 'dopamine', rating: 0.2 },
        { source: 'other', rating: 0.8 }
      ]
    });
    for (const unrelatedEdit of [false, true]) {
      if (unrelatedEdit) {
        data = await updateBuffer(data, { album: 'Keep ratings' });
      }
      const ratings = await commonRatings(data);
      expect(ratings).toHaveLength(2);
      expect(ratings!.map(value => value.source).sort()).toEqual(['dopamine', 'other']);
      expect(ratings!.find(value => value.source === 'dopamine')!.rating).toBeCloseTo(0.2, 2);
      expect(ratings!.find(value => value.source === 'other')!.rating).toBeCloseTo(0.8, 2);
      await assertNativeRatings(data, [
        { source: 'dopamine', rating: 0.2 },
        { source: 'other', rating: 0.8 }
      ]);
    }
    data = await updateBuffer(data, { rating: [{ source: 'replacement', rating: 0.6 }] });
    const ratings = await commonRatings(data);
    expect(ratings).toHaveLength(1);
    expect(ratings![0]!.source).toBe('replacement');
    expect(ratings![0]!.rating).toBeCloseTo(0.6, 2);
    await assertNativeRatings(data, [{ source: 'replacement', rating: 0.6 }]);
    data = await updateBuffer(data, { rating: [] });
    expect(await commonRatings(data)).toBeUndefined();
    await assertNativeRatings(data, []);
  });
});

it('rejects common rating writes for MP4, which has no writable common rating mapping', async () => {
  const input = await readFile(new URL('./samples/mp4/aac-faststart.m4a', import.meta.url));
  await expect(updateBuffer(input, { rating: [{ source: 'dopamine', rating: 0.5 }] })).rejects.toThrow(
    'MP4 common field is not writable: rating'
  );
});

// Supplementary native interoperability checks; these are not common rating round trips.
it('preserves native POPM owner and counter for all Dopamine half-star bytes', async () => {
  let data: Uint8Array = await readFile(new URL(`./samples/${fixtures[0]}`, import.meta.url));
  for (const rating of [0, 13, 1, 54, 64, 118, 128, 186, 196, 242, 255]) {
    const frames = [
      { email: 'Windows Media Player 9 Series', rating, counter: 1234 },
      { email: 'other', rating: 64, counter: 99 }
    ];
    data = await updateBuffer(data, { native: { POPM: frames } });
    data = await updateBuffer(data, { album: 'Keep ratings' });
    expect((await readTags(data)).native['ID3v2.4']?.filter(tag => tag.id === 'POPM').map(tag => tag.value)).toEqual(
      frames
    );
  }
});

it('preserves MP4 application ratings as native-only freeform metadata', async () => {
  let data: Uint8Array = await readFile(new URL('./samples/mp4/aac-faststart.m4a', import.meta.url));
  const key = '----:com.apple.iTunes:DOPAMINE_RATING';
  for (let rating = 0; rating <= 10; rating++) {
    data = await updateBuffer(data, { native: { [key]: String(rating) } });
    data = await updateBuffer(data, { title: 'Keep rating' });
    expect(orderTags((await readTags(data)).native.iTunes ?? [])[key]?.[0]).toBe(String(rating));
  }
  data = await updateBuffer(data, { native: { [key]: null } });
  expect(orderTags((await readTags(data)).native.iTunes ?? [])[key]).toBeUndefined();
});
