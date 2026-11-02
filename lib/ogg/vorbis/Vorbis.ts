import type { IGetToken } from 'strtok3';
import * as Token from 'token-types';
import { decodePicture, type IFlacPicture, type PictureDecodeOptions } from '../../tokens/flac.js';

/**
 * Interface to parsed result of METADATA_BLOCK_PICTURE
 * Ref: https://wiki.xiph.org/VorbisComment#METADATA_BLOCK_PICTURE
 * Ref: https://xiph.org/flac/format.html#metadata_block_picture
 */
export interface IVorbisPicture extends IFlacPicture {
  // The picture type according to the ID3v2 APIC frame
  type: string;
}

/**
 * Parse the METADATA_BLOCK_PICTURE
 * Ref: https://wiki.xiph.org/VorbisComment#METADATA_BLOCK_PICTURE
 * Ref: https://xiph.org/flac/format.html#metadata_block_picture
 */
export class VorbisPictureToken implements IGetToken<IVorbisPicture> {
  public static fromBase64(base64str: string): IVorbisPicture {
    return VorbisPictureToken.fromBuffer(Uint8Array.from(atob(base64str), c => c.charCodeAt(0)));
  }

  public static fromBuffer(buffer: Uint8Array): IVorbisPicture {
    const pic = new VorbisPictureToken(buffer.length);
    return pic.get(buffer, 0);
  }

  public len: number;

  constructor(
    len: number,
    private readonly options: PictureDecodeOptions = {}
  ) {
    this.len = len;
  }

  public get(buffer: Uint8Array, offset: number): IVorbisPicture {
    return decodePicture(buffer.subarray(offset, offset + this.len), 0, this.options) as IVorbisPicture;
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
  packetType: number;
  /**
   * Should be 'vorbis'
   */
  vorbis: string;
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
  version: number;
  channelMode: number;
  sampleRate: number;
  bitrateMax: number;
  bitrateNominal: number;
  bitrateMin: number;
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
      bitrateMax: Token.INT32_LE.get(uint8Array, off + 9),
      bitrateNominal: Token.INT32_LE.get(uint8Array, off + 13),
      bitrateMin: Token.INT32_LE.get(uint8Array, off + 17)
    };
  }
};
