import type { ITokenizer } from 'strtok3';
import * as Token from 'token-types';

export class BitReader {

  public pos = 0;
  private dword: number | null = null;
  private tokenizer: ITokenizer;

  public constructor(tokenizer: ITokenizer) {
    this.tokenizer = tokenizer;
  }

  /**
   *
   * @param bits 1..30 bits
   */
  public async read(bits: number): Promise<number> {

    while (this.dword === null) {
      this.dword = await this.tokenizer.readToken(Token.UINT32_LE);
    }

    let out = this.dword;
    this.pos += bits;

    if (this.pos < 32) {
      out >>>= (32 - this.pos);
      return out & ((1 << bits) - 1);
    }
      this.pos -= 32;
      if (this.pos === 0) {
        this.dword = null;
        return out & ((1 << bits) - 1);
      }
        this.dword = await this.tokenizer.readToken(Token.UINT32_LE);
        if (this.pos) {
          out <<= this.pos;
          out |= this.dword >>> (32 - this.pos);
        }
        return out & ((1 << bits) - 1);
  }

  public async ignore(bits: number): Promise<number> {

    if (this.pos > 0) {
      const remaining =  32 - this.pos;
      this.dword = null;
      bits -= remaining;
      this.pos = 0;
    }

    const remainder = bits % 32;
    const numOfWords = (bits - remainder) / 32;
    await this.tokenizer.ignore(numOfWords * 4);
    return this.read(remainder);
  }

}
