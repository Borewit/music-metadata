import * as Token from 'token-types';

import { AttachedPictureType } from '../../id3v2/ID3v2Token.js';

import { IPicture } from '../../type.js';
import type { IGetToken } from 'strtok3';

/**
 * Interface to parsed result of METADATA_BLOCK_PICTURE
 * Ref: https://wiki.xiph.org/VorbisComment#METADATA_BLOCK_PICTURE
 * Ref: https://xiph.org/flac/format.html#metadata_block_picture
 */
export interface IVorbisPicture extends IPicture {
  // The picture type according to the ID3v2 APIC frame
  type: string
  // The description of the picture, in UTF-8.
  description: string,
  // The width of the picture in pixels.
  width: number,
  // The height of the picture in pixels.
  height: number,
  // The color depth of the picture in bits-per-pixel.
  colour_depth: number,
  // For indexed-color pictures (e.g. GIF), the number of colors used, or 0 for non-indexed pictures.
  indexed_color: number
}

/**
 * Parse the METADATA_BLOCK_PICTURE
 * Ref: https://wiki.xiph.org/VorbisComment#METADATA_BLOCK_PICTURE
 * Ref: https://xiph.org/flac/format.html#metadata_block_picture
 * // ToDo: move to ID3 / APIC?
 */
export class VorbisPictureToken implements IGetToken<IVorbisPicture> {

  public static fromBase64(base64str: string): IVorbisPicture {
    return this.fromBuffer(Uint8Array.from(atob(base64str), c => c.charCodeAt(0)));
  }

  public static fromBuffer(buffer: Uint8Array): IVorbisPicture {
    const pic = new VorbisPictureToken(buffer.length);
    return pic.get(buffer, 0);
  }

  constructor(public len) {
  }

  public get(buffer: Uint8Array, offset: number): IVorbisPicture {

    const type = AttachedPictureType[Token.UINT32_BE.get(buffer, offset)];

    const mimeLen = Token.UINT32_BE.get(buffer, offset += 4);
    const format =  new Token.StringType(mimeLen, 'utf-8').get(buffer, offset += 4);

    const descLen = Token.UINT32_BE.get(buffer, offset += mimeLen);
    const description = new Token.StringType(descLen, 'utf-8').get(buffer, offset += 4);

    const width = Token.UINT32_BE.get(buffer, offset += descLen);
    const height = Token.UINT32_BE.get(buffer, offset += 4);
    const colour_depth = Token.UINT32_BE.get(buffer, offset += 4);
    const indexed_color = Token.UINT32_BE.get(buffer, offset += 4);

    const picDataLen = Token.UINT32_BE.get(buffer, offset += 4);
    const data = Uint8Array.from(buffer.slice(offset += 4, offset + picDataLen));

    return {
      type,
      format,
      description,
      width,
      height,
      colour_depth,
      indexed_color,
      data
    };
  }
}

/**
 * Vorbis 1 decoding tokens
 * Ref: https://xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-620004.2.1
 */

/**
 * Comment header interface
 * Ref: https://xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-620004.2.1
 */
export interface ICommonHeader {
  /**
   * Packet Type
   */
  packetType: number,
  /**
   * Should be 'vorbis'
   */
  vorbis: string
}

/**
 * Comment header decoder
 * Ref: https://xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-620004.2.1
 */
export const CommonHeader: IGetToken<ICommonHeader> = {
  len: 7,

  get: (buf: Uint8Array, off): ICommonHeader => {
    return {
      packetType: Token.UINT8.get(buf, off),
      vorbis: new Token.StringType(6, 'ascii').get(buf, off + 1)
    };
  }
};

/**
 * Identification header interface
 * Ref: https://xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-630004.2.2
 */
export interface IFormatInfo {
  version: number,
  channelMode: number,
  sampleRate: number,
  bitrateMax: number,
  bitrateNominal: number,
  bitrateMin: number
}

/**
 * Identification header decoder
 * Ref: https://xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-630004.2.2
 */
export const IdentificationHeader: IGetToken<IFormatInfo> = {
  len: 23,

  get: (uint8Array, off): IFormatInfo => {
    return {
      version: Token.UINT32_LE.get(uint8Array, off + 0),
      channelMode: Token.UINT8.get(uint8Array, off + 4),
      sampleRate: Token.UINT32_LE.get(uint8Array, off + 5),
      bitrateMax: Token.UINT32_LE.get(uint8Array, off + 9),
      bitrateNominal: Token.UINT32_LE.get(uint8Array, off + 13),
      bitrateMin: Token.UINT32_LE.get(uint8Array, off + 17)
    };
  }
};
