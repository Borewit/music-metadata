import { readFile } from 'node:fs/promises';
import { MetadataCollector } from '../lib/common/MetadataCollector.js';
import { parseBuffer, updateBuffer } from '../lib/index.js';

describe('Normalized common artist accessors', () => {
  it('returns undefined when neither field is present', () => {
    const common = new MetadataCollector().toCommonMetadata().common;
    expect(common.getArtist()).toBeUndefined();
    expect(common.getArtists()).toBeUndefined();
    expect(common).toEqual({});
  });

  it('falls back to the credit without adding a stored list or splitting names', () => {
    const common = new MetadataCollector().common;
    common.artist = 'A feat. B';
    expect(common.getArtist()).toBe('A feat. B');
    expect(common.getArtists()).toEqual(['A feat. B']);
    expect(common.artists).toBeUndefined();
  });

  it.each([
    [['A'], 'A'],
    [['A', 'B'], 'A & B'],
    [['A', 'B', 'C'], 'A, B & C']
  ])('derives a display credit from %j', (artists, credit) => {
    const common = new MetadataCollector().common;
    common.artists = artists as string[];
    expect(common.getArtist()).toBe(credit);
    expect(common.getArtists()).toEqual(artists);
    expect(common.artist).toBeUndefined();
  });

  it('prefers each corresponding field and reflects edits and removals', () => {
    const common = new MetadataCollector().common;
    common.artist = 'Display credit';
    common.artists = ['A', 'B'];
    expect(common.getArtist()).toBe('Display credit');
    expect(common.getArtists()).toEqual(['A', 'B']);
    common.artists.push('C');
    delete common.artist;
    expect(common.getArtist()).toBe('A, B & C');
    delete common.artists;
    expect(common.getArtist()).toBeUndefined();
    expect(common.getArtists()).toBeUndefined();
  });

  it('handles empty values without manufacturing a credit', () => {
    const common = new MetadataCollector().common;
    common.artists = [];
    expect(common.getArtist()).toBeUndefined();
    expect(common.getArtists()).toEqual([]);
    common.artist = '';
    delete common.artists;
    expect(common.getArtist()).toBe('');
    expect(common.getArtists()).toEqual(['']);
  });

  it.each([
    ['TPE1', 'ARTISTS', 'artist', 'artists'],
    ['TPE2', 'ALBUMARTISTS', 'albumArtist', 'albumArtists']
  ] as const)('rebuilds repeated %s lists when a higher-priority group arrives', async (tag, listTag, credit, list) => {
    const collector = new MetadataCollector();
    await collector.addTag('ID3v2.3', tag, 'Old first');
    await collector.addTag('ID3v2.3', tag, 'Old second');
    expect(collector.common[list]).toEqual(['Old first', 'Old second']);

    await collector.addTag('ID3v2.4', tag, 'New first');
    expect(collector.common[credit]).toBe('New first');
    expect(collector.common[list]).toBeUndefined();
    await collector.addTag('ID3v2.4', tag, 'New second');
    await collector.addTag('ID3v2.3', tag, 'Old third');
    expect(collector.common[list]).toEqual(['New first', 'New second']);

    const withNativeList = new MetadataCollector();
    await withNativeList.addTag('ID3v2.3', tag, 'Old first');
    await withNativeList.addTag('ID3v2.3', tag, 'Old second');
    await withNativeList.addTag('vorbis', listTag, 'Explicit name');
    await withNativeList.addTag('ID3v2.4', tag, 'New first');
    await withNativeList.addTag('ID3v2.4', tag, 'New second');
    expect(withNativeList.common[credit]).toBe('New first');
    expect(withNativeList.common[list]).toEqual(['Explicit name']);
  });

  it('keeps methods out of enumeration, copies and JSON', () => {
    const common = new MetadataCollector().common;
    common.artist = 'A';
    expect(Object.keys(common)).toEqual(['artist']);
    expect({ ...common }).toEqual({ artist: 'A' });
    expect(JSON.stringify(common)).toBe('{"artist":"A"}');
  });

  it('exposes accessors after parsing and accepts common tags as a writer patch', async () => {
    const sample = await readFile(new URL('samples/flac/Lavf.flac', import.meta.url));
    const written = await updateBuffer(sample, { native: { ARTIST: ['A feat. B'] } });
    const { common } = await parseBuffer(written, 'audio/flac');
    expect(common.getArtist()).toBe('A feat. B');
    expect(common.getArtists()).toEqual(['A feat. B']);
    expect(common.artists).toBeUndefined();
    const roundTrip = await parseBuffer(await updateBuffer(written, common), 'audio/flac');
    expect(roundTrip.common.getArtists()).toEqual(['A feat. B']);
    expect(roundTrip.common.artists).toBeUndefined();
  });
});
