import { TokenWriter } from 'strtok3';
import { decodeBase64, encodeBase64 } from '../../common/Base64.js';
import { BlockType as BLOCK_TYPE, BlockHeader, decodePicture } from '../../tokens/flac.js';
import { InvalidFileError, InvalidPatchError, UnsupportedFormatError } from '../core/errors.js';
import { validatePictures } from '../core/patch.js';
import type { ByteSource } from '../core/source.js';
import type { Picture, TagPatch, WriteOptions } from '../core/types.js';
import { applyVorbisPatch } from '../mapping/vorbis.js';
import { parseVorbisComment, serializeVorbisComment } from '../vorbis/comment.js';
import { serializePicture } from './picture.js';

export const FLAC_MARKER = 'fLaC';
const FLAC_MARKER_BYTES = Uint8Array.of(0x66, 0x4c, 0x61, 0x43);
export const DEFAULT_VENDOR = 'music-metadata';
export const DEFAULT_PADDING = 8192;

export { BLOCK_TYPE };

const MAX_BLOCKS = 10_000;
const STREAMINFO_LENGTH = 34;

export interface FlacBlock {
  type: number;
  data: Uint8Array;
}

export interface ParsedFlac {
  id3Prefix: Uint8Array;
  blocks: FlacBlock[];
  audioOffset: number;
  audioLength: number;
}

export interface FlacUpdate {
  id3Prefix: Uint8Array;
  blocks: FlacBlock[];
  metadata: Uint8Array;
  audioOffset: number;
  audioLength: number;
  paddingBytes: number;
  bytesWritten: number;
}

/**
 * Parse the FLAC metadata block chain. Audio frames are not parsed.
 */
export async function parseFlac(source: ByteSource): Promise<ParsedFlac> {
  if (source.size < 4) {
    throw new InvalidFileError('File is too small to be a FLAC file');
  }

  let offset = 0;
  let id3Prefix: Uint8Array = new Uint8Array(0);

  const first = await source.read(0, Math.min(10, source.size));
  if (first.length >= 3 && first[0] === 0x49 && first[1] === 0x44 && first[2] === 0x33) {
    if (first.length < 10) {
      throw new InvalidFileError('Truncated ID3v2 header before FLAC stream');
    }
    const tagSize = readSyncSafeUInt32(first, 6);
    const hasFooter = first[3] >= 4 && (first[5] & 0x10) !== 0;
    const prefixLength = 10 + tagSize + (hasFooter ? 10 : 0);
    if (prefixLength > source.size) {
      throw new InvalidFileError('ID3v2 tag before FLAC stream exceeds file size');
    }
    id3Prefix = await source.read(0, prefixLength);
    offset = prefixLength;
  }

  const marker = await source.read(offset, 4);
  if (marker[0] !== 0x66 || marker[1] !== 0x4c || marker[2] !== 0x61 || marker[3] !== 0x43) {
    throw new UnsupportedFormatError('Not a FLAC stream');
  }
  offset += 4;

  const blocks: FlacBlock[] = [];
  let last = false;
  while (!last) {
    if (blocks.length >= MAX_BLOCKS) {
      throw new InvalidFileError(`FLAC metadata block count exceeds limit ${MAX_BLOCKS}`);
    }
    if (offset + 4 > source.size) {
      throw new InvalidFileError('Truncated FLAC metadata block header');
    }
    const header = await source.read(offset, 4);
    const { lastBlock, type, length } = BlockHeader.get(header, 0);
    last = lastBlock;
    offset += 4;
    if (offset + length > source.size) {
      throw new InvalidFileError(`FLAC metadata block type ${type} length ${length} exceeds file size`);
    }
    const data = await source.read(offset, length);
    offset += length;
    blocks.push({ type, data });
  }

  const streamInfo = blocks[0];
  if (streamInfo === undefined || streamInfo.type !== BLOCK_TYPE.STREAMINFO) {
    throw new InvalidFileError('FLAC STREAMINFO block must be the first metadata block');
  }
  if (streamInfo.data.length !== STREAMINFO_LENGTH) {
    throw new InvalidFileError(
      `FLAC STREAMINFO block must be ${STREAMINFO_LENGTH} bytes, got ${streamInfo.data.length}`
    );
  }

  return {
    id3Prefix,
    blocks,
    audioOffset: offset,
    audioLength: source.size - offset
  };
}

/**
 * Build a rewritten FLAC metadata section from a tag patch.
 *
 * The audio payload is not copied here; `audioOffset` and `audioLength` refer
 * to the original source and are used by the file writer.
 */
