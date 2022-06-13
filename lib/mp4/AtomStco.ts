import * as Token from "../token-types";
import { SimpleTableAtom } from "./AtomTable";

/**
 * Chunk offset atom, 'stco'
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-25715
 */
export class StcoAtom extends SimpleTableAtom<number> {
  public constructor(public len: number) {
    super(len, Token.INT32_BE);
  }
}
