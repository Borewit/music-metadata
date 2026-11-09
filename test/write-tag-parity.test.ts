import { createHash } from 'node:crypto';
import fs, { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  type ICommonTagsResult,
  InvalidPatchError,
  parseBuffer,
  type TagPatch,
  updateBuffer,
  updateFile
} from '../lib/index.js';
import * as sourceModule from '../lib/write/core/source.js';
import { COMMON_FIELDS } from '../lib/write/mapping/common.js';
import { makeFlac } from './helpers/flac.js';
import { readTags } from './helpers/read.js';

describe('music-metadata read-back', () => {
  it('writes tags that music-metadata maps to common fields', async () => {
    const input = makeFlac();
    const output = await updateBuffer(input, {
      title: 'Parity title',
      artist: 'Display artist',
      artists: ['Artist A', 'Artist B'],
      albumartist: 'Display album artist',
      albumartists: ['Album Artist A', 'Album Artist B'],
      album: 'Parity album',
      date: '2025-06-01',
      originaldate: '1999-01-01',
      genre: ['Jazz', 'Fusion'],
      comment: 'Parity comment',
      composer: ['Composer A', 'Composer B'],
      track: { no: 4, of: 12 },
      disk: { no: 1, of: 2 },
      musicbrainz_recordingid: 'recording-id',
      musicbrainz_trackid: 'release-track-id',
      musicbrainz_albumid: 'album-id',
      musicbrainz_artistid: ['artist-id-1', 'artist-id-2'],
      musicbrainz_albumartistid: ['album-artist-id'],
      musicbrainz_releasegroupid: 'release-group-id',
      musicbrainz_workid: 'work-id'
    });

    const parsed = await parseBuffer(output, { mimeType: 'audio/flac' });
    const common = parsed.common;

    expect(common.title).toBe('Parity title');
    // Preserve the display artist independently of the individual artist list.
    expect(common.artist).toBe('Display artist');
    expect(common.artists).toEqual(['Artist A', 'Artist B']);
    expect(common.albumartist).toBe('Album Artist A');
    expect(common.albumartists).toEqual(['Album Artist A', 'Album Artist B']);
    expect(common.album).toBe('Parity album');
    expect(common.date).toBe('2025-06-01');
    expect(common.originaldate).toBe('1999-01-01');
    expect(common.genre).toEqual(['Jazz', 'Fusion']);
    expect(common.comment?.map(comment => comment.text)).toEqual(['Parity comment']);
    expect(common.composer).toEqual(['Composer A', 'Composer B']);
    expect(common.track).toEqual({ no: 4, of: 12 });
    expect(common.disk).toEqual({ no: 1, of: 2 });
    expect(common.musicbrainz_recordingid).toBe('recording-id');
    expect(common.musicbrainz_trackid).toBe('release-track-id');
    expect(common.musicbrainz_albumid).toBe('album-id');
    expect(common.musicbrainz_artistid).toEqual(['artist-id-1', 'artist-id-2']);
    expect(common.musicbrainz_albumartistid).toEqual(['album-artist-id']);
    expect(common.musicbrainz_releasegroupid).toBe('release-group-id');
    expect(common.musicbrainz_workid).toBe('work-id');

    const viaEditor = await readTags(output);
    expect(viaEditor.common).toEqual(common);
    expect(viaEditor.native).toEqual(parsed.native);
    expect(viaEditor.pictures).toEqual(parsed.common.picture ?? []);
  });
});

// Compile-time regression: every reader result must be a valid patch without a cast.
const acceptsCommonTags = (common: ICommonTagsResult): TagPatch => common;
void acceptsCommonTags;

// Lyrics may be supplied as a string, one entry or an array of entries.
const singleLyricsEntry: TagPatch = { lyrics: { text: 'Words' } };
const lyricsEntryArray: TagPatch = { lyrics: [{ text: 'Words', language: 'zho' }] };
void singleLyricsEntry;
void lyricsEntryArray;

