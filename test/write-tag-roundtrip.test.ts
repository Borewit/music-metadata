import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { apev2TagMap } from '../lib/apev2/APEv2TagMapper.js';
import { asfTagMap } from '../lib/asf/AsfTagMapper.js';
import type { ICommonTagsResult, TagPatch } from '../lib/index.js';
import { MediaFile, parseBuffer, parseFile, UnsupportedFeatureError, updateBuffer } from '../lib/index.js';
import type { WriteResult } from '../lib/write/core/types.js';
import { COMMON_FIELDS } from '../lib/write/mapping/common.js';
import { completePatch } from './helpers/common-tags.js';
import { makeWav } from './helpers/wav.js';

type Format = WriteResult['format'];
type Field = keyof typeof completePatch;

const allFields = Object.keys(completePatch) as Field[];
const allAliases = ['replayGainTrackGainRatio', 'replayGainTrackPeakRatio'] as const;

const apeFields = [...new Set(Object.values(apev2TagMap).filter(field => field !== undefined))].map(String);
const asfFields = [...new Set(Object.values(asfTagMap).filter(field => field !== undefined))].map(String);

const mp4AdditionalFields = [
  'directors',
  'mbComposerId',
  'mbOriginalArtistId',
  'mbOriginalReleaseId',
  'itunesCddb1',
  'replayGainAlbumRange',
  'replayGainTrackRange',
  'replayGainReferenceLoudness',
  'arrangers',
  'performer:instrument',

  'djMixers',
  'mbTrmId',
  'acoustId',
  'acoustIdFingerprint',
  'musicIpPuid',
  'musicIpFingerprint',
  'tvShow',
  'tvShowSort',
  'tvSeason',
  'tvEpisode',
  'tvEpisodeId',
  'tvNetwork',
  'podcast',
  'podcastUrl',
  'replayGainTrackMinMax',
  'replayGainAlbumMinMax',
  'replayGainUndo'
] as const satisfies readonly Field[];

const mp4Fields = [
  ...mp4AdditionalFields,
  'trackNumber',
  'trackTotal',
  'discNumber',
  'discTotal',
  'year',
  'title',
  'artist',
  'artists',
  'albumArtist',
  'albumArtists',
  'album',
  'date',
  'originalDate',
  'originalYear',
  'releaseDate',
  'comments',
  'genres',
  'composers',
  'lyrics',
  'albumSort',
  'titleSort',
  'work',
  'artistSort',
  'albumArtistSort',
  'composerSort',
  'lyricists',
  'conductors',
  'remixers',
  'engineers',
  'producers',
  'mixers',
  'labels',
  'grouping',
  'subtitles',
  'description',
  'longDescription',
  'discSubtitle',
  'movementTotal',
  'compilation',
  'bpm',
  'mood',
  'media',
  'catalogNumber',
  'releaseStatus',
  'releaseType',
  'releaseCountry',
  'script',
  'language',
  'copyright',
  'license',
  'encodedBy',
  'gapless',
  'barcode',
  'isrcs',
  'asin',
  'mbRecordingId',
  'mbReleaseTrackId',
  'mbReleaseId',
  'mbArtistId',
  'mbAlbumArtistId',
  'mbReleaseGroupId',
  'mbWorkId',
  'mbDiscId',
  'replayGainTrackGainRatio',
  'replayGainTrackPeakRatio',
  'replayGainTrackGain',
  'replayGainTrackPeak',
  'replayGainAlbumGain',
  'replayGainAlbumPeak',
  'key',
  'categories',
  'hdVideo',
  'keywords',
  'movement',
  'movementNumber',
  'podcastId',
  'showMovement',
  'stik',
  'picture'
] as const;

interface FormatCase {
  readonly format: Format;
  readonly fixture: string;
  readonly mimeType: string;
  readonly writable: readonly string[];
  readonly writeOnly: readonly string[];
  readonly aliases: readonly string[];
  readonly roundtrip: readonly string[];
  readonly unsupported: readonly string[];
}

