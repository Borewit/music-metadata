import { readUint8 } from "../parser/base/unsigned-integer";
import { isSuccess } from "../result/result";
import { UINT8 } from "../token-types";

import { Id3v1StringType, readId3v1String } from "./ID3v1StringType";

import type { IGetToken } from "../token-types";

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
export const Iid3v1Token: IGetToken<IId3v1Header | null> = {
  len: 128,

  /**
   * @param buf Buffer possibly holding the 128 bytes ID3v1.1 metadata header
   * @param off Offset in buffer in bytes
   * @returns ID3v1.1 header if first 3 bytes equals 'TAG', otherwise null is returned
   */
  get: (buf: Uint8Array, off): IId3v1Header | null => {
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

interface Id3v1Header {
  header: "TAG";
  title: string | undefined;
  artist: string | undefined;
  album: string | undefined;
  year: string | undefined;
  comment: string | undefined;
  zeroByte: number | undefined;
  track: number | undefined;
  genre: number | undefined;
}

export const ID3V1_SIZE = 128;

/**
 * @param buffer Buffer possibly holding the 128 bytes ID3v1.1 metadata header
 * @param offset Offset in buffer in bytes
 * @returns ID3v1.1 header if first 3 bytes equals 'TAG', otherwise null is returned
 */
export const readId3v1Header = (buffer: Uint8Array, offset: number): Id3v1Header | undefined => {
  const header = readId3v1String(buffer, offset, 3);
  const title = readId3v1String(buffer, offset + 3, 30);
  const artist = readId3v1String(buffer, offset + 33, 30);
  const album = readId3v1String(buffer, offset + 63, 30);
  const year = readId3v1String(buffer, offset + 93, 4);
  const comment = readId3v1String(buffer, offset + 97, 28);

  // ID3v1.1 separator for track
  const zeroByte = readUint8(buffer, offset + 127);
  // track: ID3v1.1 field added by Michael Mutschler
  const track = readUint8(buffer, offset + 126);
  const genre = readUint8(buffer, offset + 127);

  if (header !== "TAG") return undefined;

  return {
    header,
    title: isSuccess(title) ? title : undefined,
    artist: isSuccess(artist) ? artist : undefined,
    album: isSuccess(album) ? album : undefined,
    year: isSuccess(year) ? year : undefined,
    comment: isSuccess(comment) ? comment : undefined,
    zeroByte: isSuccess(zeroByte) ? zeroByte : undefined,
    track: isSuccess(track) ? track : undefined,
    genre: isSuccess(genre) ? genre : undefined,
  };
};
