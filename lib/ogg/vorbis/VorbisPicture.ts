import * as Token from "../../token-types";
import { IGetToken } from "../../strtok3";

import { AttachedPictureType } from "../../id3v2/ID3v2Token";
import { IPicture } from "../../type";

/**
 * Interface to parsed result of METADATA_BLOCK_PICTURE
 * Ref: https://wiki.xiph.org/VorbisComment#METADATA_BLOCK_PICTURE
 * Ref: https://xiph.org/flac/format.html#metadata_block_picture
 */
export interface IVorbisPicture extends IPicture {
  // The picture type according to the ID3v2 APIC frame
  type: string;
  // The description of the picture, in UTF-8.
  description: string;
  // The width of the picture in pixels.
  width: number;
  // The height of the picture in pixels.
  height: number;
  // The color depth of the picture in bits-per-pixel.
  colour_depth: number;
  // For indexed-color pictures (e.g. GIF), the number of colors used, or 0 for non-indexed pictures.
  indexed_color: number;
}

/**
 * Parse the METADATA_BLOCK_PICTURE
 * Ref: https://wiki.xiph.org/VorbisComment#METADATA_BLOCK_PICTURE
 * Ref: https://xiph.org/flac/format.html#metadata_block_picture
 * // ToDo: move to ID3 / APIC?
 */
export class VorbisPictureToken implements IGetToken<IVorbisPicture> {
  public static fromBase64(base64str: string): IVorbisPicture {
    return this.fromBuffer(Buffer.from(base64str, "base64"));
  }

  public static fromBuffer(buffer: Buffer): IVorbisPicture {
    const pic = new VorbisPictureToken(buffer.length);
    return pic.get(buffer, 0);
  }
  constructor(public len) {}

  public get(buffer: Buffer, offset: number): IVorbisPicture {
    const type = AttachedPictureType[Token.UINT32_BE.get(buffer, offset)];

    const mimeLen = Token.UINT32_BE.get(buffer, (offset += 4));
    const format = buffer.toString("utf-8", (offset += 4), offset + mimeLen);

    const descLen = Token.UINT32_BE.get(buffer, (offset += mimeLen));
    const description = buffer.toString(
      "utf-8",
      (offset += 4),
      offset + descLen
    );

    const width = Token.UINT32_BE.get(buffer, (offset += descLen));
    const height = Token.UINT32_BE.get(buffer, (offset += 4));
    const colour_depth = Token.UINT32_BE.get(buffer, (offset += 4));
    const indexed_color = Token.UINT32_BE.get(buffer, (offset += 4));

    const picDataLen = Token.UINT32_BE.get(buffer, (offset += 4));
    const data = Buffer.from(buffer.slice((offset += 4), offset + picDataLen));

    return {
      type,
      format,
      description,
      width,
      height,
      colour_depth,
      indexed_color,
      data,
    };
  }
}