// Adding a common field upstream makes this fixture fail compilation until a value is tested.
const fullCommon = {
  track: {
    no: 2,
    of: 12
  },
  disk: {
    no: 2,
    of: 12
  },
  year: 2026,
  title: 'Example',
  artist: 'Example',
  artists: ['Example A', 'Example B'],
  albumartist: 'Example',
  albumartists: ['Example A', 'Example B'],
  album: 'Example',
  date: '2026-01-02',
  originaldate: '2000-01-02',
  originalyear: 2000,
  releasedate: '2026-01-02',
  comment: [
    {
      language: 'eng',
      descriptor: 'Description',
      text: 'Comment'
    }
  ],
  genre: ['Example A', 'Example B'],
  composer: ['Example A', 'Example B'],
  lyrics: [
    {
      language: 'eng',
      descriptor: 'Lyrics',
      text: 'Words',
      contentType: 1,
      timeStampFormat: 2,
      syncText: []
    }
  ],
  albumsort: 'Example',
  titlesort: 'Example',
  work: 'Example',
  artistsort: 'Example',
  albumartistsort: 'Example',
  composersort: 'Example',
  lyricist: ['Example A', 'Example B'],
  writer: ['Example A', 'Example B'],
  conductor: ['Example A', 'Example B'],
  remixer: ['Example A', 'Example B'],
  arranger: ['Example A', 'Example B'],
  engineer: ['Example A', 'Example B'],
  publisher: ['Example A', 'Example B'],
  producer: ['Example A', 'Example B'],
  djmixer: ['Example A', 'Example B'],
  mixer: ['Example A', 'Example B'],
  technician: ['Example A', 'Example B'],
  label: ['Example A', 'Example B'],
  grouping: 'Example',
  subtitle: ['Subtitle'],
  description: ['Example A', 'Example B'],
  longDescription: 'Example',
  discsubtitle: ['Example A', 'Example B'],
  totaltracks: '12',
  totaldiscs: '12',
  movementTotal: 12,
  compilation: true,
  rating: [
    {
      source: 'listener@example.com',
      rating: 0.5
    }
  ],
  bpm: 12,
  mood: 'Example',
  media: 'Example',
  catalognumber: ['Example A', 'Example B'],
  tvShow: 'Example',
  tvShowSort: 'Example',
  tvSeason: 12,
  tvEpisode: 12,
  tvEpisodeId: 'Example',
  tvNetwork: 'Example',
  podcast: true,
  podcasturl: 'Example',
  releasestatus: 'Example',
  releasetype: ['Example A', 'Example B'],
  releasecountry: 'Example',
  script: 'Example',
  language: 'Example',
  copyright: 'Example',
  license: 'Example',
  encodedby: 'Example',
  encodersettings: 'Example',
  gapless: true,
  barcode: 'Example',
  isrc: ['Example A', 'Example B'],
  asin: 'Example',
  musicbrainz_recordingid: 'Example',
  musicbrainz_trackid: 'Example',
  musicbrainz_albumid: 'Example',
  musicbrainz_artistid: ['Example A', 'Example B'],
  musicbrainz_albumartistid: ['Example A', 'Example B'],
  musicbrainz_releasegroupid: 'Example',
  musicbrainz_workid: 'Example',
  musicbrainz_trmid: 'Example',
  musicbrainz_discid: 'Example',
  acoustid_id: 'Example',
  acoustid_fingerprint: 'Example',
  musicip_puid: 'Example',
  musicip_fingerprint: 'Example',
  website: 'Example',
  'performer:instrument': ['Example A', 'Example B'],
  averageLevel: 12,
  peakLevel: 12,
  notes: ['Example A', 'Example B'],
  originalalbum: 'Example',
  originalartist: 'Original Artist',
  discogs_artist_id: [12, 13],
  discogs_release_id: 12,
  discogs_label_id: 12,
  discogs_master_release_id: 12,
  discogs_votes: 12,
  discogs_rating: 12,
  replaygain_track_gain_ratio: 0.5,
  replaygain_track_peak_ratio: 0.5,
  replaygain_track_gain: {
    ratio: 0.5,
    dB: -3.010299956639812
  },
  replaygain_track_peak: {
    ratio: 0.5,
    dB: -3.010299956639812
  },
  replaygain_album_gain: {
    ratio: 0.5,
    dB: -3.010299956639812
  },
  replaygain_album_peak: {
    ratio: 0.5,
    dB: -3.010299956639812
  },
  replaygain_undo: {
    leftChannel: -2,
    rightChannel: 3
  },
  replaygain_track_minmax: [12, 13],
  replaygain_album_minmax: [12, 13],
  key: 'Example',
  category: ['Example A', 'Example B'],
  hdVideo: 12,
  keywords: ['Example A', 'Example B'],
  movement: 'Example',
  movementIndex: {
    no: 2,
    of: 12
  },
  podcastId: 'Example',
  showMovement: true,
  stik: 12,
  playCounter: 12
} satisfies Omit<Required<ICommonTagsResult>, 'picture'>;

