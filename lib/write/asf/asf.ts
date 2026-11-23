import { UINT16_LE, UINT32_LE, UINT64_LE } from 'token-types';
import AsfGuid from '../../asf/AsfGuid.js';
import { concatBytes, ensureAvailable } from '../core/bytes.js';
import type { WriteChunk } from '../core/chunks.js';
import { InvalidFileError, InvalidPatchError, UnsupportedFeatureError } from '../core/errors.js';
import type { ByteSource } from '../core/source.shared.js';
import type { WriteOptions } from '../core/types.js';
import type { InternalPatch } from '../mapping/common.js';
import {
  MAX_HEADER_BYTES,
  MAX_OBJECTS,
  objectBytes,
  objectSize,
  parseObjects,
  renderObject,
  safeSize
} from './objects.js';
import { applyPatch } from './tags.js';

/** Rewrite only the ASF header; data packets and packet-number-based Simple Index objects stay byte-identical. */
export async function buildAsfUpdate(
  source: ByteSource,
  patch: InternalPatch,
  options: WriteOptions
): Promise<{ chunks: WriteChunk[]; paddingBytes: number }> {
  if (options.replaceId3 || options.stripFlacId3) {
    throw new UnsupportedFeatureError('ASF does not support ID3 options');
  }
  if (options.padding !== undefined && (!Number.isSafeInteger(options.padding) || options.padding < 0)) {
    throw new InvalidPatchError('ASF padding must be a non-negative safe integer');
  }
  const head = await source.read(0, 30);
  const oldSize = safeSize(head, 16);
  const count = UINT32_LE.get(head, 24);
  if (oldSize < 30 || oldSize > source.size || count === 0 || head[28] !== 1 || head[29] !== 2) {
    throw new InvalidFileError('Invalid ASF Header Object');
  }
  if (oldSize > MAX_HEADER_BYTES || count > MAX_OBJECTS) {
    throw new UnsupportedFeatureError('ASF header exceeds 64 MiB or 10000 objects');
  }
  const objects = parseObjects(await source.read(0, oldSize), 30, count);
  const singletons = new Set([
    AsfGuid.FilePropertiesObject.str,
    AsfGuid.HeaderExtensionObject.str,
    AsfGuid.ContentDescriptionObject.str,
    AsfGuid.ExtendedContentDescriptionObject.str,
    AsfGuid.MetadataObject.str,
    AsfGuid.MetadataLibraryObject.str,
    AsfGuid.LanguageListObject.str
  ]);
  const seen = new Set<string>();
  let languages = 0;
  const streams = new Set<number>();
  for (const object of objects.flatMap(obj => [obj, ...(obj.children ?? [])])) {
    if (singletons.has(object.guid)) {
      if (seen.has(object.guid)) {
        throw new InvalidFileError('Duplicate ASF singleton header object');
      }
      seen.add(object.guid);
    }
    if (object.guid === AsfGuid.StreamPropertiesObject.str) {
      const body = object.raw.subarray(24);
      ensureAvailable(body, 0, 54);
      const flags = UINT16_LE.get(body, 48);
      if (AsfGuid.decode(body) !== AsfGuid.AudioMedia.str || flags & 0x8000) {
        throw new UnsupportedFeatureError('ASF writing supports unencrypted audio-only streams');
      }
      const stream = flags & 0x7f;
      const audioLength = UINT32_LE.get(body, 40);
      if (
        !stream ||
        streams.has(stream) ||
        audioLength < 16 ||
        54 + audioLength + UINT32_LE.get(body, 44) !== body.length
      ) {
        throw new InvalidFileError('Invalid ASF audio Stream Properties Object');
      }
      streams.add(stream);
    }
    if (object.guid === AsfGuid.LanguageListObject.str) {
      const body = object.raw.subarray(24);
      ensureAvailable(body, 0, 2);
      languages = UINT16_LE.get(body, 0);
      let offset = 2;
      for (let i = 0; i < languages; i++) {
        ensureAvailable(body, offset, 1);
        const length = body[offset++];
        ensureAvailable(body, offset, length);
        if (length % 2 !== 0) {
          throw new InvalidFileError('Invalid ASF Language List string length');
        }
        offset += length;
      }
      if (offset !== body.length) {
        throw new InvalidFileError('ASF Language List count does not consume the object');
      }
    }
  }
  for (const object of objects.flatMap(obj => [obj, ...(obj.children ?? [])])) {
    if (object.guid === AsfGuid.ExtendedStreamPropertiesObject.str) {
      validateExtendedStream(object.raw.subarray(24), streams);
    }
  }
  const properties = objects.find(object => object.guid === AsfGuid.FilePropertiesObject.str);
  if (!properties || streams.size === 0) {
    throw new InvalidFileError('ASF writing requires File Properties and audio Stream Properties objects');
  }
  const body = properties.raw.subarray(24);
  if (body.length !== 80) {
    throw new InvalidFileError('Invalid ASF File Properties Object size');
  }
  if (UINT32_LE.get(body, 64) & 1) {
    throw new UnsupportedFeatureError('Broadcast ASF files cannot be rewritten');
  }
  // Other taggers can resize the header without updating the declared file size.
  // Validate actual object/data bounds instead, and repair this field when rendering an edit.
  const data = await source.read(oldSize, 50);
  const dataSize = safeSize(data, 16);
  if (
    AsfGuid.decode(data) !== AsfGuid.DataObject.str ||
    dataSize < 50 ||
    dataSize > source.size - oldSize ||
    AsfGuid.decode(data, 24) !== AsfGuid.decode(body) ||
    UINT16_LE.get(data, 48) !== 0x0101 ||
    UINT64_LE.get(data, 40) !== UINT64_LE.get(body, 32)
  ) {
    throw new InvalidFileError('Invalid ASF Data Object size, file identifier, packet count or reserved bytes');
  }
  const minPacket = UINT32_LE.get(body, 68);
  const maxPacket = UINT32_LE.get(body, 72);
  if (minPacket === 0 || maxPacket < minPacket) {
    throw new InvalidFileError('Invalid ASF packet size');
  }
  const packetCount = UINT64_LE.get(data, 40);
  const packetBytes = BigInt(dataSize - 50);
  if (packetBytes < packetCount * BigInt(minPacket) || packetBytes > packetCount * BigInt(maxPacket)) {
    throw new InvalidFileError('ASF packet count and data size disagree');
  }
  // Other index formats can contain absolute offsets. Simple Index entries refer to unchanged packet numbers.
  let offset = oldSize + dataSize;
  let indexes = 0;
  while (offset < source.size) {
    if (++indexes > MAX_OBJECTS) {
      throw new UnsupportedFeatureError('ASF file exceeds 10000 trailing indexes');
    }
    const index = await source.read(offset, 24);
    const size = safeSize(index, 16);
    if (size < 24 || size > source.size - offset) {
      throw new InvalidFileError('Invalid ASF trailing object size');
    }
    if (AsfGuid.decode(index) !== AsfGuid.SimpleIndexObject.str) {
      throw new UnsupportedFeatureError('ASF writing supports only trailing Simple Index objects');
    }
    if (size < 56) {
      throw new InvalidFileError('Truncated ASF Simple Index Object');
    }
    const info = await source.read(offset + 24, 32);
    if (AsfGuid.decode(info) !== AsfGuid.decode(body) || 56 + UINT32_LE.get(info, 28) * 6 !== size) {
      throw new InvalidFileError('Invalid ASF Simple Index Object');
    }
    offset += size;
  }
  let paddingBytes = objects
    .flatMap(object => [object, ...(object.children ?? [])])
    .filter(obj => obj.guid === AsfGuid.PaddingObject.str)
    .reduce((sum, obj) => sum + obj.raw.length - 24, 0);
  const changed = applyPatch(objects, patch, streams, languages);
  if (!changed && options.padding === undefined) {
    return { chunks: [{ source, offset: 0, length: source.size }], paddingBytes };
  }
  // Consolidate padding at the end of the main header, as conventional ASF taggers do.
  const retained = objects.filter(obj => obj.guid !== AsfGuid.PaddingObject.str);
  for (const object of retained) {
    if (object.children) {
      object.children = object.children.filter(child => child.guid !== AsfGuid.PaddingObject.str);
    }
  }
  const needed = 30 + retained.reduce((sum, obj) => sum + objectSize(obj), 0);
  paddingBytes = options.padding ?? Math.max(8192, oldSize - needed - 24);
  const size = needed + (paddingBytes ? 24 + paddingBytes : 0);
  const objectCount = retained.length + (paddingBytes ? 1 : 0);
  const totalObjects = objectCount + retained.reduce((sum, object) => sum + (object.children?.length ?? 0), 0);
  const totalRecords = retained
    .flatMap(object => [object, ...(object.children ?? [])])
    .reduce((sum, object) => sum + (object.attributes?.length ?? 0), 0);
  if (size > MAX_HEADER_BYTES || totalObjects > MAX_OBJECTS || totalRecords > 100_000) {
    throw new UnsupportedFeatureError('ASF output header exceeds 64 MiB, 10000 objects or 100000 metadata records');
  }
  const newFileSize = source.size - oldSize + size;
  if (!Number.isSafeInteger(newFileSize)) {
    throw new UnsupportedFeatureError('ASF output file size exceeds the safe integer range');
  }
  // Keep the file identifier shared by File Properties, Data and Simple Index objects.
  // All encoded data and indexes are copied without modification.
  UINT64_LE.put(properties.raw, 40, BigInt(newFileSize));
  UINT64_LE.put(head, 16, BigInt(size));
  UINT32_LE.put(head, 24, objectCount);
  const rendered = retained.map(renderObject);
  if (paddingBytes) {
    rendered.push(objectBytes(AsfGuid.PaddingObject.str, new Uint8Array(paddingBytes)));
  }
  return {
    chunks: [concatBytes(head, ...rendered), { source, offset: oldSize, length: source.size - oldSize }],
    paddingBytes
  };
}

/** Extended stream objects may hide another Stream Properties Object after their variable-length records. */
function validateExtendedStream(bytes: Uint8Array, streams: Set<number>): void {
  ensureAvailable(bytes, 0, 64);
  if (!streams.has(UINT16_LE.get(bytes, 48) & 0x7f)) {
    throw new UnsupportedFeatureError('ASF extended streams must refer to audio streams defined in the main header');
  }
  let offset = 64;
  for (let index = 0; index < UINT16_LE.get(bytes, 60); index++) {
    ensureAvailable(bytes, offset, 4);
    const length = UINT16_LE.get(bytes, offset + 2);
    ensureAvailable(bytes, offset + 4, length);
    if (length % 2 !== 0) {
      throw new InvalidFileError('Invalid ASF extended stream name length');
    }
    offset += 4 + length;
  }
  for (let index = 0; index < UINT16_LE.get(bytes, 62); index++) {
    ensureAvailable(bytes, offset, 22);
    const length = UINT32_LE.get(bytes, offset + 18);
    ensureAvailable(bytes, offset + 22, length);
    offset += 22 + length;
  }
  if (offset !== bytes.length) {
    throw new UnsupportedFeatureError('ASF embedded stream definitions cannot be rewritten');
  }
}