function caseFor(
  format: Format,
  fixture: string,
  mimeType: string,
  writable: readonly string[],
  writeOnly: readonly string[] = [],
  aliases: readonly string[] = allAliases
): FormatCase {
  return {
    format,
    fixture,
    mimeType,
    writable,
    writeOnly,
    aliases,
    roundtrip: writable.filter(field => !aliases.includes(field) && !writeOnly.includes(field)),
    unsupported: allFields.filter(field => !writable.includes(field) && !aliases.includes(field))
  };
}

const cases: readonly FormatCase[] = [
  caseFor('flac', 'flac/Lavf.flac', 'audio/flac', allFields, ['publishers', 'description']),
  caseFor('mp3', "mp3/MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.4].V2.mp3", 'audio/mpeg', allFields, [
    'publishers'
  ]),
  caseFor('aac', 'aac/adts-mpeg4-2.aac', 'audio/aac', allFields, ['publishers']),
  caseFor('wav', 'wav/pcm16-fact.wav', 'audio/wav', allFields, ['publishers']),
  caseFor('mp4', 'mp4/aac-faststart.m4a', 'audio/mp4', mp4Fields),
  caseFor('ogg', 'ogg/generated-vorbis.ogg', 'audio/ogg', allFields, ['publishers', 'description']),
  caseFor('ogg', 'ogg/generated-opus.opus', 'audio/ogg', allFields, ['publishers', 'description']),
  caseFor('ape', 'ape/monkeysaudio-date.ape', 'audio/ape', [...apeFields, 'year', 'trackTotal', 'discTotal']),
  caseFor('wv', 'wavpack/unknown-count-multichannel.wv', 'audio/wavpack', [
    ...apeFields,
    'year',
    'trackTotal',
    'discTotal'
  ]),
  caseFor('mpc', 'mpc/apev2-no-header.sv7.mpc', 'audio/musepack', [...apeFields, 'year', 'trackTotal', 'discTotal']),
  caseFor('mpc', 'mpc/bach-goldberg-variatians-05.sv8.mpc', 'audio/musepack', [
    ...apeFields,
    'year',
    'trackTotal',
    'discTotal'
  ]),
  caseFor('asf', 'asf/13 Thirty Dirty Birds.wma', 'audio/asf', [...asfFields, 'year', 'discTotal'])
];

const inputCache = new Map<string, Promise<Uint8Array>>();

function inputFor(fixture: string): Promise<Uint8Array> {
  let input = inputCache.get(fixture);
  if (!input) {
    input = readFile(new URL(`./samples/${fixture}`, import.meta.url));
    inputCache.set(fixture, input);
  }
  return input;
}

function expectedValue(field: Field): unknown {
  return completePatch[field];
}

const patchLyrics = completePatch.lyrics as readonly { text: string }[];
const patchComment = completePatch.comments as readonly { text: string }[];

function actualValue(common: ICommonTagsResult, field: Field): unknown {
  switch (field) {
    case 'picture':
      return common.picture?.map(picture => ({ format: picture.format, data: picture.data }));
    case 'lyrics':
      return common.lyrics?.map(entry => entry.text);
    case 'comments':
      return common.comments?.map(entry => entry.text);
    default:
      return (common as unknown as Record<string, unknown>)[field];
  }
}

function normalizedExpected(field: Field): unknown {
  switch (field) {
    case 'picture':
      return completePatch.picture.map(picture => ({ format: picture.format, data: picture.data }));
    case 'lyrics':
      return patchLyrics.map(entry => entry.text);
    case 'comments':
      return patchComment.map(entry => entry.text);
    default:
      return expectedValue(field);
  }
}

function nativeField(format: Format, field: Field): string {
  return format === 'flac' || format === 'ogg' ? COMMON_FIELDS[field].vorbis : COMMON_FIELDS[field].id3;
}

const fieldCases = cases.flatMap(testCase => testCase.roundtrip.map(field => ({ ...testCase, field: field as Field })));
const writeOnlyCases = cases.flatMap(testCase =>
  testCase.writeOnly.map(field => ({ ...testCase, field: field as Field }))
);
const unsupportedCases = cases.flatMap(testCase =>
  testCase.unsupported.map(field => ({ ...testCase, field: field as Field }))
);
const aliasCases = cases.flatMap(testCase => testCase.aliases.map(field => ({ ...testCase, field: field as Field })));

