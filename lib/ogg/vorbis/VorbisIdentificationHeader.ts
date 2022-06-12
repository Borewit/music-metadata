import { IGetToken } from "../../strtok3";

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
    const dataView = new DataView(uint8Array.buffer, uint8Array.byteOffset);
    return {
      version: dataView.getUint32(off + 0, true),
      channelMode: dataView.getUint8(off + 4),
      sampleRate: dataView.getUint32(off + 5, true),
      bitrateMax: dataView.getUint32(off + 9, true),
      bitrateNominal: dataView.getUint32(off + 13, true),
      bitrateMin: dataView.getUint32(off + 17, true),
    };
  },
};