const completePatch: TagPatch = {
  ...fullCommon,
  picture: [{ format: 'image/png', data: Uint8Array.of(137, 80, 78, 71), type: 'Cover (front)' }]
};

describe('complete common-tag writing', () => {
  it('accounts for every common tag in the public mapping inventory', () => {
    expect(Object.keys(COMMON_FIELDS).sort()).toEqual(Object.keys(completePatch).sort());
  });
  for (const format of ['flac', 'mp3'] as const) {
    it(`writes all common fields to ${format} without losing any audio bytes`, async () => {
      const source =
        format === 'flac'
          ? makeFlac()
          : await readFile(
              path.join(
                import.meta.dirname,
                'samples',
                "mp3/MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.4].V2.mp3"
              )
            );
      const input = Buffer.from(source);
      const output = await updateBuffer(input, completePatch);
      const parsed = await parseBuffer(output, { mimeType: `audio/${format === 'mp3' ? 'mpeg' : 'flac'}` });
      expect(parsed.common.title).toBe(fullCommon.title);
      expect(parsed.common.replaygain_track_gain).toEqual(fullCommon.replaygain_track_gain);
      expect(parsed.common.replaygain_track_peak).toEqual(fullCommon.replaygain_track_peak);
      expect(input).toEqual(Buffer.from(source));
      const audio = (data: Uint8Array) => {
        if (format === 'mp3') {
          const size = data.subarray(6, 10).reduce((n, b) => n * 128 + b, 0);
          return data.subarray(10 + size);
        }
        let offset = 4;
        for (;;) {
          const last = data[offset]! & 128;
          const size = data[offset + 1]! * 65536 + data[offset + 2]! * 256 + data[offset + 3]!;
          offset += 4 + size;
          if (last) {
            return data.subarray(offset);
          }
        }
      };
      expect(Buffer.from(audio(output))).toEqual(Buffer.from(audio(input)));
      const deleted = Object.fromEntries(Object.keys(completePatch).map(key => [key, null])) as TagPatch;
      const cleared = await updateBuffer(output, deleted);
      expect(Buffer.from(audio(cleared))).toEqual(Buffer.from(audio(input)));
      expect(
        (await parseBuffer(cleared, { mimeType: `audio/${format === 'mp3' ? 'mpeg' : 'flac'}` })).common.title
      ).toBeUndefined();
    });
  }
});

const nativeOverrides: Record<string, string> = {
  albumartists: 'TPE2',
  isrc: 'TSRC',
  acoustid_id: 'TXXX:Acoustid Id',
  producer: 'TIPL',
  engineer: 'TIPL',
  arranger: 'TIPL',
  mixer: 'TIPL',
  djmixer: 'TIPL',
  replaygain_track_gain_ratio: 'TXXX:REPLAYGAIN_TRACK_GAIN',
  replaygain_track_peak_ratio: 'TXXX:REPLAYGAIN_TRACK_PEAK'
};