it('keeps the common field inventory in sync with the mapping table', () => {
  expect(Object.keys(COMMON_FIELDS).sort()).toEqual([...allFields].sort());
});

it('assigns every common field to a read-back, write-only, alias or unsupported case for each format', () => {
  for (const testCase of cases) {
    const assigned = new Set([
      ...testCase.roundtrip,
      ...testCase.writeOnly,
      ...testCase.aliases,
      ...testCase.unsupported
    ]);
    expect(allFields.filter(field => !assigned.has(field))).toEqual([]);
  }
});

it('covers every common field across the writable formats', () => {
  const covered = new Set(
    cases.flatMap(testCase => [...testCase.roundtrip, ...testCase.writeOnly, ...testCase.aliases])
  );
  expect(allFields.filter(field => !covered.has(field))).toEqual([]);
});

it.each(fieldCases)('reads back $field written to $fixture', async ({ fixture, mimeType, field }) => {
  const output = await updateBuffer(await inputFor(fixture), { [field]: expectedValue(field) });
  const { common } = await parseBuffer(output, { mimeType });
  expect(actualValue(common, field)).toEqual(normalizedExpected(field));
});

it.each(writeOnlyCases)(
  'writes $field to $fixture without mapping it back to common',
  async ({ format, fixture, mimeType, field }) => {
    const output = await updateBuffer(await inputFor(fixture), { [field]: expectedValue(field) });
    const parsed = await parseBuffer(output, { mimeType });
    expect((parsed.common as unknown as Record<string, unknown>)[field]).toBeUndefined();
    const nativeFieldId = nativeField(format, field);
    if (format === 'flac' || format === 'ogg') {
      const nativeTags = parsed.native.vorbis?.filter(tag => tag.id.toUpperCase() === nativeFieldId.toUpperCase());
      expect(nativeTags).toBeDefined();
      expect(nativeTags?.map(tag => tag.value).sort()).toEqual((expectedValue(field) as string[]).slice().sort());
    } else {
      const nativeTags = parsed.native['ID3v2.4']?.filter(tag => tag.id === nativeFieldId);
      expect(nativeTags).toBeDefined();
      expect(nativeTags?.map(tag => tag.value).sort()).toEqual((expectedValue(field) as string[]).slice().sort());
    }
  }
);

it.each(unsupportedCases)('rejects $field for $fixture', async ({ fixture, field }) => {
  await expect(updateBuffer(await inputFor(fixture), { [field]: expectedValue(field) })).rejects.toBeInstanceOf(
    UnsupportedFeatureError
  );
});

it.each(aliasCases)('normalizes $field for $fixture', async ({ fixture, mimeType, field }) => {
  const output = await updateBuffer(await inputFor(fixture), { [field]: expectedValue(field) });
  const { common } = await parseBuffer(output, { mimeType });
  switch (field) {
    case 'replayGainTrackGainRatio':
      expect(common.replayGainTrackGain?.ratio).toBe(completePatch.replayGainTrackGainRatio);
      break;
    case 'replayGainTrackPeakRatio':
      expect(common.replayGainTrackPeak?.ratio).toBe(completePatch.replayGainTrackPeakRatio);
      break;
  }
});

it.each(cases)('roundtrips the complete common model for $fixture', async testCase => {
  const { fixture, mimeType, roundtrip } = testCase;
  const input = await inputFor(fixture);
  const patch = Object.fromEntries(roundtrip.map(field => [field, completePatch[field as Field]]));
  const tagged = await updateBuffer(input, patch);
  const { common } = await parseBuffer(tagged, { mimeType });

  for (const field of roundtrip) {
    expect(actualValue(common, field as Field)).toEqual(normalizedExpected(field as Field));
  }

  const destination = await cleanInputFor(testCase);
  const copy = await updateBuffer(destination, common);
  expect((await parseBuffer(copy, { mimeType })).common).toStrictEqual(common);
});

