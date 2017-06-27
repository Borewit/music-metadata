import * as Token from "token-types";

export enum VorbisPictureType {
  'Other',
  "32x32 pixels 'file icon' (PNG only)",
  'Other file icon',
  'Cover (front)',
  'Cover (back)',
  'Leaflet page',
  'Media (e.g. lable side of CD)',
  'Lead artist/lead performer/soloist',
  'Artist/performer',
  'Conductor',
  'Band/Orchestra',
  'Composer',
  'Lyricist/text writer',
  'Recording Location',
  'During recording',
  'During performance',
  'Movie/video screen capture',
  'A bright coloured fish',
  'Illustration',
  'Band/artist logotype',
  'Publisher/Studio logotype'
}

export interface IVorbisPicture {
  type: string
  format: string,
  description: string,
  width: number,
  height: number,
  colour_depth: number,
  indexed_color: number,
  data: Buffer;
}

class VorbisPictureParser implements IVorbisPicture {
  public format: string;
  public description: string;
  public width: number;
  public height: number;
  public colour_depth: number;
  public indexed_color: number;
  public data: Buffer;
  public type: string;

  constructor(buffer: Buffer) {
    let offset = 0;

    this.type = VorbisPictureType[Token.UINT32_BE.get(buffer, 0)];

    const mimeLen = Token.UINT32_BE.get(buffer, offset += 4);
    this.format = buffer.toString('utf-8', offset += 4, offset + mimeLen);

    const descLen = Token.UINT32_BE.get(buffer, offset += mimeLen);
    this.description = buffer.toString('utf-8', offset += 4, offset + descLen);

    this.width = Token.UINT32_BE.get(buffer, offset += descLen);
    this.height = Token.UINT32_BE.get(buffer, offset += 4);
    this.colour_depth = Token.UINT32_BE.get(buffer, offset += 4);
    this.indexed_color = Token.UINT32_BE.get(buffer, offset += 4);

    const picDataLen = Token.UINT32_BE.get(buffer, offset += 4);
    this.data = new Buffer(buffer.slice(offset += 4, offset + picDataLen));
  }
}

export default class Vorbis {

  public static readPicture(buffer: Buffer): IVorbisPicture {
    return new VorbisPictureParser(buffer);
  }

  public static getPictureType(type: number): string {
    return VorbisPictureType[type];
  }
}
