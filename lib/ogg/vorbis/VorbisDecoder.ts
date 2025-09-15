import * as Token from 'token-types';
import { textDecode } from '@borewit/text-codec';

export class VorbisDecoder {
  private readonly data: Uint8Array;

  private offset: number;

  constructor(data: Uint8Array, offset: number) {
    this.data = data;
    this.offset = offset;
  }

  public readInt32(): number {
    const value = Token.UINT32_LE.get(this.data, this.offset);
    this.offset += 4;
    return value;
  }

  public readStringUtf8(): string {
    const len = this.readInt32();
    const value = textDecode(this.data.subarray(this.offset, this.offset + len), 'utf-8');
    this.offset += len;
    return value;
  }

  public parseUserComment(): {key: string, value: string, len: number} {
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
