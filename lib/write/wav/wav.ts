import type { WriteChunk } from '../core/chunks.js';
import { InvalidFileError, UnsupportedFeatureError } from '../core/errors.js';
import { type ByteSource, openSource } from '../core/source.browser.js';
import type { TagPatch, WriteOptions } from '../core/types.js';
import { buildId3Update } from '../id3v2/id3v2.js';

/** Rebuild RIFF framing while streaming all non-ID3 chunks unchanged. */
export async function buildWavUpdate(source: ByteSource, patch: TagPatch, options: WriteOptions) {
  const header = await source.read(0, 12);
  if (
    String.fromCharCode(...header.subarray(0, 4)) !== 'RIFF' ||
    String.fromCharCode(...header.subarray(8, 12)) !== 'WAVE'
  ) {
    throw new UnsupportedFeatureError('Only RIFF/WAVE containers are supported');
  }
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  const end = view.getUint32(4, true) + 8;
  if (end < 12 || end > source.size) {
    throw new InvalidFileError('Invalid RIFF size');
  }
  const chunks: WriteChunk[] = [];
  let tag: Uint8Array = new Uint8Array(0);
  let hasTag = false;
  let hasFormat = false;
  let hasData = false;
  let count = 0;
  for (let offset = 12; offset < end; ) {
    if (++count > 100_000) {
      throw new InvalidFileError('Too many RIFF chunks');
    }
    if (offset + 8 > end) {
      throw new InvalidFileError('Truncated RIFF chunk header');
    }
    const chunk = await source.read(offset, 8);
    const id = String.fromCharCode(...chunk.subarray(0, 4));
    const size = new DataView(chunk.buffer, chunk.byteOffset, 8).getUint32(4, true);
    const length = 8 + size + (size % 2);
    if (offset + length > end) {
      throw new InvalidFileError('RIFF chunk exceeds container size');
    }
    if (id === 'id3 ' || id === 'ID3 ') {
      if (hasTag) {
        throw new UnsupportedFeatureError('Multiple WAV ID3 chunks are not supported');
      }
      if (size > 64 * 1024 * 1024 + 20) {
        throw new InvalidFileError('WAV ID3 chunk exceeds 64 MiB');
      }
      tag = await source.read(offset + 8, size);
      if (size < 10 || String.fromCharCode(...tag.subarray(0, 3)) !== 'ID3') {
        throw new InvalidFileError('Invalid WAV ID3 chunk');
      }
      hasTag = true;
    } else {
      if (id === 'fmt ') {
        if (size < 16) {
          throw new InvalidFileError('Truncated WAV format chunk');
        }
        hasFormat = true;
      }
      if (id === 'data') {
        hasData = true;
      }
      chunks.push({ source, offset, length });
    }
    offset += length;
  }
  if (!hasFormat || !hasData) {
    throw new InvalidFileError('WAV requires fmt and data chunks');
  }
  const tagSource = await openSource(tag);
  let update: Awaited<ReturnType<typeof buildId3Update>>;
  try {
    update = await buildId3Update(tagSource, patch, options, true);
    if (update.audioLength !== 0) {
      throw new InvalidFileError('Unexpected bytes after WAV ID3 tag');
    }
  } finally {
    await tagSource.close();
  }
  const id3Header = new Uint8Array(8);
  id3Header.set([105, 100, 51, 32]);
  new DataView(id3Header.buffer).setUint32(4, update.metadata.length, true);
  chunks.push(id3Header, update.metadata);
  if (update.metadata.length % 2) {
    chunks.push(new Uint8Array(1));
  }
  const riffSize = 4 + chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  if (riffSize > 0xffffffff) {
    throw new UnsupportedFeatureError('WAV exceeds RIFF 32-bit size limit');
  }
  view.setUint32(4, riffSize, true);
  // Bytes outside the declared RIFF container remain outside it.
  if (end < source.size) {
    chunks.push({ source, offset: end, length: source.size - end });
  }
  return { chunks: [header, ...chunks], paddingBytes: update.paddingBytes };
}
