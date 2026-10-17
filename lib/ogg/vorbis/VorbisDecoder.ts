import { textDecode } from '@borewit/text-codec';
import * as Token from 'token-types';
import { makeUnexpectedFileContentError } from '../../ParseError.js';

class VorbisCommentError extends makeUnexpectedFileContentError('Vorbis') {}

export class VorbisDecoder {
  private readonly data: Uint8Array;

  private offset: number;

  constructor(data: Uint8Array, offset: number) {
    this.data = data;
    this.offset = offset;
  }

  public get remaining(): number {
    return this.data.length - this.offset;
  }

  public readInt32(): number {
    if (this.remaining < 4) {
      throw new VorbisCommentError('Truncated Vorbis comment length');
    }
    const value = Token.UINT32_LE.get(this.data, this.offset);
    this.offset += 4;
    return value;
  }

  public readStringUtf8(): string {
    const len = this.readInt32();
    if (len > this.remaining) {
      throw new VorbisCommentError(`Vorbis comment length ${len} exceeds remaining data ${this.remaining}`);
    }
    const value = textDecode(this.data.subarray(this.offset, this.offset + len), 'utf-8');
    this.offset += len;
    return value;
  }

  /** Decode the shared structure, leaving packet framing and metadata policy to callers. */
  public parseCommentList(createCountError: (message: string) => Error = message => new VorbisCommentError(message)) {
    const vendor = this.readStringUtf8();
    return { vendor, comments: this.parseUserCommentList(createCountError) };
  }

  private *parseUserCommentList(createCountError: (message: string) => Error) {
    const count = this.readInt32();
    // Each entry needs at least its four-byte length, even for an empty comment.
    if (count > Math.floor(this.remaining / 4)) {
      throw createCountError(`Vorbis comment count ${count} exceeds remaining data`);
    }
    for (let i = 0; i < count; ++i) {
      yield this.parseUserComment();
    }
  }

  public parseUserComment(): { key: string; value: string; len: number } {
    const offset0 = this.offset;
    const v = this.readStringUtf8();
    const idx = v.indexOf('=');
    return {
      key: v.substring(0, idx).toUpperCase(),
      value: v.substring(idx + 1),
      len: this.offset - offset0
    };
  }
}
