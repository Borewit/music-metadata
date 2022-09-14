import { trimRightNull } from "../common/Util";
import { NoReturn } from "../errors/no-return";
import { readLatin1String } from "../parser/base/string";
import { isSuccess, Result } from "../result/result";
import { Latin1StringType } from "../token-types/string";

export class Id3v1StringType extends Latin1StringType {
  public override get(buf: Uint8Array, off: number): string {
    let value = super.get(buf, off);
    value = trimRightNull(value);
    value = value.trim();
    return value.length > 0 ? value : undefined;
  }
}

export const readId3v1String = (
  buffer: Uint8Array,
  offset: number,
  length: number
): Result<string, RangeError | NoReturn> => {
  const result = readLatin1String(buffer, offset, length);
  if (!isSuccess(result)) return result;
  const value = trimRightNull(result).trim();
  return value.length > 0 ? value : new NoReturn("string needs 1 or more length");
};
