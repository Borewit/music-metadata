import { NoReturn } from "../../errors/no-return";
import { map } from "../combinate/map";
import { sequenceToObject } from "../combinate/sequence-to-object";
import { bytes } from "../primitive/bytes";
import { u8 } from "../primitive/integer";
import { readUnitFromBuffer } from "../utility/read-unit";

import { id3v1String } from "./string";

import type { Unit } from "../type/unit";

/**
 * ID3v1 tag header interface
 * Spec: http://id3.org/ID3v1
 * Wiki: https://en.wikipedia.org/wiki/ID3
 */
export interface Id3v1Header {
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

export const id3v1Header: Unit<Id3v1Header, RangeError | NoReturn> = map(
  sequenceToObject(
    {
      header: 0,
      title: 1,
      artist: 2,
      album: 3,
      year: 4,
      comment: 5,
      track: 6,
      genre: 7,
    },
    id3v1String(3),
    id3v1String(30),
    id3v1String(30),
    id3v1String(30),
    id3v1String(4),
    id3v1String(28),
    bytes(2),
    u8
  ),
  (value) => {
    if (value.header !== "TAG") return new NoReturn();
    const track = value.track;

    const comment = track[0] === 0 ? "" : readUnitFromBuffer(id3v1String(2), track, 0);

    return { ...value, comment: value.comment + comment, zeroByte: track[0], track: track[1] };
  }
);
