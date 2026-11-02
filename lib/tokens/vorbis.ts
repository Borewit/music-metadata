import { textDecode } from '@borewit/text-codec';
import { UINT32_LE } from 'token-types';

/** Default entry limit when a caller does not supply one. */
export const DEFAULT_MAX_COMMENT_COUNT = 100_000;

function validateMaxComments(maxComments: number): void {
  if (maxComments !== Number.POSITIVE_INFINITY && (!Number.isSafeInteger(maxComments) || maxComments < 0)) {
    throw new RangeError('maxComments must be a non-negative safe integer or Infinity');
  }
}

export interface VorbisComment {
  key: string;
  value: string;
}

export interface ParsedVorbisComment extends VorbisComment {
  /** Number of bytes consumed by this comment, including its length prefix. */
  len: number;
}

export interface VorbisFields {
  vendor: string;
  comments: VorbisComment[];
}

export class VorbisCommentError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'VorbisCommentError';
  }
}

export interface VorbisDecoderOptions {
  /** Error factory used for structural failures. */
  createError?: (message: string) => Error;
  /**
   * Maximum number of comments accepted in one list. Defaults to 100,000.
   * Must be a non-negative safe integer or Infinity. Zero permits only empty lists.
   */
  maxComments?: number;
}

export interface VorbisParseOptions extends VorbisDecoderOptions {
  /**
   * Require every comment to contain a non-empty field name followed by `=`.
   * Defaults to `true` for whole-block parsing.
   */
  requireFieldSeparator?: boolean;
}

/**
 * Low-level Vorbis Comment reader.
 *
 * The decoder preserves the original key spelling, order and duplicates. It
 * leaves packet framing, tag normalization and metadata policy to callers.
 */
export class VorbisDecoder {
  private readonly data: Uint8Array;
  private offset: number;
  private readonly createError: (message: string) => Error;
  private readonly maxComments: number;

  public constructor(data: Uint8Array, offset = 0, options: VorbisDecoderOptions = {}) {
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > data.length) {
      throw new RangeError(`Invalid Vorbis Comment offset ${offset} for a ${data.length}-byte buffer`);
    }
    this.data = data;
    this.offset = offset;
    this.createError = options.createError ?? (message => new VorbisCommentError(message));
    this.maxComments = options.maxComments ?? DEFAULT_MAX_COMMENT_COUNT;
    validateMaxComments(this.maxComments);
  }

  public get remaining(): number {
    return this.data.length - this.offset;
  }

  public readInt32(): number {
    if (this.remaining < 4) {
      throw this.createError('Truncated Vorbis comment length');
    }
    const value = UINT32_LE.get(this.data, this.offset);
    this.offset += 4;
    return value;
  }

  public readStringUtf8(): string {
    const length = this.readInt32();
    if (length > this.remaining) {
      throw this.createError(`Vorbis comment length ${length} exceeds remaining data ${this.remaining}`);
    }
    const value = textDecode(this.data.subarray(this.offset, this.offset + length), 'utf-8');
    this.offset += length;
    return value;
  }

  /**
   * Decode the shared structure, leaving packet framing and metadata policy to
   * callers. Iterating the returned comments consumes the underlying buffer.
   */
  public parseCommentList(
    createCountError: (message: string) => Error = this.createError,
    maxComments = this.maxComments
  ): {
    vendor: string;
    comments: IterableIterator<ParsedVorbisComment>;
  } {
    validateMaxComments(maxComments);
    const vendor = this.readStringUtf8();
    const count = this.readInt32();
    // Each entry needs at least its four-byte length, even for an empty comment.
    if (count > Math.floor(this.remaining / 4)) {
      throw createCountError(`Vorbis comment count ${count} exceeds remaining data`);
    }
    if (count > maxComments) {
      throw createCountError(`Vorbis comment count ${count} exceeds entry limit ${maxComments}`);
    }
    return { vendor, comments: this.parseUserComments(count) };
  }

  public parseUserComment(): ParsedVorbisComment {
    const offset0 = this.offset;
    const value = this.readStringUtf8();
    const separator = value.indexOf('=');
    return {
      key: value.substring(0, separator),
      value: value.substring(separator + 1),
      len: this.offset - offset0
    };
  }

  private *parseUserComments(count: number): IterableIterator<ParsedVorbisComment> {
    for (let index = 0; index < count; index++) {
      yield this.parseUserComment();
    }
  }
}

/**
 * Parse a complete Vorbis Comment metadata block body.
 *
 * Unlike the low-level decoder, this rejects comments without a field
 * separator and trailing bytes after the comment list.
 */
export function parseVorbisComment(data: Uint8Array, options: VorbisParseOptions = {}): VorbisFields {
  const createError = options.createError ?? (message => new VorbisCommentError(message));
  const decoder = new VorbisDecoder(data, 0, {
    createError,
    ...(options.maxComments === undefined ? {} : { maxComments: options.maxComments })
  });
  const requireFieldSeparator = options.requireFieldSeparator ?? true;
  const { vendor, comments: parsedComments } = decoder.parseCommentList(createError);

  const comments: VorbisComment[] = [];
  let index = 0;
  for (const comment of parsedComments) {
    if (requireFieldSeparator && comment.key.length === 0) {
      throw createError(`Malformed Vorbis Comment at index ${index}: missing field separator`);
    }
    comments.push({ key: comment.key, value: comment.value });
    index++;
  }

  if (decoder.remaining !== 0) {
    throw createError(`Vorbis Comment block has ${decoder.remaining} trailing byte(s)`);
  }

  return { vendor, comments };
}