// Clear mapped metadata rather than copying back onto the original tagged file.
// The empty-model assertion ensures omitted writes cannot be hidden by old values.
const cleanInputs = new Map<string, Promise<Uint8Array>>();
function cleanInputFor(testCase: FormatCase): Promise<Uint8Array> {
  let clean = cleanInputs.get(testCase.fixture);
  if (!clean) {
    clean = (async () => {
      const result = await updateBuffer(
        // WAV's lower-priority RIFF INFO tags intentionally survive ID3 edits.
        // Use a metadata-free PCM input rather than mistaking them for writer output.
        testCase.format === 'wav' ? makeWav() : await inputFor(testCase.fixture),
        Object.fromEntries(testCase.writable.map(field => [field, null]))
      );
      expect((await parseBuffer(result, { mimeType: testCase.mimeType })).common).toEqual({});
      return result;
    })();
    cleanInputs.set(testCase.fixture, clean);
  }
  return clean;
}

// Independent Picard names: do not derive these from COMMON_FIELDS or the reader maps.
// This exercises the public native interface to encode tags, bypassing common writer mappings.
// Reference: Picard's documented artist / artists / albumartist / albumartists mappings.
const picardArtistKeys = {
  flac: ['ARTIST', 'ARTISTS', 'ALBUMARTIST', 'ALBUMARTISTS'],
  ogg: ['ARTIST', 'ARTISTS', 'ALBUMARTIST', 'ALBUMARTISTS'],
  mp3: ['TPE1', 'TXXX:ARTISTS', 'TPE2', 'TXXX:ALBUMARTISTS'],
  aac: ['TPE1', 'TXXX:ARTISTS', 'TPE2', 'TXXX:ALBUMARTISTS'],
  wav: ['TPE1', 'TXXX:ARTISTS', 'TPE2', 'TXXX:ALBUMARTISTS'],
  mp4: ['©ART', '----:com.apple.iTunes:ARTISTS', 'aART', '----:com.apple.iTunes:ALBUMARTISTS'],
  ape: ['Artist', 'ARTISTS', 'Album Artist', 'ALBUMARTISTS'],
  wv: ['Artist', 'ARTISTS', 'Album Artist', 'ALBUMARTISTS'],
  mpc: ['Artist', 'ARTISTS', 'Album Artist', 'ALBUMARTISTS'],
  asf: ['Author', 'WM/ARTISTS', 'WM/AlbumArtist', 'WM/ALBUMARTISTS']
} satisfies Record<Format, readonly string[]>;
const artistFields = ['artist', 'artists', 'albumArtist', 'albumArtists'] as const;
const artistCredits = {
  artist: 'Björk feat. Guest',
  artists: ['Björk', 'Guest'],
  albumArtist: 'Ensemble with Soloist',
  albumArtists: ['Ensemble', 'Soloist']
} satisfies ICommonTagsResult;

function artistNative(format: Format, credits = artistCredits): NonNullable<TagPatch['native']> {
  return Object.fromEntries(picardArtistKeys[format].map((key, i) => [key, credits[artistFields[i]]]));
}

for (const testCase of cases) {
  const { format, fixture, mimeType } = testCase;
  describe(`independent artist credits in ${fixture}`, () => {
    it.each([false, true])('reads Picard native keys (list first: %s)', async listFirst => {
      const entries = Object.entries(artistNative(format));
      const seeded = await updateBuffer(await cleanInputFor(testCase), {
        native: Object.fromEntries(listFirst ? entries.reverse() : entries)
      });
      expect((await parseBuffer(seeded, { mimeType })).common).toEqual(artistCredits);
    });

    it('writes canonical Picard keys without changing the display credits', async () => {
      const written = await updateBuffer(await cleanInputFor(testCase), artistCredits);
      const parsed = await parseBuffer(written, { mimeType });
      expect(parsed.common).toEqual(artistCredits);
      const native = Object.values(parsed.native).flat();
      for (const [key, value] of Object.entries(artistNative(format))) {
        const values = native.filter(tag => tag.id.toUpperCase() === key.toUpperCase()).map(tag => tag.value);
        expect(values, key).toEqual(Array.isArray(value) ? value : [value]);
      }
    });

    it('keeps unspecified lists and credits, and removes lists independently', async () => {
      let buffer = await updateBuffer(await cleanInputFor(testCase), artistCredits);
      buffer = await updateBuffer(buffer, { artists: ['New track artist'], albumArtists: ['New album artist'] });
      expect((await parseBuffer(buffer, { mimeType })).common).toEqual({
        ...artistCredits,
        artists: ['New track artist'],
        albumArtists: ['New album artist']
      });
      buffer = await updateBuffer(buffer, { artist: 'New track credit', albumArtist: 'New album credit' });
      expect((await parseBuffer(buffer, { mimeType })).common).toEqual({
        artist: 'New track credit',
        albumArtist: 'New album credit',
        artists: ['New track artist'],
        albumArtists: ['New album artist']
      });
      buffer = await updateBuffer(buffer, { artists: null, albumArtists: [] });
      expect((await parseBuffer(buffer, { mimeType })).common).toEqual({
        artist: 'New track credit',
        albumArtist: 'New album credit'
      });
    });
  });
}