describe('every common field has an observable write effect', () => {
  for (const key of Object.keys(completePatch) as (keyof ICommonTagsResult)[]) {
    for (const format of ['flac', 'mp3', 'wav'] as const) {
      it(`${format}: ${key}`, async () => {
        const input =
          format === 'flac'
            ? makeFlac()
            : format === 'wav'
              ? smallWave()
              : Uint8Array.from([255, 251, 144, 196, ...new Uint8Array(413)]);
        const output = await updateBuffer(input, { [key]: completePatch[key] });
        const parsed = await parseBuffer(output, {
          mimeType: format === 'flac' ? 'audio/flac' : format === 'wav' ? 'audio/wav' : 'audio/mpeg'
        });
        if (format !== 'flac') {
          const expected = nativeOverrides[key] ?? COMMON_FIELDS[key].id3;
          const id = expected.startsWith('PRIV:') ? 'PRIV' : expected;
          expect(
            parsed.native['ID3v2.4']?.some(tag => tag.id === id),
            key
          ).toBe(true);
        } else {
          if (key === 'picture') {
            expect(parsed.common.picture).toHaveLength(1);
          } else {
            const field =
              key === 'artists'
                ? 'ARTIST'
                : key === 'albumartists'
                  ? 'ALBUMARTIST'
                  : key === 'rating'
                    ? 'RATING:listener@example.com'
                    : key === 'replaygain_track_gain_ratio'
                      ? 'REPLAYGAIN_TRACK_GAIN'
                      : key === 'replaygain_track_peak_ratio'
                        ? 'REPLAYGAIN_TRACK_PEAK'
                        : COMMON_FIELDS[key].vorbis;
            expect(
              parsed.native.vorbis?.some(tag => tag.id.toUpperCase() === field.toUpperCase()),
              key
            ).toBe(true);
          }
        }
      });
    }
  }
});

function riffChunk(id: string, data: Uint8Array, pad = 0): Buffer {
  const header = Buffer.alloc(8);
  header.write(id);
  header.writeUInt32LE(data.length, 4);
  return Buffer.concat([header, data, ...(data.length % 2 ? [Buffer.of(pad)] : [])]);
}
function pcmWave(): Buffer {
  const fmt = Buffer.alloc(16);
  fmt.writeUInt16LE(1);
  fmt.writeUInt16LE(1, 2);
  fmt.writeUInt32LE(8000, 4);
  fmt.writeUInt32LE(16000, 8);
  fmt.writeUInt16LE(2, 12);
  fmt.writeUInt16LE(16, 14);
  const body = Buffer.concat([
    Buffer.from('WAVE'),
    riffChunk('fmt ', fmt),
    riffChunk('JUNK', Buffer.from('unknown'), 127),
    riffChunk('data', Buffer.alloc(2 * 1024 * 1024, 42))
  ]);
  const header = Buffer.alloc(8);
  header.write('RIFF');
  header.writeUInt32LE(body.length, 4);
  return Buffer.concat([header, body, Buffer.from('outside-riff')]);
}
function rawPreservedRegions(data: Uint8Array, format: 'mp3' | 'flac' | 'wav'): Buffer[] {
  const buffer = Buffer.from(data);
  if (format === 'mp3') {
    const offset =
      buffer.subarray(0, 3).toString() === 'ID3' ? 10 + buffer.subarray(6, 10).reduce((n, b) => n * 128 + b, 0) : 0;
    return [buffer.subarray(offset)];
  }
  if (format === 'flac') {
    let offset = 4;
    const regions: Buffer[] = [];
    for (;;) {
      const type = buffer[offset]! & 127;
      const last = buffer[offset]! & 128;
      const length = buffer.readUIntBE(offset + 1, 3);
      if (![1, 4, 6].includes(type)) {
        regions.push(buffer.subarray(offset + 4, offset + 4 + length));
      }
      offset += 4 + length;
      if (last) {
        return [...regions, buffer.subarray(offset)];
      }
    }
  }
  const end = buffer.readUInt32LE(4) + 8;
  const regions: Buffer[] = [];
  for (let offset = 12; offset < end; ) {
    const length = buffer.readUInt32LE(offset + 4);
    const next = offset + 8 + length + (length % 2);
    if (
      buffer
        .subarray(offset, offset + 4)
        .toString()
        .toLowerCase() !== 'id3 '
    ) {
      regions.push(buffer.subarray(offset, next));
    }
    offset = next;
  }
  return [...regions, buffer.subarray(end)];
}

