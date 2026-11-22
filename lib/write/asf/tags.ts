import { UINT16_LE, UINT32_LE, UINT64_LE } from 'token-types';
import AsfGuid from '../../asf/AsfGuid.js';
import { asfTagMap } from '../../asf/AsfTagMapper.js';
import { CommonTagMapper } from '../../common/GenericTagMapper.js';
import { normalizePictureMimeType, PICTURE_TYPES } from '../../tokens/flac.js';
import { concatBytes } from '../core/bytes.js';
import { InvalidPatchError, UnsupportedFeatureError } from '../core/errors.js';
import { lyricsText, normalizeLyrics } from '../core/lyrics.js';
import { normalizeComments, normalizeNumberPair, textValues, validatePictures } from '../core/patch.js';
import type { TagPatch } from '../core/types.js';
import { commonText } from '../mapping/common.js';
import {
  type AsfObject,
  type Attribute,
  attributeBytes,
  CONTENT_NAMES,
  encodeUnicode,
  MAX_HEADER_BYTES,
  textLength,
  unicode
} from './objects.js';

const aliases = new Map<string, string[]>();
for (const [key, field] of Object.entries(asfTagMap)) {
  if (field !== undefined) {
    aliases.set(field, [...(aliases.get(field) ?? []), key]);
  }
}
const normalizedAliases = new Set([
  'year',
  'totaltracks',
  'totaldiscs',
  'replaygain_track_gain_ratio',
  'replaygain_track_peak_ratio'
]);

