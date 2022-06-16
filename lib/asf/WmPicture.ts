import { IGetToken } from "../strtok3";

import { IPicture } from "../type";
import { AttachedPictureType } from "../id3v2/AttachedPictureType";

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
    return this.fromBuffer(Buffer.from(base64str, "base64"));
  }

  public static fromBuffer(buffer: Buffer): IWmPicture {
    const pic = new WmPictureToken(buffer.length);
    return pic.get(buffer, 0);
  }

  constructor(public len: number) {}

  public get(buffer: Buffer, offset: number): IWmPicture {
    const typeId = buffer.readUInt8(offset++);
    const size = buffer.readInt32LE(offset);
    let index = 5;

    while (buffer.readUInt16BE(index) !== 0) {
      index += 2;
    }
    const format = buffer.slice(5, index).toString("utf16le");

    while (buffer.readUInt16BE(index) !== 0) {
      index += 2;
    }
    const description = buffer.slice(5, index).toString("utf16le");

    return {
      type: AttachedPictureType[typeId],
      format,
      description,
      size,
      data: buffer.slice(index + 4),
    };
  }
}