function preservedRegions(data: Uint8Array, format: 'mp3' | 'flac' | 'wav'): string[] {
  return rawPreservedRegions(data, format).map(
    region => `${region.length}:${createHash('sha256').update(region).digest('hex')}`
  );
}

describe('file integrity across full common-tag rewrites', () => {
  for (const format of ['mp3', 'flac', 'wav'] as const) {
    for (const atomic of [true, false]) {
      it(`${format}, atomic=${atomic}: retains all audio and unrelated structures on growth, shrink and failure`, async () => {
        const dir = await mkdtemp(path.join(tmpdir(), 'common-integrity-'));
        try {
          const file = path.join(dir, `audio.${format}`);
          const payload =
            format === 'mp3'
              ? Buffer.concat(
                  Array.from({ length: 6000 }, () => Buffer.from([255, 251, 144, 196, ...new Uint8Array(413)]))
                )
              : Buffer.alloc(2 * 1024 * 1024, 42);
          const original =
            format === 'wav' ? pcmWave() : format === 'flac' ? Buffer.from(makeFlac({ audio: payload })) : payload;
          await writeFile(file, original);
          const expected = preservedRegions(original, format);
          await updateFile(file, completePatch, { atomic, padding: 0 });
          expect(preservedRegions(await readFile(file), format)).toEqual(expected);
          const failedBefore = await readFile(file);
          await expect(updateFile(file, { track: { no: -1 } }, { atomic })).rejects.toThrow();
          expect((await readFile(file)).equals(failedBefore)).toBe(true);
          const clear = Object.fromEntries(Object.keys(completePatch).map(key => [key, null])) as TagPatch;
          await updateFile(file, clear, { atomic, padding: 0 });
          expect(preservedRegions(await readFile(file), format)).toEqual(expected);
          const empty = await parseBuffer(await readFile(file), {
            mimeType: `audio/${format === 'mp3' ? 'mpeg' : format === 'wav' ? 'wav' : 'flac'}`
          });
          expect(empty.common.track).toEqual({ no: null, of: null });
          expect(empty.common.disk).toEqual({ no: null, of: null });
          expect(empty.common.picture).toBeUndefined();
        } finally {
          await rm(dir, { recursive: true, force: true });
        }
      });
    }
  }
});

