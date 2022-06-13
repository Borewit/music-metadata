import * as Token from "../token-types";
import { IGetToken } from "../strtok3";
import { FourCcToken } from "../common/FourCC";

/**
 * Atom: Sample Description Atom ('stsd')
 */
export interface ISampleDescription {
  dataFormat: string;
  dataReferenceIndex: number;
  description: Uint8Array;
}

/**
 * Atom: Sample Description Atom ('stsd')
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-25691
 */
export class SampleDescriptionTable implements IGetToken<ISampleDescription> {
  public constructor(public len: number) {}

  public get(buf: Buffer, off: number): ISampleDescription {
    return {
      dataFormat: FourCcToken.get(buf, off),
      dataReferenceIndex: Token.UINT16_BE.get(buf, off + 10),
      description: new Token.Uint8ArrayType(this.len - 12).get(buf, off + 12),
    };
  }
}
