import { SimpleTableAtom } from "./AtomTable";
import { ITimeToSampleToken, TimeToSampleToken } from "./TimeToSampleToken";

/**
 * Time-to-sample('stts') atom.
 * Store duration information for a media’s samples.
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-25696
 */
export class SttsAtom extends SimpleTableAtom<ITimeToSampleToken> {
  public constructor(public len: number) {
    super(len, TimeToSampleToken);
  }
}
