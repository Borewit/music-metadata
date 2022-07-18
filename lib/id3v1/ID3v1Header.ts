import { UINT8 } from "../token-types";
import type { IGetToken } from "../strtok3";
import { Id3v1StringType } from "./ID3v1StringType";

/**
 * ID3v1 tag header interface
 */
export interface IId3v1Header {
  header: string;
  title: string;
  artist: string;
  album: string;
  year: string;
  comment: string;
  zeroByte: number;
  track: number;
  genre: number;
}

/**
 * Spec: http://id3.org/ID3v1
 * Wiki: https://en.wikipedia.org/wiki/ID3
 */
export const Iid3v1Token: IGetToken<IId3v1Header> = {
  len: 128,

  /**
   * @param buf Buffer possibly holding the 128 bytes ID3v1.1 metadata header
   * @param off Offset in buffer in bytes
   * @returns ID3v1.1 header if first 3 bytes equals 'TAG', otherwise null is returned
   */
  get: (buf: Uint8Array, off): IId3v1Header => {
    const header = new Id3v1StringType(3).get(buf, off);
    return header === "TAG"
      ? {
          header,
          title: new Id3v1StringType(30).get(buf, off + 3),
          artist: new Id3v1StringType(30).get(buf, off + 33),
          album: new Id3v1StringType(30).get(buf, off + 63),
          year: new Id3v1StringType(4).get(buf, off + 93),
          comment: new Id3v1StringType(28).get(buf, off + 97),
          // ID3v1.1 separator for track
          zeroByte: UINT8.get(buf, off + 127),
          // track: ID3v1.1 field added by Michael Mutschler
          track: UINT8.get(buf, off + 126),
          genre: UINT8.get(buf, off + 127),
        }
      : null;
  },
};
