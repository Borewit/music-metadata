import { getUint8ArrayFromBase64String } from "../../compat/base64";
import { AttachedPictureType } from "../../id3v2/AttachedPictureType";
import { UINT32_BE } from "../../token-types";
import { Utf8StringType } from "../../token-types/string";

import type { IGetToken } from "../../strtok3";
import type { IPicture } from "../../type";


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
    return this.fromBuffer(getUint8ArrayFromBase64String(base64str));
  }

  public static fromBuffer(buffer: Uint8Array): IVorbisPicture {
    const pic = new VorbisPictureToken(buffer.length);
    return pic.get(buffer, 0);
  }
  constructor(public len: number) {}

  public get(buffer: Uint8Array, offset: number): IVorbisPicture {
    const type = AttachedPictureType[UINT32_BE.get(buffer, offset)];

    const mimeLen = UINT32_BE.get(buffer, (offset += 4));
    const format = new Utf8StringType(mimeLen).get(buffer, (offset += 4));

    const descLen = UINT32_BE.get(buffer, (offset += mimeLen));
    const description = new Utf8StringType(descLen).get(buffer, (offset += 4));

    const width = UINT32_BE.get(buffer, (offset += descLen));
    const height = UINT32_BE.get(buffer, (offset += 4));
    const colour_depth = UINT32_BE.get(buffer, (offset += 4));
    const indexed_color = UINT32_BE.get(buffer, (offset += 4));

    const picDataLen = UINT32_BE.get(buffer, (offset += 4));
    // eslint-disable-next-line no-undef
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