describe('lyrics patch semantics', () => {
  const mp3 = () => Uint8Array.from([255, 251, 144, 196, ...new Uint8Array(413)]);
  const nativeTags = (metadata: Awaited<ReturnType<typeof parseBuffer>>, id: string) =>
    metadata.native['ID3v2.4']?.filter(tag => tag.id === id) ?? [];

  it('writes plain strings as English USLT and replaces synchronized lyrics', async () => {
    const synchronized = await updateBuffer(mp3(), {
      lyrics: {
        language: 'zho',
        descriptor: '原文',
        contentType: 1,
        timeStampFormat: 2,
        syncText: [{ text: '第一行', timestamp: 1250 }]
      }
    });
    expect(nativeTags(await parseBuffer(synchronized, { mimeType: 'audio/mpeg' }), 'SYLT')).toHaveLength(1);

    const output = await updateBuffer(synchronized, { lyrics: 'Plain lyrics' });
    const metadata = await parseBuffer(output, { mimeType: 'audio/mpeg' });
    expect(nativeTags(metadata, 'USLT')).toEqual([
      { id: 'USLT', value: { language: 'eng', descriptor: '', text: 'Plain lyrics' } }
    ]);
    expect(nativeTags(metadata, 'SYLT')).toHaveLength(0);
  });

  it('retains explicit languages and descriptors for multiple USLT entries', async () => {
    const output = await updateBuffer(mp3(), {
      lyrics: [
        { language: 'zho', descriptor: '原文', text: '第一行' },
        { language: 'eng', descriptor: 'Translation', text: 'First line' }
      ]
    });
    const metadata = await parseBuffer(output, { mimeType: 'audio/mpeg' });
    expect(nativeTags(metadata, 'USLT').map(tag => tag.value)).toEqual([
      { language: 'zho', descriptor: '原文', text: '第一行' },
      { language: 'eng', descriptor: 'Translation', text: 'First line' }
    ]);
  });

  it('keeps text and synchronized frames for a combined entry and replaces each form independently', async () => {
    const combined = {
      language: 'zho',
      descriptor: '原文',
      text: '第一行',
      contentType: 1,
      timeStampFormat: 2,
      syncText: [{ text: '第一行', timestamp: 1250 }]
    } as const;
    const both = await updateBuffer(mp3(), { lyrics: combined });
    const bothMetadata = await parseBuffer(both, { mimeType: 'audio/mpeg' });
    expect(nativeTags(bothMetadata, 'USLT')).toHaveLength(1);
    expect(nativeTags(bothMetadata, 'SYLT')).toHaveLength(1);

    const textOnly = await updateBuffer(both, { lyrics: 'Text only' });
    const textMetadata = await parseBuffer(textOnly, { mimeType: 'audio/mpeg' });
    expect(nativeTags(textMetadata, 'USLT')).toHaveLength(1);
    expect(nativeTags(textMetadata, 'SYLT')).toHaveLength(0);

    const syncOnly = await updateBuffer(both, {
      lyrics: {
        language: 'eng',
        contentType: 1,
        timeStampFormat: 2,
        syncText: [{ text: 'Synchronized only', timestamp: 500 }]
      }
    });
    const syncMetadata = await parseBuffer(syncOnly, { mimeType: 'audio/mpeg' });
    expect(nativeTags(syncMetadata, 'USLT')).toHaveLength(0);
    expect(nativeTags(syncMetadata, 'SYLT')).toHaveLength(1);
  });

  it('defaults optional ID3 synchronized lyrics headers', async () => {
    const output = await updateBuffer(mp3(), {
      lyrics: { syncText: [{ text: 'Words', timestamp: 1000 }] }
    });
    const metadata = await parseBuffer(output, { mimeType: 'audio/mpeg' });
    expect(nativeTags(metadata, 'SYLT')[0]?.value).toMatchObject({ contentType: 1, timeStampFormat: 2 });
  });

  it('treats an empty string, empty array and null as removal', async () => {
    const populated = await updateBuffer(mp3(), {
      lyrics: ['eng', 'zho'].map(language => ({
        language,
        text: 'Words',
        contentType: 1,
        timeStampFormat: 2,
        syncText: [{ text: 'Words', timestamp: 0 }]
      }))
    });
    for (const value of ['', [], null] as const) {
      const output = await updateBuffer(populated, { lyrics: value });
      const metadata = await parseBuffer(output, { mimeType: 'audio/mpeg' });
      expect(nativeTags(metadata, 'USLT')).toHaveLength(0);
      expect(nativeTags(metadata, 'SYLT')).toHaveLength(0);
    }
  });

  it('writes repeated FLAC LYRICS values with text only', async () => {
    const output = await updateBuffer(makeFlac(), {
      lyrics: [
        { language: 'zho', descriptor: '原文', text: '第一行' },
        { language: 'eng', descriptor: 'Translation', text: 'First line' }
      ]
    });
    const metadata = await parseBuffer(output, { mimeType: 'audio/flac' });
    expect(metadata.native.vorbis?.filter(tag => tag.id === 'LYRICS').map(tag => tag.value)).toEqual([
      '第一行',
      'First line'
    ]);
    expect(metadata.common.lyrics?.map(lyrics => lyrics.text)).toEqual(['第一行', 'First line']);
    expect(metadata.common.lyrics?.[0]?.language).toBeUndefined();
    expect(metadata.common.lyrics?.[0]?.descriptor).toBeUndefined();
  });

  it('documents FLAC LRC normalization and keeps native LRC byte-identical', async () => {
    const input = makeFlac({ comments: [{ key: 'LYRICS', value: '[00:01.25]First' }] });
    const before = await parseBuffer(input, { mimeType: 'audio/flac' });
    expect(before.native.vorbis).toContainEqual({ id: 'LYRICS', value: '[00:01.25]First' });
    expect(before.common.lyrics?.[0]?.syncText).toEqual([{ text: 'First', timestamp: 1250 }]);

    const commonRoundTrip = await updateBuffer(input, { lyrics: before.common.lyrics ?? null });
    expect((await parseBuffer(commonRoundTrip, { mimeType: 'audio/flac' })).native.vorbis).toContainEqual({
      id: 'LYRICS',
      value: '[00:01.250]First'
    });

    const nativeRoundTrip = await updateBuffer(input, { native: { LYRICS: '[00:01.25]First' } });
    expect((await parseBuffer(nativeRoundTrip, { mimeType: 'audio/flac' })).native.vorbis).toContainEqual({
      id: 'LYRICS',
      value: '[00:01.25]First'
    });
  });

  it('treats an empty string, empty array and null as FLAC removal while allowing explicit empty text', async () => {
    const populated = await updateBuffer(makeFlac(), { lyrics: { language: 'zho', text: '第一行' } });
    for (const value of ['', [], null] as const) {
      const output = await updateBuffer(populated, { lyrics: value });
      const metadata = await parseBuffer(output, { mimeType: 'audio/flac' });
      expect((metadata.native.vorbis ?? []).some(tag => tag.id === 'LYRICS')).toBe(false);
    }
    const explicitEmpty = await updateBuffer(makeFlac(), { lyrics: { text: '' } });
    expect((await parseBuffer(explicitEmpty, { mimeType: 'audio/flac' })).native.vorbis).toContainEqual({
      id: 'LYRICS',
      value: ''
    });
  });
});

