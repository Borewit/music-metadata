import { StringType } from "../token-types";

import * as util from "../common/Util";

export class Id3v1StringType extends StringType {
  constructor(len: number) {
    super(len, "binary");
  }

  public get(buf: Buffer, off: number): string {
    let value = super.get(buf, off);
    value = util.trimRightNull(value);
    value = value.trim();
    return value.length > 0 ? value : undefined;
  }
}
