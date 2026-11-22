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
  'totaltracks',
  'totaldiscs',
  'movementTotal',
  'replaygain_track_gain_ratio',
  'replaygain_track_peak_ratio'
] as const;
const apeAliases = ['totaltracks', 'totaldiscs', 'replaygain_track_gain_ratio', 'replaygain_track_peak_ratio'] as const;

const apeFields = [...new Set(Object.values(apev2TagMap).filter(field => field !== undefined))].map(String);
const asfFields = [...new Set(Object.values(asfTagMap).filter(field => field !== undefined))].map(String);

const mp4Fields = [
  'track',
  'disk',
  'year',
  'title',
  'artist',
  'artists',
  'albumartist',
  'albumartists',
  'album',
  'date',
  'originaldate',
  'originalyear',
  'releasedate',
  'comment',
  'genre',
  'composer',
  'lyrics',
  'albumsort',
  'titlesort',
  'work',
  'artistsort',
  'albumartistsort',
  'composersort',
  'lyricist',
  'conductor',
  'remixer',
  'engineer',
  'producer',
  'mixer',
  'label',
  'grouping',
  'subtitle',
  'description',
  'longDescription',
  'discsubtitle',
  'totaltracks',
  'totaldiscs',
  'movementTotal',
  'compilation',
  'bpm',
  'mood',
  'media',
  'catalognumber',
  'releasestatus',
  'releasetype',
  'releasecountry',
  'script',
  'language',
  'copyright',
  'license',
  'encodedby',
  'gapless',
  'barcode',
  'isrc',
  'asin',
  'musicbrainz_recordingid',
  'musicbrainz_trackid',
  'musicbrainz_albumid',
  'musicbrainz_artistid',
  'musicbrainz_albumartistid',
  'musicbrainz_releasegroupid',
  'musicbrainz_workid',
  'musicbrainz_discid',
  'replaygain_track_gain_ratio',
  'replaygain_track_peak_ratio',
  'replaygain_track_gain',
  'replaygain_track_peak',
  'replaygain_album_gain',
  'replaygain_album_peak',
  'key',
  'category',
  'hdVideo',
  'keywords',
  'movement',
  'movementIndex',
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
  caseFor('flac', 'flac/Lavf.flac', 'audio/flac', allFields, ['publisher', 'description']),
  caseFor('mp3', "mp3/MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.4].V2.mp3", 'audio/mpeg', allFields, [
    'publisher'
  ]),
  caseFor('aac', 'aac/adts-mpeg4.aac', 'audio/aac', allFields, ['publisher']),
  caseFor('wav', 'wav/alaw.wav', 'audio/wav', allFields, ['publisher']),
  caseFor('mp4', 'mp4/aac-faststart.m4a', 'audio/mp4', mp4Fields),
  caseFor('ogg', 'ogg/generated-vorbis.ogg', 'audio/ogg', allFields, ['publisher', 'description']),
  caseFor('ogg', 'ogg/generated-opus.opus', 'audio/ogg', allFields, ['publisher', 'description']),
  caseFor('ape', 'monkeysaudio-date.ape', 'audio/ape', [...apeFields, 'year'], [], apeAliases),
  caseFor('wv', 'wavpack/unknown-count-multichannel.wv', 'audio/wavpack', [...apeFields, 'year'], [], apeAliases),
  caseFor('mpc', 'mpc/apev2-no-header.sv7.mpc', 'audio/musepack', [...apeFields, 'year'], [], apeAliases),
  caseFor('mpc', 'mpc/bach-goldberg-variatians-05.sv8.mpc', 'audio/musepack', [...apeFields, 'year'], [], apeAliases),
  caseFor('asf', 'asf/13 Thirty Dirty Birds.wma', 'audio/asf', [...asfFields, 'year'], [], apeAliases)
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
const patchComment = completePatch.comment as readonly { text: string }[];

function actualValue(common: ICommonTagsResult, field: Field): unknown {
  switch (field) {
    case 'picture':
      return common.picture?.map(picture => ({ format: picture.format, data: picture.data }));
    case 'lyrics':
      return common.lyrics?.map(entry => entry.text);
    case 'comment':
      return common.comment?.map(entry => entry.text);
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
    case 'comment':
      return patchComment.map(entry => entry.text);
    default:
      return expectedValue(field);
  }
}

function batchExpected(format: Format, field: Field): unknown {
  if (field === 'artist' && format === 'mp4') {
    return completePatch.artists[0];
  }
  if (field === 'albumartist' && ['flac', 'mp3', 'aac', 'wav', 'mp4', 'ogg'].includes(format)) {
    return completePatch.albumartists[0];
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
    case 'totaltracks':
      expect(common.track.of).toBe(Number(completePatch.totaltracks));
      break;
    case 'totaldiscs':
      expect(common.disk.of).toBe(Number(completePatch.totaldiscs));
      break;
    case 'movementTotal':
      expect(common.movementIndex.of).toBe(completePatch.movementTotal);
      break;
    case 'replaygain_track_gain_ratio':
      expect(common.replaygain_track_gain?.ratio).toBe(completePatch.replaygain_track_gain_ratio);
      break;
    case 'replaygain_track_peak_ratio':
      expect(common.replaygain_track_peak?.ratio).toBe(completePatch.replaygain_track_peak_ratio);
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