// All source/destination combinations ensure this is a common-model contract, not
// just a self-roundtrip in one container. Neither native tags nor fixture metadata travel.
it.each(
  cases.flatMap(source =>
    cases.map(destination => ({
      source,
      destination,
      from: source.fixture,
      to: destination.fixture
    }))
  )
)('transfers Picard credits from $from to $to via common only', async ({ source, destination }) => {
  const seeded = await updateBuffer(await cleanInputFor(source), { native: artistNative(source.format) });
  const { common } = await parseBuffer(seeded, { mimeType: source.mimeType });
  expect(common).toEqual(artistCredits);
  const written = await updateBuffer(await cleanInputFor(destination), common);
  expect((await parseBuffer(written, { mimeType: destination.mimeType })).common).toEqual(artistCredits);
});

const legacyArtistKeys: Partial<Record<Format, readonly string[]>> = {
  flac: ['DISCOGS_ARTISTS', 'DISCOGS_ALBUM_ARTISTS'],
  ogg: ['DISCOGS_ARTISTS', 'DISCOGS_ALBUM_ARTISTS'],
  mp3: ['TXXX:DISCOGS_ARTISTS', 'TXXX:DISCOGS_ALBUM_ARTISTS'],
  aac: ['TXXX:DISCOGS_ARTISTS', 'TXXX:DISCOGS_ALBUM_ARTISTS'],
  wav: ['TXXX:DISCOGS_ARTISTS', 'TXXX:DISCOGS_ALBUM_ARTISTS'],
  ape: ['Artists', 'Album Artists'],
  wv: ['Artists', 'Album Artists'],
  mpc: ['Artists', 'Album Artists'],
  asf: ['ARTISTS', 'WM/AlbumArtists']
};

it.each(cases.filter(testCase => legacyArtistKeys[testCase.format]))(
  'reads legacy artist-list aliases and replaces/removes them without stale values in $fixture',
  async testCase => {
    const { format, mimeType } = testCase;
    const [artists, albumArtists] = legacyArtistKeys[format]!;
    const [artist, , albumArtist] = picardArtistKeys[format];
    const original = await updateBuffer(await cleanInputFor(testCase), {
      native: {
        [artist]: artistCredits.artist,
        [albumArtist]: artistCredits.albumArtist,
        [artists]: artistCredits.artists,
        [albumArtists]: artistCredits.albumArtists
      }
    });
    expect((await parseBuffer(original, { mimeType })).common).toEqual(artistCredits);
    // Unrelated edits must not rewrite the legacy representations.
    const unrelated = await parseBuffer(await updateBuffer(original, { title: 'Unrelated' }), { mimeType });
    expect(unrelated.common).toMatchObject(artistCredits);
    expect(Object.values(unrelated.native).flat()).toEqual(
      expect.arrayContaining([
        { id: artists, value: artistCredits.artists[0] },
        { id: albumArtists, value: artistCredits.albumArtists[0] }
      ])
    );
    const replacement = { ...artistCredits, artists: ['New track name'], albumArtists: ['New album name'] };
    const rewritten = await updateBuffer(original, {
      artists: replacement.artists,
      albumArtists: replacement.albumArtists
    });
    expect((await parseBuffer(rewritten, { mimeType })).common).toEqual(replacement);
    for (const input of [original, rewritten]) {
      const removed = await updateBuffer(input, { artists: [], albumArtists: null });
      expect((await parseBuffer(removed, { mimeType })).common).toEqual({
        artist: artistCredits.artist,
        albumArtist: artistCredits.albumArtist
      });
    }
  }
);

