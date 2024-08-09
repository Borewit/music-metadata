import * as Token from 'token-types';

export class VorbisDecoder {

  constructor(private readonly data: Uint8Array, private offset: number) {
  }

  public readInt32(): number {
    const value = Token.UINT32_LE.get(this.data, this.offset);
    this.offset += 4;
    return value;
  }

  public readStringUtf8(): string {
    const len = this.readInt32();
    const value = new TextDecoder('utf-8').decode(this.data.subarray(this.offset, this.offset + len));
    this.offset += len;
    return value;
  }

  public parseUserComment(): {key: string, value: string, len: number} {
    const offset0 = this.offset;
    const v = this.readStringUtf8();
    const idx = v.indexOf('=');
    return {
      key: v.slice(0, idx).toUpperCase(),
      value: v.slice(idx + 1),
      len: this.offset - offset0
    };
  }
}
