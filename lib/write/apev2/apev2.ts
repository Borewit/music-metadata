import { UINT32_LE } from 'token-types';
import { apev2TagMap } from '../../apev2/APEv2TagMapper.js';
import { DescriptorParser } from '../../apev2/APEv2Token.js';
import { CommonTagMapper } from '../../common/GenericTagMapper.js';
import { concatBytes, decodeAscii, decodeUtf8, encodeUtf8, readUInt32LE } from '../core/bytes.js';
import type { WriteChunk } from '../core/chunks.js';
import { InvalidFileError, InvalidPatchError, UnsupportedFeatureError } from '../core/errors.js';
import { lyricsText, normalizeLyrics } from '../core/lyrics.js';
import { normalizeComments, normalizeNumberPair, textValues, validatePictures } from '../core/patch.js';
import type { ByteSource } from '../core/source.shared.js';
import type { TagPatch, WriteOptions } from '../core/types.js';
import { commonText, structuredText } from '../mapping/common.js';

const MAX_TAG_BYTES = 64 * 1024 * 1024;
const MAX_ITEMS = 100_000;
const HAS_HEADER = 0x80000000;
const IS_HEADER = 0x20000000;
const FRONT = 'Cover Art (Front)';
const BACK = 'Cover Art (Back)';
const aliases = new Map<string, string[]>();
for (const [key, field] of Object.entries(apev2TagMap)) {
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

interface Item {
  key: string;
  flags: number;
  length: number;
  /** Patched text/artwork is encoded only after the complete output budget is checked. */
  value: Uint8Array | (() => Uint8Array);
  /** Untouched items retain their exact serialized representation. */
  raw?: Uint8Array;
}

interface Tag {
  start: number;
  end: number;
  readOnly: boolean;
  items: Map<string, Item>;
}

/** APEv2 tail metadata uses the same source-range plan on all three containers and both platforms. */
export async function buildApeUpdate(
  source: ByteSource,
  patch: TagPatch,
  options: WriteOptions,
  format: 'ape' | 'wv' | 'mpc'
): Promise<{ chunks: WriteChunk[]; paddingBytes: number }> {
  if (options.padding !== undefined || options.replaceId3 || options.stripFlacId3) {
    throw new UnsupportedFeatureError('APEv2 does not support padding or ID3 options');
  }
  if (decodeAscii(await source.read(0, 3)) === 'ID3') {
    throw new UnsupportedFeatureError('APEv2 writing does not support a leading ID3 tag');
  }
  const tag = await readTag(source);
  await validateAudioBoundary(source, tag.start, format);
  const changed = applyPatch(tag.items, patch);
  if (changed && tag.readOnly) {
    throw new UnsupportedFeatureError('Cannot modify a read-only APEv2 tag');
  }
  if (!changed) {
    return { chunks: [{ source, offset: 0, length: source.size }], paddingBytes: 0 };
  }
  const metadata = serializeTag(tag.items);
  return {
    chunks: [
      { source, offset: 0, length: tag.start },
      metadata,
      { source, offset: tag.end, length: source.size - tag.end }
    ],
    paddingBytes: 0
  };
}

async function readTag(source: ByteSource): Promise<Tag> {
  let end = source.size;
  if (end >= 128 && decodeAscii(await source.read(end - 128, 3)) === 'TAG') {
    end -= 128;
  }
  const tag: Tag = { start: end, end, readOnly: false, items: new Map() };
  if (end < 32) {
    return tag;
  }
  const footer = await source.read(end - 32, 32);
  if (decodeAscii(footer.subarray(0, 8)) !== 'APETAGEX') {
    return tag;
  }
  const { size, count, flags } = validateFooter(footer, false);
  if (size > end) {
    throw new InvalidFileError('APEv2 tag extends before the file');
  }
  const itemStart = end - size;
  tag.start = itemStart - (flags & HAS_HEADER ? 32 : 0);
  tag.readOnly = Boolean(flags & 1);
  if (tag.start < 0) {
    throw new InvalidFileError('APEv2 header extends before the file');
  }
  if (flags & HAS_HEADER) {
    const header = await source.read(tag.start, 32);
    const parsed = validateFooter(header, true);
    if (parsed.size !== size || parsed.count !== count || parsed.flags !== (flags | IS_HEADER) >>> 0) {
      throw new InvalidFileError('APEv2 header and footer disagree');
    }
  }
  // Bound allocation and item traversal before reading the payload.
  const payload = await source.read(itemStart, size - 32);
  let offset = 0;
  for (let index = 0; index < count; index++) {
    const start = offset;
    if (offset + 11 > payload.length) {
      throw new InvalidFileError('Truncated APEv2 item');
    }
    const length = readUInt32LE(payload, offset);
    const itemFlags = readUInt32LE(payload, offset + 4);
    if (itemFlags & ~7) {
      throw new InvalidFileError('Invalid APEv2 item flags');
    }
    offset += 8;
    const terminator = payload.subarray(offset, offset + 256).indexOf(0);
    const keyEnd = terminator < 0 ? -1 : offset + terminator;
    if (keyEnd < 0 || keyEnd - offset > 255) {
      throw new InvalidFileError('Invalid APEv2 item key terminator');
    }
    const key = decodeAscii(payload.subarray(offset, keyEnd));
    if (!validKey(key)) {
      throw new InvalidFileError('Invalid APEv2 item key');
    }
    offset = keyEnd + 1;
    if (length > payload.length - offset) {
      throw new InvalidFileError('APEv2 item value exceeds tag boundary');
    }
    const id = key.toUpperCase();
    if (tag.items.has(id)) {
      throw new InvalidFileError(`Duplicate APEv2 item: ${key}`);
    }
    tag.items.set(id, {
      key,
      flags: itemFlags,
      length,
      value: payload.subarray(offset, offset + length),
      raw: payload.subarray(start, offset + length)
    });
    offset += length;
  }
  if (offset !== payload.length) {
    throw new InvalidFileError('APEv2 item count does not consume the tag');
  }
  return tag;
}

function validateFooter(bytes: Uint8Array, header: boolean): { size: number; count: number; flags: number } {
  if (decodeAscii(bytes.subarray(0, 8)) !== 'APETAGEX') {
    throw new InvalidFileError('Missing APEv2 header');
  }
  if (readUInt32LE(bytes, 8) !== 2000) {
    throw new UnsupportedFeatureError('Only APEv2 version 2000 can be written');
  }
  const size = readUInt32LE(bytes, 12);
  const count = readUInt32LE(bytes, 16);
  const flags = readUInt32LE(bytes, 20);
  // Bit 30 means HAS_NO_FOOTER, not "contains footer". This writer requires a footer.
  if (
    Boolean(flags & IS_HEADER) !== header ||
    (flags & ~(HAS_HEADER | IS_HEADER | 1)) !== 0 ||
    bytes.subarray(24).some(byte => byte !== 0)
  ) {
    throw new InvalidFileError('Invalid APEv2 header/footer flags or reserved bytes');
  }
  if (size < 32 || count > Math.floor((size - 32) / 11)) {
    throw new InvalidFileError('Invalid APEv2 tag size or item count');
  }
  if (size + (flags & HAS_HEADER ? 32 : 0) > MAX_TAG_BYTES || count > MAX_ITEMS) {
    throw new UnsupportedFeatureError('APEv2 tag exceeds 64 MiB or 100000 items');
  }
  return { size, count, flags };
}

/** Protect declared container headers/audio extents; do not decode or rewrite audio frames. */
async function validateAudioBoundary(source: ByteSource, end: number, format: 'ape' | 'wv' | 'mpc'): Promise<void> {
  if (format === 'ape') {
    const bytes = await source.read(0, DescriptorParser.len);
    const descriptor = DescriptorParser.get(bytes, 0);
    if (descriptor.version < 3.98) {
      throw new UnsupportedFeatureError('Monkey’s Audio before version 3.98 is not supported for writing');
    }
    const audioEnd =
      descriptor.descriptorBytes +
      descriptor.headerBytes +
      descriptor.seekTableBytes +
      descriptor.headerDataBytes +
      descriptor.apeFrameDataBytes +
      descriptor.apeFrameDataBytesHigh * 2 ** 32 +
      descriptor.terminatingDataBytes;
    if (
      descriptor.descriptorBytes < 52 ||
      descriptor.headerBytes < 24 ||
      !Number.isSafeInteger(audioEnd) ||
      audioEnd > end
    ) {
      throw new InvalidFileError('APEv2 tag overlaps Monkey’s Audio data or the audio is truncated');
    }
    if (audioEnd + 8 <= end && decodeAscii(await source.read(audioEnd, 8)) === 'APETAGEX') {
      throw new UnsupportedFeatureError('APEv2 writing requires a single footer-delimited tail tag');
    }
  } else if (format === 'wv') {
    const header = await source.read(0, 32);
    const size = readUInt32LE(header, 4) + 8;
    if (size < 32 || size > end) {
      throw new InvalidFileError('APEv2 tag overlaps the WavPack block or the block is truncated');
    }
  } else if (end < 24) {
    throw new InvalidFileError('APEv2 tag overlaps the Musepack header');
  }
}

function validKey(key: string): boolean {
  return /^[\x20-\x7e]{2,255}$/.test(key) && !['OGGS', 'TAG', 'ID3', 'MP+'].includes(key.toUpperCase());
}

function applyPatch(items: Map<string, Item>, patch: TagPatch): boolean {
  let changed = false;
  const replace = (keys: readonly string[], item?: Item): void => {
    for (const key of keys) {
      const previous = items.get(key.toUpperCase());
      if (previous?.flags && previous.flags & 1) {
        throw new UnsupportedFeatureError(`Cannot modify read-only APEv2 item: ${key}`);
      }
    }
    for (const key of keys) {
      const id = key.toUpperCase();
      changed = items.delete(id) || changed;
    }
    if (item) {
      items.set(item.key.toUpperCase(), item);
      changed = true;
    }
  };
  const structured = structuredText(patch);
  for (const [field, value] of Object.entries(patch)) {
    if (value === undefined || field === 'native' || normalizedAliases.has(field)) {
      continue;
    }
    const keys = aliases.get(field);
    if (!keys) {
      throw new UnsupportedFeatureError(`APEv2 does not support common field: ${field}; use native for unmapped items`);
    }
    const key = field === 'disk' ? 'Disc' : keys[keys.length - 1];
    if (field === 'picture') {
      const pictures = validatePictures(patch.picture);
      const covers = new Map<string, Item>();
      for (const picture of pictures ?? []) {
        const role = picture.type ?? 'Cover (front)';
        const coverKey = role === 'Cover (front)' ? FRONT : role === 'Cover (back)' ? BACK : undefined;
        if (!coverKey) {
          throw new UnsupportedFeatureError('APEv2 supports only front and back cover pictures');
        }
        if (covers.has(coverKey)) {
          throw new InvalidPatchError(`Duplicate APEv2 picture role: ${role}`);
        }
        const name = picture.name ?? picture.description ?? '';
        const prefixLength = textSize([name], coverKey);
        const length = prefixLength + 1 + picture.data.length;
        if (length > MAX_TAG_BYTES - 64) {
          throw new UnsupportedFeatureError('APEv2 picture exceeds 64 MiB');
        }
        covers.set(coverKey, {
          key: coverKey,
          flags: 2,
          length,
          value: () => concatBytes(encodeUtf8(name), new Uint8Array(1), picture.data)
        });
      }
      // Check both read-only roles before changing either of them.
      replace(keys);
      for (const cover of covers.values()) {
        replace([cover.key], cover);
      }
      continue;
    }
    let values: string[] | null;
    if (field === 'track' || field === 'disk') {
      const pair = normalizeNumberPair(patch[field], field);
      if (pair && pair.no === undefined && pair.of === undefined) {
        continue;
      }
      const previous = keys.map(alias => items.get(alias.toUpperCase())).find(item => item !== undefined);
      if (pair && (pair.no === undefined || pair.of === undefined) && previous && (previous.flags & 6) !== 0) {
        throw new UnsupportedFeatureError(`Cannot merge ${field} with a non-text APEv2 item`);
      }
      const existing = previous
        ? CommonTagMapper.normalizeTrack(decodeUtf8(itemBytes(previous)).split('\0')[0])
        : { no: null, of: null };
      const no = pair?.no !== undefined ? pair.no : existing.no;
      const of = pair?.of !== undefined ? pair.of : existing.of;
      values = pair === null || (no === null && of === null) ? null : [of === null ? String(no) : `${no ?? ''}/${of}`];
    } else if (field === 'comment') {
      values = normalizeComments(patch.comment)?.map(comment => comment.text ?? '') ?? null;
    } else if (field === 'lyrics') {
      values = normalizeLyrics(patch.lyrics)?.map(lyricsText) ?? null;
    } else {
      values = commonText(Object.hasOwn(structured, field) ? structured[field] : value, field);
    }
    replace(keys, textItem(key, values));
  }
  if (patch.native !== undefined && patch.native !== null) {
    if (typeof patch.native !== 'object' || Array.isArray(patch.native)) {
      throw new InvalidPatchError('native must be an object or null');
    }
    const seen = new Set<string>();
    for (const [key, value] of Object.entries(patch.native)) {
      if (value === undefined) {
        continue;
      }
      if (!validKey(key)) {
        throw new InvalidPatchError(`Invalid APEv2 item key: ${key}`);
      }
      if (seen.has(key.toUpperCase())) {
        throw new InvalidPatchError(`Duplicate APEv2 native key: ${key}`);
      }
      seen.add(key.toUpperCase());
      replace(
        [key],
        value instanceof Uint8Array
          ? { key, flags: 2, length: value.length, value }
          : textItem(key, textValues(value as string | readonly string[] | null))
      );
    }
  }
  return changed;
}

function textItem(key: string, values: string[] | null | undefined): Item | undefined {
  return values?.length
    ? { key, flags: 0, length: textSize(values, key), value: () => encodeUtf8(values.join('\0')) }
    : undefined;
}

function textSize(values: readonly string[], key: string): number {
  let size = Math.max(0, values.length - 1);
  for (const value of values) {
    for (const char of value) {
      const point = char.charCodeAt(0);
      if (point === 0) {
        throw new InvalidPatchError(`APEv2 text must not contain NUL: ${key}`);
      }
      size += char.length === 2 ? 4 : point < 0x80 ? 1 : point < 0x800 ? 2 : 3;
      if (size > MAX_TAG_BYTES - 64) {
        throw new UnsupportedFeatureError('APEv2 text exceeds 64 MiB');
      }
    }
  }
  if (size > MAX_TAG_BYTES - 64) {
    throw new UnsupportedFeatureError('APEv2 text exceeds 64 MiB');
  }
  return size;
}

function serializeTag(items: Map<string, Item>): Uint8Array {
  if (items.size === 0) {
    return new Uint8Array(0);
  }
  if (items.size > MAX_ITEMS) {
    throw new UnsupportedFeatureError('APEv2 tag exceeds 100000 items');
  }
  let size = 64;
  for (const item of items.values()) {
    size += itemSize(item);
    if (size > MAX_TAG_BYTES) {
      throw new UnsupportedFeatureError('APEv2 tag exceeds 64 MiB');
    }
  }
  const result = new Uint8Array(size);
  const envelope = (offset: number, flags: number): void => {
    result.set(encodeUtf8('APETAGEX'), offset);
    UINT32_LE.put(result, offset + 8, 2000);
    UINT32_LE.put(result, offset + 12, size - 32);
    UINT32_LE.put(result, offset + 16, items.size);
    UINT32_LE.put(result, offset + 20, flags);
  };
  envelope(0, HAS_HEADER | IS_HEADER);
  let offset = 32;
  for (const item of items.values()) {
    if (item.raw) {
      result.set(item.raw, offset);
      offset += item.raw.length;
    } else {
      UINT32_LE.put(result, offset, item.length);
      UINT32_LE.put(result, offset + 4, item.flags);
      result.set(encodeUtf8(item.key), offset + 8);
      offset += 9 + item.key.length;
      result.set(itemBytes(item), offset);
      offset += item.length;
    }
  }
  envelope(offset, HAS_HEADER);
  return result;
}

function itemSize(item: Item): number {
  return item.raw?.length ?? 9 + item.key.length + item.length;
}

function itemBytes(item: Item): Uint8Array {
  return typeof item.value === 'function' ? item.value() : item.value;
}