export async function buildFlacUpdate(
  source: ByteSource,
  patch: TagPatch,
  options: WriteOptions = {}
): Promise<FlacUpdate> {
  const parsed = await parseFlac(source);
  const id3Prefix = options.stripFlacId3 ? new Uint8Array(0) : parsed.id3Prefix;
  const paddingTarget = validatePadding(options.padding);

  let blocks = parsed.blocks.map(block => ({ type: block.type, data: block.data }));
  const commentIndex = blocks.findIndex(block => block.type === BLOCK_TYPE.VORBIS_COMMENT);

  const currentFields =
    commentIndex >= 0 ? parseVorbisComment(blocks[commentIndex]?.data) : { vendor: DEFAULT_VENDOR, comments: [] };
  const updatedFields = applyVorbisPatch(currentFields, patch);
  // Native values win over the common mapping, but FLAC artwork must remain
  // in PICTURE blocks for readers that do not inspect Vorbis artwork comments.
  let pictures = patch.picture;
  if (hasNativePicture(patch.native)) {
    pictures = updatedFields.comments
      .filter(comment => comment.key.toUpperCase() === 'METADATA_BLOCK_PICTURE')
      .map(comment => decodeNativePicture(comment.value));
    updatedFields.comments = updatedFields.comments.filter(
      comment => comment.key.toUpperCase() !== 'METADATA_BLOCK_PICTURE'
    );
  }
  const commentData = serializeVorbisComment(updatedFields);

  if (commentIndex >= 0) {
    blocks[commentIndex] = { type: BLOCK_TYPE.VORBIS_COMMENT, data: commentData };
  } else {
    blocks.splice(1, 0, { type: BLOCK_TYPE.VORBIS_COMMENT, data: commentData });
  }

  blocks = applyPicturePatch(blocks, pictures);

  const oldMetadataSize = parsed.audioOffset - parsed.id3Prefix.length;
  const nonPadding = blocks.filter(block => block.type !== BLOCK_TYPE.PADDING);
  const nonPaddingSize = 4 + nonPadding.reduce((sum, block) => sum + 4 + block.data.length, 0);
  const padding = calculatePadding(oldMetadataSize, nonPaddingSize, paddingTarget);

  if (padding.length > 0) {
    nonPadding.push({ type: BLOCK_TYPE.PADDING, data: padding });
  }

  const metadata = serializeFlac(id3Prefix, nonPadding);
  return {
    id3Prefix,
    blocks: nonPadding,
    metadata,
    audioOffset: parsed.audioOffset,
    audioLength: parsed.audioLength,
    paddingBytes: padding.length,
    bytesWritten: metadata.length + parsed.audioLength
  };
}

function hasNativePicture(native: TagPatch['native']): boolean {
  return native != null && Object.keys(native).some(key => key.toUpperCase() === 'METADATA_BLOCK_PICTURE');
}

function decodeNativePicture(value: string): Picture {
  const errorMessage = 'native.METADATA_BLOCK_PICTURE must contain valid base64 FLAC PICTURE data';
  const normalized = value.replace(/\s/g, '');
  const data = decodeBase64(normalized);
  if (encodeBase64(data) !== normalized) {
    throw new InvalidPatchError(errorMessage);
  }
  const picture = decodePicture(data, 0, {
    requireExactData: true,
    createError: () => new InvalidPatchError(errorMessage)
  });
  return { ...picture, type: picture.type ?? 'Other' };
}

function applyPicturePatch(blocks: FlacBlock[], pictures: readonly Picture[] | null | undefined): FlacBlock[] {
  const validated = validatePictures(pictures);
  if (validated === undefined) {
    return blocks;
  }

  const replacement =
    validated === null ? [] : validated.map(picture => ({ type: BLOCK_TYPE.PICTURE, data: serializePicture(picture) }));

  const result: FlacBlock[] = [];
  let inserted = false;
  for (const block of blocks) {
    if (block.type === BLOCK_TYPE.PICTURE) {
      if (!inserted) {
        result.push(...replacement);
        inserted = true;
      }
      continue;
    }
    result.push(block);
  }

  if (!inserted && replacement.length > 0) {
    const commentIndex = result.findIndex(block => block.type === BLOCK_TYPE.VORBIS_COMMENT);
    const insertAt = commentIndex >= 0 ? commentIndex + 1 : 1;
    result.splice(insertAt, 0, ...replacement);
  }

  return result;
}

function calculatePadding(oldMetadataSize: number, newMetadataSize: number, target: number): Uint8Array {
  if (target === 0) {
    return new Uint8Array(0);
  }

  let total = Math.max(oldMetadataSize, newMetadataSize + 4 + target);
  if (total > newMetadataSize && total - newMetadataSize < 4) {
    total = newMetadataSize + 4 + target;
  }
  let paddingLength = total - newMetadataSize - 4;
  if (paddingLength > 0xffffff) {
    // Preserving the old audio offset would exceed one FLAC metadata block.
    paddingLength = Math.min(target, 0xffffff);
  }
  return paddingLength > 0 ? new Uint8Array(paddingLength) : new Uint8Array(0);
}

function serializeFlac(id3Prefix: Uint8Array, blocks: readonly FlacBlock[]): Uint8Array {
  let size = id3Prefix.length + 4;
  for (const block of blocks) {
    size += 4 + block.data.length;
  }

  const writer = new TokenWriter(size);
  writer.writeBuffer(id3Prefix);
  writer.writeBuffer(FLAC_MARKER_BYTES);

  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    const isLast = index === blocks.length - 1;
    if (block.data.length > 0xffffff) {
      throw new InvalidFileError(`FLAC metadata block is too large: ${block.data.length} bytes`);
    }
    writer.writeToken(BlockHeader, { lastBlock: isLast, type: block.type as BLOCK_TYPE, length: block.data.length });
    writer.writeBuffer(block.data);
  }

  return writer.toUint8Array();
}

function validatePadding(padding: number | undefined): number {
  if (padding === undefined) {
    return DEFAULT_PADDING;
  }
  if (!Number.isSafeInteger(padding) || padding < 0) {
    throw new InvalidPatchError('padding must be a non-negative integer');
  }
  return padding;
}

function readSyncSafeUInt32(data: Uint8Array, offset: number): number {
  if (offset + 4 > data.length) {
    throw new InvalidFileError('Truncated sync-safe integer');
  }
  return (
    ((data[offset] & 0x7f) << 21) |
    ((data[offset + 1] & 0x7f) << 14) |
    ((data[offset + 2] & 0x7f) << 7) |
    (data[offset + 3] & 0x7f)
  );
}
