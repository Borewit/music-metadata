import { IGetToken } from "../strtok3";

import { IPicture } from "../type";
import { AttachedPictureType } from "../id3v2/AttachedPictureType";
import { INT32_LE, StringType, UINT16_BE, UINT8 } from "../token-types";
import { getUint8ArrayFromBase64String } from "../compat/base64";

export interface IWmPicture extends IPicture {
  type: string;
  format: string;
  description: string;
  size: number;
  data: Buffer;
}

/**
 * Ref: https://msdn.microsoft.com/en-us/library/windows/desktop/dd757977(v=vs.85).aspx
 */
export class WmPictureToken implements IGetToken<IWmPicture> {
  public static fromBase64(base64str: string): IPicture {
    return this.fromBuffer(getUint8ArrayFromBase64String(base64str));
  }

  public static fromBuffer(buffer: Uint8Array): IWmPicture {
    const pic = new WmPictureToken(buffer.length);
    return pic.get(buffer, 0);
  }

  constructor(public len: number) {}

  public get(buffer: Uint8Array, offset: number): IWmPicture {
    const typeId = UINT8.get(buffer, offset++);
    const size = INT32_LE.get(buffer, offset);
    let index = 5;

    while (UINT16_BE.get(buffer, index) !== 0) {
      index += 2;
    }
    const format = new StringType(index - 5, "utf16le").get(buffer, 5);

    while (UINT16_BE.get(buffer, index) !== 0) {
      index += 2;
    }
    const description = new StringType(index - 5, "utf16le").get(buffer, 5);

    return {
      type: AttachedPictureType[typeId],
      format,
      description,
      size,
      data: Buffer.from(buffer.slice(index + 4)),
    };
  }
}
