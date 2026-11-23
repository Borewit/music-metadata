import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { apev2TagMap } from '../lib/apev2/APEv2TagMapper.js';
import { asfTagMap } from '../lib/asf/AsfTagMapper.js';
import type { ICommonTagsResult } from '../lib/index.js';
import { parseBuffer, UnsupportedFeatureError, updateBuffer } from '../lib/index.js';
import type { WriteResult } from '../lib/write/core/types.js';
import { COMMON_FIELDS } from '../lib/write/mapping/common.js';
import { completePatch } from './helpers/common-tags.js';

type Format = WriteResult['format'];
type Field = keyof typeof completePatch;

const allFields = Object.keys(completePatch) as Field[];
const allAliases = [
  'trackTotal',
  'discTotal',
  'movementTotal',
  'replayGainTrackGainRatio',
  'replayGainTrackPeakRatio'
] as const;
const apeAliases = [
  'trackTotal',
  'discTotal',
  'movementTotal',
  'replayGainTrackGainRatio',
  'replayGainTrackPeakRatio'
] as const;
const asfAliases = apeAliases.filter(field => field !== 'movementTotal');

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
  'trackTotal',
  'discTotal',
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
  caseFor('aac', 'aac/adts-mpeg4.aac', 'audio/aac', allFields, ['publishers']),
  caseFor('wav', 'wav/alaw.wav', 'audio/wav', allFields, ['publishers']),
  caseFor('mp4', 'mp4/aac-faststart.m4a', 'audio/mp4', mp4Fields),
  caseFor('ogg', 'ogg/generated-vorbis.ogg', 'audio/ogg', allFields, ['publishers', 'description']),
  caseFor('ogg', 'ogg/generated-opus.opus', 'audio/ogg', allFields, ['publishers', 'description']),
  caseFor('ape', 'ape/monkeysaudio-date.ape', 'audio/ape', [...apeFields, 'year'], [], apeAliases),
  caseFor('wv', 'wavpack/unknown-count-multichannel.wv', 'audio/wavpack', [...apeFields, 'year'], [], apeAliases),
  caseFor('mpc', 'mpc/apev2-no-header.sv7.mpc', 'audio/musepack', [...apeFields, 'year'], [], apeAliases),
  caseFor('mpc', 'mpc/bach-goldberg-variatians-05.sv8.mpc', 'audio/musepack', [...apeFields, 'year'], [], apeAliases),
  caseFor('asf', 'asf/13 Thirty Dirty Birds.wma', 'audio/asf', [...asfFields, 'year'], [], asfAliases)
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

function batchExpected(format: Format, field: Field): unknown {
  if (field === 'artist' && format === 'mp4') {
    return completePatch.artists[0];
  }
  if (field === 'albumArtist' && ['mp3', 'aac', 'wav', 'mp4'].includes(format)) {
    return completePatch.albumArtists[0];
  }
  return normalizedExpected(field);
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
    case 'trackTotal':
      expect(common.trackTotal).toBe(completePatch.trackTotal);
      break;
    case 'discTotal':
      expect(common.discTotal).toBe(completePatch.discTotal);
      break;
    case 'movementTotal':
      expect(common.movementTotal).toBe(completePatch.movementTotal);
      break;
    case 'replayGainTrackGainRatio':
      expect(common.replayGainTrackGain?.ratio).toBe(completePatch.replayGainTrackGainRatio);
      break;
    case 'replayGainTrackPeakRatio':
      expect(common.replayGainTrackPeak?.ratio).toBe(completePatch.replayGainTrackPeakRatio);
      break;
  }
});

it.each(cases)(
  'roundtrips the complete common model for $fixture',
  async ({ format, fixture, mimeType, roundtrip }) => {
    const input = await inputFor(fixture);
    const patch = Object.fromEntries(roundtrip.map(field => [field, completePatch[field as Field]]));
    const tagged = await updateBuffer(input, patch);
    const { common } = await parseBuffer(tagged, { mimeType });

    for (const field of roundtrip) {
      expect(actualValue(common, field as Field)).toEqual(batchExpected(format, field as Field));
    }

    const copy = await updateBuffer(input, common);
    expect((await parseBuffer(copy, { mimeType })).common).toStrictEqual(common);
  }
);

const cleanInputs = new Map<string, Promise<Uint8Array>>();

function cleanInputFor(testCase: FormatCase): Promise<Uint8Array> {
  let input = cleanInputs.get(testCase.fixture);
  if (!input) {
    input = (async () => {
      const cleared = await updateBuffer(
        await inputFor(testCase.fixture),
        Object.fromEntries(testCase.writable.map(field => [field, null]))
      );
      expect((await parseBuffer(cleared, { mimeType: testCase.mimeType })).common).toEqual({});
      return cleared;
    })();
    cleanInputs.set(testCase.fixture, input);
  }
  return input;
}

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
