import { findZero2 } from "../../common/Util";
import { AttachedPictureType } from "../../id3v2/AttachedPictureType";
import { map } from "../combinate/map";
import { sequence } from "../combinate/sequence";
import { bytes } from "../primitive/bytes";
import { i32le, u8 } from "../primitive/integer";
import { utf16le } from "../primitive/string";
import { readUnitFromBuffer } from "../utility/read-unit";

import type { IPicture } from "../../type";

/**
 * Ref: https://msdn.microsoft.com/en-us/library/windows/desktop/dd757977(v=vs.85).aspx
 */
export interface WmPicture extends IPicture {
  type: string;
  format: string;
  description: string;
  size: number;
  data: Uint8Array;
}

export const wmPicture = (length: number) =>
  map(sequence(u8, i32le, bytes(length - 5)), ([type, size, data]) => {
    const [format, formatTerminate] = readUtf16NullTerminated(data, 0, data.byteLength);
    const [description, descriptionTerminate] = readUtf16NullTerminated(data, formatTerminate, data.byteLength);

    return {
      type: AttachedPictureType[type],
      size,

      format,
      description,
      data: readUnitFromBuffer(bytes(data.byteLength - descriptionTerminate), data, descriptionTerminate),
    };
  });

const readUtf16NullTerminated = (data: Uint8Array, start: number, end: number): [string, number] => {
  const zero = findZero2(data, start, end);
  const str = readUnitFromBuffer(utf16le(zero - start), data, start);
  return [str, zero + 2];
};
