import * as Token from 'token-types';
import { InvalidFileError, UnsupportedFeatureError } from '../core/errors.js';
import type { ByteSource } from '../core/source.js';
import type { TagPatch, WriteOptions } from '../core/types.js';
import type { WriteChunk } from '../core/writer.js';
import { type AtomBudget, atom, type Box, boxes, copyBox, fourcc, header, limit, maxAtoms, zeros } from './atoms.js';
import { editItems } from './tags.js';

/**
 * Rebuild only moov; copy media ranges unchanged and relocate absolute chunk offsets.
 * stco/co64 contain file offsets, so media after the replaced movie moves by its size delta.
 * https://developer.apple.com/documentation/quicktime-file-format/chunk_offset_atom
 */
export async function buildMp4Update(
  source: ByteSource,
  patch: TagPatch,
  options: WriteOptions
): Promise<{ chunks: WriteChunk[]; paddingBytes: number }> {
  if (options.padding !== undefined) {
    throw new UnsupportedFeatureError('MP4 padding options are not supported');
  }
  if (options.replaceId3) {
    throw new UnsupportedFeatureError('replaceId3 is not supported for MP4');
  }
  const top: Box[] = [];
  let start = 0;
  while (start < source.size) {
    const bytes = await source.read(start, Math.min(16, source.size - start));
    // Parse the header against the physical file boundary, without reading payloads.
    if (bytes.length < 8) {
      throw new InvalidFileError('Truncated MP4 header');
    }
    const raw = Token.UINT32_BE.get(bytes, 0);
    const size =
      raw === 1
        ? bytes.length < 16
          ? 0
          : Number(Token.UINT64_BE.get(bytes, 8))
        : raw === 0
          ? source.size - start
          : raw;
    const h = raw === 1 ? 16 : 8;
    if (!Number.isSafeInteger(size) || size < h || size > source.size - start) {
      throw new InvalidFileError('Invalid MP4 top-level size');
    }
    const box = { type: fourcc(bytes, 4), start, end: start + size, header: h };
    if (['moof', 'sidx', 'mfra'].includes(box.type)) {
      throw new UnsupportedFeatureError('Fragmented/indexed MP4 is not supported');
    }
    if (['meta', 'meco', 'iloc', 'saio', 'cmov'].includes(box.type)) {
      throw new UnsupportedFeatureError('Top-level MP4 metadata is not supported');
    }
    if (top.length >= maxAtoms) {
      throw new UnsupportedFeatureError('MP4 atom count exceeds limit');
    }
    top.push(box);
    start += size;
  }
  const movies = top.filter(b => b.type === 'moov');
  if (movies.length !== 1 || !top.some(b => b.type === 'mdat')) {
    throw new InvalidFileError('MP4 requires one moov and media data');
  }
  const movie = movies[0];
  if (movie.end - movie.start > limit) {
    throw new UnsupportedFeatureError('MP4 movie metadata exceeds 64 MiB');
  }
  const original = await source.read(movie.start, movie.end - movie.start);
  const containers = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'dinf', 'udta']);
  let metadataCount = 0;
  let budget: AtomBudget = { remaining: maxAtoms };
  let offsetTables = 0;
  let offsetCount = 0;
  const media = top.filter(b => b.type === 'mdat');
  const containsMedia = (offset: number) => {
    let low = 0;
    let high = media.length - 1;
    while (low <= high) {
      const mid = (low + high) >>> 1;
      const box = media[mid];
      if (offset < box.start + box.header) {
        high = mid - 1;
      } else if (offset >= box.end) {
        low = mid + 1;
      } else {
        return true;
      }
    }
    return false;
  };
  const preflightBudget = { remaining: maxAtoms };
  const rootChildren = boxes(original, movie.header, original.length, preflightBudget);
  const userData = rootChildren.filter(b => b.type === 'udta');
  const existingMeta =
    rootChildren.some(b => b.type === 'meta') ||
    userData.some(b => boxes(original, b.start + b.header, b.end, preflightBudget).some(c => c.type === 'meta'));
  const newMeta = () => {
    const handler = atom(
      'hdlr',
      zeros,
      zeros,
      Uint8Array.from('mdir', c => c.charCodeAt(0)),
      new Uint8Array(12),
      new Uint8Array(1)
    );
    return atom('meta', zeros, handler, editItems(new Uint8Array(), patch, budget));
  };
  const rebuild = (bytes: Uint8Array, box: Box, delta: number, depth = 0, path = ''): Uint8Array => {
    path = `${path}/${box.type}`;
    if (depth > 32) {
      throw new InvalidFileError('MP4 nesting exceeds limit');
    }
    if (['mvex', 'iloc', 'saio', 'cmov', 'meco'].includes(box.type)) {
      throw new UnsupportedFeatureError(`Unsupported MP4 offset structure: ${box.type}`);
    }
    if (box.type === 'dref') {
      const start = box.start + box.header;
      if (box.end - start < 8 || Token.UINT32_BE.get(bytes, start) !== 0) {
        throw new InvalidFileError('Invalid MP4 data reference');
      }
      const references = boxes(bytes, start + 8, box.end, budget);
      if (references.length !== Token.UINT32_BE.get(bytes, start + 4)) {
        throw new InvalidFileError('Invalid MP4 data reference count');
      }
      for (const ref of references) {
        if (
          ref.type !== 'url ' ||
          ref.end - ref.start !== ref.header + 4 ||
          Token.UINT32_BE.get(bytes, ref.start + ref.header) !== 1
        ) {
          throw new UnsupportedFeatureError('External MP4 data references are not supported');
        }
      }
    }
    if (box.type === 'stco' || box.type === 'co64') {
      offsetTables++;
      const body = bytes.subarray(box.start + box.header, box.end);
      if (body.length < 8 || Token.UINT32_BE.get(body, 0) !== 0) {
        throw new InvalidFileError('Invalid chunk-offset table');
      }
      const count = Token.UINT32_BE.get(body, 4);
      const width = box.type === 'stco' ? 4 : 8;
      if (count > (body.length - 8) / width || body.length !== 8 + count * width) {
        throw new InvalidFileError('Truncated chunk-offset table');
      }
      offsetCount += count;
      if (offsetCount > 5_000_000) {
        throw new UnsupportedFeatureError('MP4 chunk-offset count exceeds limit');
      }
      let wide = width === 8;
      for (let i = 0; i < count; i++) {
        const pos = 8 + i * width;
        const offset = width === 4 ? BigInt(Token.UINT32_BE.get(body, pos)) : Token.UINT64_BE.get(body, pos);
        if (offset > BigInt(Number.MAX_SAFE_INTEGER)) {
          throw new UnsupportedFeatureError('MP4 offset exceeds safe range');
        }
        const physical = Number(offset);
        if (!containsMedia(physical)) {
          throw new UnsupportedFeatureError('MP4 chunk references external or non-media data');
        }
        const updated = offset + BigInt(physical >= movie.end ? delta : 0);
        if (updated > 0xffffffffn) {
          wide = true;
        }
      }
      const output = new Uint8Array(8 + count * (wide ? 8 : 4));
      Token.UINT32_BE.put(output, 4, count);
      for (let i = 0; i < count; i++) {
        const pos = 8 + i * width;
        const original = width === 4 ? BigInt(Token.UINT32_BE.get(body, pos)) : Token.UINT64_BE.get(body, pos);
        const offset = original + BigInt(original >= BigInt(movie.end) ? delta : 0);
        if (wide) {
          Token.UINT64_BE.put(output, 8 + i * 8, offset);
        } else {
          Token.UINT32_BE.put(output, 8 + i * 4, Number(offset));
        }
      }
      return atom(wide ? 'co64' : 'stco', output);
    }
    if (box.type === 'meta') {
      if (!['/moov/meta', '/moov/udta/meta'].includes(path)) {
        throw new UnsupportedFeatureError('Track-level MP4 metadata is not supported');
      }
      if (++metadataCount > 1) {
        throw new UnsupportedFeatureError('Multiple MP4 metadata containers are not supported');
      }
      const body = box.start + box.header;
      if (box.end - body < 4 || Token.UINT32_BE.get(bytes, body) !== 0) {
        throw new UnsupportedFeatureError('Unsupported MP4 meta version');
      }
      const children = boxes(bytes, body + 4, box.end, budget);
      if (children.some(child => ['iloc', 'saio', 'keys'].includes(child.type))) {
        throw new UnsupportedFeatureError('Unsupported MP4 metadata offset/key structure');
      }
      const handler = children.find(c => c.type === 'hdlr');
      if (
        !handler ||
        handler.end - handler.start < handler.header + 12 ||
        fourcc(bytes, handler.start + handler.header + 8) !== 'mdir'
      ) {
        throw new UnsupportedFeatureError('Only iTunes mdir metadata is writable');
      }
      const lists = children.filter(c => c.type === 'ilst');
      if (lists.length > 1) {
        throw new InvalidFileError('Duplicate MP4 item lists');
      }
      return atom(
        'meta',
        zeros,
        ...children.map(c =>
          c.type === 'ilst' ? editItems(bytes.subarray(c.start + c.header, c.end), patch, budget) : copyBox(bytes, c)
        ),
        ...(lists.length ? [] : [editItems(new Uint8Array(), patch, budget)])
      );
    }
    if (containers.has(box.type)) {
      const parts = boxes(bytes, box.start + box.header, box.end, budget).map(c =>
        rebuild(bytes, c, delta, depth + 1, path)
      );
      if (!existingMeta && path === '/moov/udta' && box.start === userData[0]?.start) {
        parts.push(newMeta());
      }
      if (!existingMeta && path === '/moov' && userData.length === 0) {
        parts.push(atom('udta', newMeta()));
      }
      return atom(box.type, ...parts);
    }
    return copyBox(bytes, box);
  };
  const build = (delta: number) => {
    metadataCount = 0;
    budget = { remaining: maxAtoms };
    offsetTables = 0;
    offsetCount = 0;
    const result = rebuild(original, header(original, 0, original.length), delta);
    if (!offsetTables) {
      throw new UnsupportedFeatureError('MP4 requires a chunk-offset table');
    }
    if (result.length > limit) {
      throw new UnsupportedFeatureError('MP4 movie metadata exceeds 64 MiB');
    }
    return result;
  };
  let updated = build(0);
  for (let pass = 0; ; pass++) {
    if (pass === 16) {
      throw new UnsupportedFeatureError('MP4 chunk offset promotion did not converge');
    }
    const next = build(updated.length - original.length);
    if (next.length === updated.length) {
      updated = next;
      break;
    }
    updated = next;
  }
  return {
    chunks: [
      { source, offset: 0, length: movie.start },
      updated,
      { source, offset: movie.end, length: source.size - movie.end }
    ],
    paddingBytes: 0
  };
}