/** Common/native replacement removes all occurrences of the edited name, including language/stream variants. */
export function applyPatch(objects: AsfObject[], patch: TagPatch, streams: Set<number>, languages: number): boolean {
  const all = (): AsfObject[] => objects.flatMap(object => [object, ...(object.children ?? [])]);
  const byGuid = new Map<string, AsfObject>();
  for (const object of all()) {
    if (!byGuid.has(object.guid)) {
      byGuid.set(object.guid, object);
    }
  }
  const remember = (object: AsfObject): void => {
    if (!byGuid.has(object.guid)) {
      byGuid.set(object.guid, object);
    }
  };
  let changed = false;
  const remove = (keys: readonly string[]): void => {
    const names = new Set(keys);
    for (const object of all()) {
      const content = object.content;
      if (content) {
        CONTENT_NAMES.forEach((key, index) => {
          if (names.has(key) && content[index].length !== 0) {
            content[index] = new Uint8Array(0);
            object.dirty = changed = true;
          }
        });
      }
      if (object.attributes) {
        const retained = object.attributes.filter(attribute => !names.has(attribute.key));
        if (retained.length !== object.attributes.length) {
          object.attributes = retained;
          object.dirty = changed = true;
        }
      }
    }
  };
  const target = (guid: string): AsfObject => {
    const existing = byGuid.get(guid);
    if (existing) {
      return existing;
    }
    const object: AsfObject = { guid, raw: new Uint8Array(0), dirty: true };
    if (guid === AsfGuid.ContentDescriptionObject.str) {
      object.content = CONTENT_NAMES.map(() => new Uint8Array(0));
    } else {
      object.attributes = [];
    }
    remember(object);
    if (guid === AsfGuid.MetadataLibraryObject.str) {
      let extension = objects.find(obj => obj.guid === AsfGuid.HeaderExtensionObject.str);
      if (!extension) {
        extension = { guid: AsfGuid.HeaderExtensionObject.str, raw: new Uint8Array(0), children: [] };
        objects.push(extension);
        remember(extension);
      }
      (extension.children ??= []).push(object);
    } else {
      objects.push(object);
    }
    return object;
  };
  const append = (attributes: Attribute[]): void => {
    for (const attribute of attributes) {
      checkKey(attribute.key);
      if (attribute.stream !== 0 && !streams.has(attribute.stream)) {
        throw new InvalidPatchError('ASF native stream must identify an existing audio stream');
      }
      if (attribute.language !== 0 && attribute.language >= languages) {
        throw new InvalidPatchError('ASF native language must identify an existing Language List entry');
      }
      const fixed = CONTENT_NAMES.indexOf(attribute.key);
      const scoped = attribute.stream !== 0 || attribute.language !== 0;
      if (fixed >= 0 && attribute.type === 0 && attribute.length <= 0xffff && attributes.length === 1 && !scoped) {
        const object = target(AsfGuid.ContentDescriptionObject.str);
        (object.content ??= CONTENT_NAMES.map(() => new Uint8Array(0)))[fixed] = attributeBytes(attribute);
        object.dirty = true;
      } else {
        const library =
          fixed >= 0 || scoped || attribute.type === 6 || attribute.length > 0xffff || attributes.length > 1;
        const object = target(
          library ? AsfGuid.MetadataLibraryObject.str : AsfGuid.ExtendedContentDescriptionObject.str
        );
        (object.attributes ??= []).push(attribute);
        object.dirty = true;
      }
      changed = true;
    }
  };
  const replace = (keys: readonly string[], attributes: Attribute[]): void => {
    remove(keys);
    append(attributes);
  };
  const previous = (keys: string[], totalKey?: string): { no: number | null; of: number | null } => {
    let pair: { no: number | null; of: number | null } = { no: null, of: null };
    for (const object of all()) {
      for (const attribute of object.attributes ?? []) {
        if (!keys.includes(attribute.key) && attribute.key !== totalKey) {
          continue;
        }
        const bytes = attributeBytes(attribute);
        let value: string;
        switch (attribute.type) {
          case 0:
            value = unicode(bytes);
            break;
          case 3:
            value = String(UINT32_LE.get(bytes, 0));
            break;
          case 4:
            value = String(UINT64_LE.get(bytes, 0));
            break;
          case 5:
            value = String(UINT16_LE.get(bytes, 0));
            break;
          default:
            throw new UnsupportedFeatureError('Cannot merge ASF track/disc numbers with non-text/non-integer metadata');
        }
        // Match MetadataCollector: the last number wins, an existing total survives
        // subsequent pairs, and each explicit TotalTracks replaces that total.
        if (attribute.key === totalKey) {
          pair.of = CommonTagMapper.toIntOrNull(value);
        } else {
          const next = CommonTagMapper.normalizeTrack(value);
          pair = { no: next.no, of: pair.of ?? next.of };
        }
      }
    }
    return pair;
  };
  for (const [field, value] of Object.entries(patch)) {
    if (value === undefined || field === 'native' || normalizedAliases.has(field)) {
      continue;
    }
    // The reader supplies this empty pair even when the format has no movement tag.
    if (field === 'movementIndex' && patch.movementIndex?.no === null && patch.movementIndex.of === null) {
      continue;
    }
    const keys = aliases.get(field);
    if (!keys) {
      throw new UnsupportedFeatureError(
        `ASF does not support common field: ${field}; use native for unmapped attributes`
      );
    }
    const key = keys[0];
    if (field === 'track' || field === 'disk') {
      const pair = normalizeNumberPair(patch[field], field);
      if (pair && pair.no === undefined && pair.of === undefined) {
        continue;
      }
      const existing =
        pair && (pair.no === undefined || pair.of === undefined)
          ? previous(keys, field === 'track' && pair.of === undefined ? 'TotalTracks' : undefined)
          : { no: null, of: null };
      const no = pair?.no !== undefined ? pair.no : existing.no;
      const of = pair?.of !== undefined ? pair.of : existing.of;
      if (field === 'track') {
        replace(keys, stringAttributes(key, pair === null || no === null ? null : [String(no)]));
        replace(['TotalTracks'], stringAttributes('TotalTracks', pair === null || of === null ? null : [String(of)]));
      } else {
        replace(
          keys,
          stringAttributes(
            key,
            pair === null || (no === null && of === null) ? null : [of === null ? String(no) : `${no ?? ''}/${of}`]
          )
        );
      }
    } else if (field === 'picture') {
      const attributes = (validatePictures(patch.picture) ?? []).map(picture => {
        const role = picture.type ?? 'Cover (front)';
        const type = PICTURE_TYPES.indexOf(role as (typeof PICTURE_TYPES)[number]);
        if (type < 0) {
          throw new InvalidPatchError(`Invalid ASF picture type: ${role}`);
        }
        const mime = normalizePictureMimeType(picture.format);
        const description = picture.description ?? picture.name ?? '';
        const length = 5 + textLength(mime) + textLength(description) + picture.data.length;
        if (length > MAX_HEADER_BYTES - 64) {
          throw new UnsupportedFeatureError('ASF picture exceeds 64 MiB');
        }
        return attribute(key, 1, length, () => {
          const prefix = new Uint8Array(5);
          prefix[0] = type;
          UINT32_LE.put(prefix, 1, picture.data.length);
          return concatBytes(prefix, encodeUnicode(mime), encodeUnicode(description), picture.data);
        });
      });
      replace(keys, attributes);
    } else if (field === 'compilation') {
      if (value !== null && typeof value !== 'boolean') {
        throw new InvalidPatchError('compilation must be a boolean or null');
      }
      replace(keys, value === null ? [] : [typedAttribute(key, { type: 'bool', value })]);
    } else if (field === 'rating') {
      if (value !== null && !Array.isArray(value)) {
        throw new InvalidPatchError('rating must be an array or null');
      }
      const ratings = (patch.rating ?? []).flatMap(entry => {
        if (!entry || typeof entry !== 'object') {
          throw new InvalidPatchError('Invalid ASF rating');
        }
        if (entry.rating === undefined) {
          return [];
        }
        if (
          typeof entry.rating !== 'number' ||
          !Number.isFinite(entry.rating) ||
          entry.rating < 0 ||
          entry.rating > 1
        ) {
          throw new InvalidPatchError('ASF rating must be between 0 and 1');
        }
        if (entry.source !== undefined && (typeof entry.source !== 'string' || entry.source.includes('|'))) {
          throw new InvalidPatchError('Invalid ASF rating source');
        }
        const sharedRating = Math.round(entry.rating * 99);
        // POPULARIMETER 1 means an explicit zero; positive ratings must encode at least 2.
        const popularimeterRating = entry.rating === 0 ? 1 : Math.max(2, 1 + Math.round(entry.rating * 254));
        return entry.source !== undefined || sharedRating === 0
          ? stringAttributes('POPULARIMETER', [`${entry.source ?? ''}|${popularimeterRating}|0`])
          : [typedAttribute('WM/SharedUserRating', { type: 'dword', value: sharedRating })];
      });
      replace(keys, ratings);
    } else {
      const values =
        field === 'comment'
          ? (normalizeComments(patch.comment)?.map(comment => comment.text ?? '') ?? null)
          : field === 'lyrics'
            ? (normalizeLyrics(patch.lyrics)?.map(lyricsText) ?? null)
            : commonText(value, field);
      replace(keys, stringAttributes(key, values));
    }
  }
  if (patch.native !== undefined && patch.native !== null) {
    if (typeof patch.native !== 'object' || Array.isArray(patch.native)) {
      throw new InvalidPatchError('native must be an object or null');
    }
    const entries = Object.entries(patch.native).filter(([, value]) => value !== undefined);
    remove(entries.map(([key]) => key));
    for (const [key, value] of entries) {
      checkKey(key);
      let attributes: Attribute[];
      if (value instanceof Uint8Array) {
        attributes = [attribute(key, 1, value.length, value)];
      } else if (
        value !== null &&
        typeof value === 'object' &&
        (!Array.isArray(value) || value.some(v => typeof v !== 'string'))
      ) {
        attributes = (Array.isArray(value) ? value : [value]).map(entry => typedAttribute(key, entry));
      } else {
        attributes = stringAttributes(key, textValues(value as string | readonly string[] | null));
      }
      append(attributes);
    }
  }
  return changed;
}