describe('structured common values', () => {
  it('retains synchronized ID3 lyrics including descriptors, language and timestamps', async () => {
    const lyrics: NonNullable<ICommonTagsResult['lyrics']> = [
      {
        language: 'eng',
        descriptor: 'Timing',
        contentType: 1,
        timeStampFormat: 2,
        syncText: [
          { text: 'First', timestamp: 1250 },
          { text: 'Second', timestamp: 62345 }
        ]
      }
    ];
    const source = Uint8Array.from([255, 251, 144, 196, ...new Uint8Array(413)]);
    const output = await updateBuffer(source, { lyrics });
    const parsed = await parseBuffer(output, { mimeType: 'audio/mpeg' });
    expect(parsed.common.lyrics).toEqual(lyrics);
    expect(
      (await parseBuffer(await updateBuffer(output, { lyrics: null }), { mimeType: 'audio/mpeg' })).common.lyrics
    ).toBeUndefined();
  });
  it('writes timed Vorbis lyrics as millisecond LRC and rejects frame timestamps without changing the input', async () => {
    const lyrics: NonNullable<ICommonTagsResult['lyrics']> = [
      {
        contentType: 1,
        timeStampFormat: 2,
        syncText: [
          { text: 'First', timestamp: 1250 },
          { text: 'Second', timestamp: 62345 }
        ]
      }
    ];
    const source = makeFlac();
    const output = await updateBuffer(source, { lyrics });
    const parsed = await parseBuffer(output, { mimeType: 'audio/flac' });
    expect(parsed.native.vorbis).toContainEqual({ id: 'LYRICS', value: '[00:01.250]First\n[01:02.345]Second' });
    await expect(updateBuffer(source, { lyrics: [{ ...lyrics[0]!, timeStampFormat: 1 }] })).rejects.toThrow(
      'millisecond'
    );
  });
  it.each([
    ['\n', 0],
    ['\r', 0],
    ['\r\n', 0],
    ['\n', 1],
    ['\r', 1],
    ['\r\n', 1]
  ] as const)('rejects embedded %j in LRC entry %i without changing the buffer', async (newline, index) => {
    const source = makeFlac();
    const original = Uint8Array.from(source);
    const syncText = [
      { text: 'First', timestamp: 0 },
      { text: 'Later', timestamp: 1000 }
    ];
    syncText[index]!.text += `${newline}[00:02.000]Injected`;
    const result = updateBuffer(source, { lyrics: { timeStampFormat: 2, syncText } });
    await expect(result).rejects.toBeInstanceOf(InvalidPatchError);
    await expect(result).rejects.toThrow('Vorbis synchronized lyrics line text must not contain CR or LF');
    expect(source).toEqual(original);
  });
  it('normalizes aliases and retains partial number pairs', async () => {
    const output = await updateBuffer(makeFlac(), {
      year: 2026,
      totaltracks: '12',
      totaldiscs: '2',
      replaygain_track_gain_ratio: 0.5,
      replaygain_track_peak_ratio: 0.75
    });
    const parsed = await parseBuffer(output, { mimeType: 'audio/flac' });
    expect(parsed.common.year).toBe(2026);
    expect(parsed.common.track.of).toBe(12);
    expect(parsed.common.disk.of).toBe(2);
    expect(parsed.common.replaygain_track_gain?.ratio).toBe(0.5);
    expect(parsed.common.replaygain_track_peak?.ratio).toBe(0.75);
  });
});

