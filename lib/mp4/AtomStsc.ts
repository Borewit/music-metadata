import { SimpleTableAtom } from "./AtomTable";
import { ISampleToChunk, SampleToChunkToken } from "./SampleToChunk";

/**
 * Sample-to-Chunk ('stsc') atom interface
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-25706
 */
export class StscAtom extends SimpleTableAtom<ISampleToChunk> {
  public constructor(public override len: number) {
    super(len, SampleToChunkToken);
  }
}
