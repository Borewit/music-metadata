import * as util from "../common/Util";
import { Latin1StringType } from "../token-types/string";

export class Id3v1StringType extends Latin1StringType {
  public override get(buf: Uint8Array, off: number): string {
    let value = super.get(buf, off);
    value = util.trimRightNull(value);
    value = value.trim();
    return value.length > 0 ? value : undefined;
  }
}