function smallWave(): Buffer {
  const source = pcmWave();
  const dataOffset = source.indexOf(Buffer.from('data'));
  const body = Buffer.concat([source.subarray(8, dataOffset), riffChunk('data', Buffer.alloc(1600, 42))]);
  const header = Buffer.alloc(8);
  header.write('RIFF');
  header.writeUInt32LE(body.length, 4);
  return Buffer.concat([header, body]);
}

describe('Windows replacement ownership', () => {
  for (const format of ['mp3', 'flac', 'wav'] as const) {
    it(`closes every input before replacing a ${format} file`, async () => {
      const directory = await mkdtemp(path.join(tmpdir(), 'windows-replace-'));
      const target = path.join(directory, `audio.${format}`);
      const original =
        format === 'wav'
          ? smallWave()
          : format === 'flac'
            ? makeFlac()
            : Uint8Array.from([255, 251, 144, 196, ...new Uint8Array(413)]);
      await writeFile(target, original);
      const opened = new Set<sourceModule.ByteSource>();
      const openSource = sourceModule.openSource;
      const rename = fs.rename.bind(fs);
      const openSpy = vi.spyOn(sourceModule, 'openSource').mockImplementation(async input => {
        const source = await openSource(input);
        opened.add(source);
        const close = source.close.bind(source);
        source.close = async () => {
          await close();
          opened.delete(source);
        };
        return source;
      });
      const renameSpy = vi.spyOn(fs, 'rename').mockImplementation(async (from, to) => {
        // Model Windows refusing replacement while the tokenizer owns an input handle.
        if (opened.size) {
          throw Object.assign(new Error('Input still open'), { code: 'EPERM' });
        }
        await rename(from, to);
      });
      try {
        await updateFile(target, { title: 'Windows replacement' }, { backup: true });
        expect(renameSpy).toHaveBeenCalledOnce();
        expect(opened.size).toBe(0);
        expect((await readFile(`${target}.bak`)).equals(Buffer.from(original))).toBe(true);
        expect(preservedRegions(await readFile(target), format)).toEqual(preservedRegions(original, format));
        expect((await parseBuffer(await readFile(target))).common.title).toBe('Windows replacement');
      } finally {
        openSpy.mockRestore();
        renameSpy.mockRestore();
        await rm(directory, { recursive: true, force: true });
      }
    });
  }
});