function checkKey(key: string): void {
  if (!key || textLength(key) > 0xffff) {
    throw new InvalidPatchError('ASF attribute names must contain 1–32766 UTF-16 code units');
  }
}

function attribute(key: string, type: number, length: number, value: Attribute['value']): Attribute {
  if (length > MAX_HEADER_BYTES - 64) {
    throw new UnsupportedFeatureError('ASF attribute exceeds 64 MiB');
  }
  return { key, type, length, value, language: 0, stream: 0 };
}

function stringAttributes(key: string, values: string[] | null | undefined): Attribute[] {
  return (values ?? []).map(value => attribute(key, 0, textLength(value), () => encodeUnicode(value)));
}

function typedAttribute(key: string, entry: Readonly<Record<string, unknown>>): Attribute {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new InvalidPatchError('ASF typed native attributes must be objects with type and value');
  }
  for (const property of Object.keys(entry)) {
    if (!['type', 'value', 'language', 'stream'].includes(property)) {
      throw new InvalidPatchError(`Unknown ASF native attribute property: ${property}`);
    }
  }
  const { type, value } = entry;
  let result: Attribute;
  if (type === 'unicode' && typeof value === 'string') {
    result = stringAttributes(key, [value])[0];
  } else if (type === 'binary' && value instanceof Uint8Array) {
    result = attribute(key, 1, value.length, value);
  } else if (
    type === 'guid' &&
    typeof value === 'string' &&
    /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value)
  ) {
    result = attribute(key, 6, 16, AsfGuid.encode(value));
  } else if (type === 'bool' && typeof value === 'boolean') {
    const bytes = new Uint8Array(2);
    UINT16_LE.put(bytes, 0, value ? 1 : 0);
    result = attribute(key, 2, 2, bytes);
  } else if (
    (type === 'word' || type === 'dword') &&
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= (type === 'word' ? 0xffff : 0xffffffff)
  ) {
    const bytes = new Uint8Array(type === 'word' ? 2 : 4);
    (type === 'word' ? UINT16_LE : UINT32_LE).put(bytes, 0, value);
    result = attribute(key, type === 'word' ? 5 : 3, bytes.length, bytes);
  } else if (
    type === 'qword' &&
    (typeof value === 'bigint' || (typeof value === 'number' && Number.isSafeInteger(value))) &&
    BigInt(value) >= 0n &&
    BigInt(value) <= 0xffffffffffffffffn
  ) {
    const bytes = new Uint8Array(8);
    UINT64_LE.put(bytes, 0, BigInt(value));
    result = attribute(key, 4, 8, bytes);
  } else {
    throw new InvalidPatchError(`Invalid ASF native attribute type/value for ${key}`);
  }
  for (const scope of ['language', 'stream'] as const) {
    const index = entry[scope] === undefined ? 0 : entry[scope];
    if (
      typeof index !== 'number' ||
      !Number.isInteger(index) ||
      index < 0 ||
      index > (scope === 'stream' ? 127 : 0xffff)
    ) {
      throw new InvalidPatchError(`Invalid ASF native ${scope}`);
    }
    result[scope] = index;
  }
  return result;
}