it.each(cases)('transfers legacy repeated display fields into independent lists in $fixture', async testCase => {
  const { format, mimeType } = testCase;
  const [artist, , albumArtist] = picardArtistKeys[format];
  const original = await updateBuffer(await cleanInputFor(testCase), {
    native: { [artist]: artistCredits.artists, [albumArtist]: artistCredits.albumArtists }
  });
  const { common } = await parseBuffer(original, { mimeType });
  const expected = {
    ...artistCredits,
    artist: artistCredits.artists[0],
    albumArtist: artistCredits.albumArtists[0]
  };
  expect(common).toEqual(expected);
  const written = await updateBuffer(await cleanInputFor(testCase), common);
  expect((await parseBuffer(written, { mimeType })).common).toEqual(expected);
});

it('preserves repeated Vorbis credits when clearing explicit lists', async () => {
  const testCase = cases.find(({ format }) => format === 'flac')!;
  const input = await updateBuffer(await cleanInputFor(testCase), {
    native: {
      ARTIST: ['First track artist', 'Second track artist'],
      ALBUMARTIST: ['First album artist', 'Second album artist'],
      ARTISTS: ['Explicit track name'],
      ALBUMARTISTS: ['Explicit album name']
    }
  });
  const cleared = await updateBuffer(input, { artists: null, albumArtists: null });
  expect((await parseBuffer(cleared)).common).toEqual({
    artist: 'First track artist',
    artists: ['First track artist', 'Second track artist'],
    albumArtist: 'First album artist',
    albumArtists: ['First album artist', 'Second album artist']
  });

  const singleCredits = await updateBuffer(input, {
    artist: 'Track credit',
    artists: null,
    albumArtist: 'Album credit',
    albumArtists: null
  });
  expect((await parseBuffer(singleCredits)).common).toEqual({
    artist: 'Track credit',
    albumArtist: 'Album credit'
  });
});

it.each(cases)('saves the editable common artist model without losing pending edits in $fixture', async testCase => {
  const directory = await mkdtemp(join(tmpdir(), 'mm-common-artists-'));
  try {
    const file = join(directory, testCase.fixture.split('/').at(-1)!);
    await writeFile(file, await updateBuffer(await cleanInputFor(testCase), artistCredits));
    const media = await MediaFile.open(file);
    const common = media.metadata.common;
    common.artist = 'Edited display credit';
    const pending = media.save();
    common.artists!.push('Later track artist');
    common.albumArtists!.push('Later album artist');
    await pending;
    expect((await parseFile(file)).common).toEqual({ ...artistCredits, artist: 'Edited display credit' });
    const edited = {
      ...artistCredits,
      artist: 'Edited display credit',
      artists: [...artistCredits.artists, 'Later track artist'],
      albumArtists: [...artistCredits.albumArtists, 'Later album artist']
    };
    expect(common).toEqual(edited);
    await media.save();
    expect((await parseFile(file)).common).toEqual(edited);
    expect(common).toEqual(edited);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

// Exercise both transfer directions with a different tag family, not just MP4 self-roundtrips.
it.each([
  ['mp3', 'mp4'],
  ['mp4', 'mp3']
] as const)(
  'transfers identifiers, credits, TV/podcast and ReplayGain fields from %s to %s via common',
  async (from, to) => {
    const source = cases.find(testCase => testCase.format === from)!;
    const destination = cases.find(testCase => testCase.format === to)!;
    const expected = Object.fromEntries(mp4AdditionalFields.map(field => [field, completePatch[field]]));
    const original = await updateBuffer(await cleanInputFor(source), expected);
    const { common } = await parseBuffer(original, { mimeType: source.mimeType });
    expect(common).toEqual(expected);
    const copy = await updateBuffer(await cleanInputFor(destination), common);
    expect((await parseBuffer(copy, { mimeType: destination.mimeType })).common).toEqual(expected);
  }
);
