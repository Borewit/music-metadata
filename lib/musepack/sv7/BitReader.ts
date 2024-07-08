import type { ITokenizer } from 'strtok3';
import * as Token from 'token-types';

export class BitReader {

  public pos: number = 0;
  private dword: number = undefined;

  public constructor(private tokenizer: ITokenizer) {
  }

  /**
   *
   * @param bits 1..30 bits
   */
  public async read(bits: number): Promise<number> {

    while (this.dword === undefined) {
      this.dword = await this.tokenizer.readToken(Token.UINT32_LE);
    }

    let out = this.dword;
    this.pos += bits;

    if (this.pos < 32) {
      out >>>= (32 - this.pos);
      return out & ((1 << bits) - 1);
    } else {
      this.pos -= 32;
      if (this.pos === 0) {
        this.dword = undefined;
        return out & ((1 << bits) - 1);
      } else {
        this.dword = await this.tokenizer.readToken(Token.UINT32_LE);
        if (this.pos) {
          out <<= this.pos;
          out |= this.dword >>> (32 - this.pos);
        }
        return out & ((1 << bits) - 1);
      }
    }
  }

  public async ignore(bits: number): Promise<number> {

    if (this.pos > 0) {
      const remaining =  32 - this.pos;
      this.dword = undefined;
      bits -= remaining;
      this.pos = 0;
    }

    const remainder = bits % 32;
    const numOfWords = (bits - remainder) / 32;
    await this.tokenizer.ignore(numOfWords * 4);
    return this.read(remainder);
  }

}
