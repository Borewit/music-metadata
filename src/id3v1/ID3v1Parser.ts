"use strict";

import * as initDebug from 'debug';

import {ITag} from '../type';
import BitUtil from '../common/Util';
import * as Token from 'token-types';
import {BasicParser} from '../common/BasicParser';

const debug = initDebug('music-metadata:parser:ID3v1');

/**
 * ID3v1 Genre mappings
 * Ref: https://de.wikipedia.org/wiki/Liste_der_ID3v1-Genres
 */
export const Genres = [
  "Blues", "Classic Rock", "Country", "Dance", "Disco", "Funk", "Grunge", "Hip-Hop",
  "Jazz", "Metal", "New Age", "Oldies", "Other", "Pop", "R&B", "Rap", "Reggae", "Rock",
  "Techno", "Industrial", "Alternative", "Ska", "Death Metal", "Pranks", "Soundtrack",
  "Euro-Techno", "Ambient", "Trip-Hop", "Vocal", "Jazz+Funk", "Fusion", "Trance",
  "Classical", "Instrumental", "Acid", "House", "Game", "Sound Clip", "Gospel", "Noise",
  "Alt. Rock", "Bass", "Soul", "Punk", "Space", "Meditative", "Instrumental Pop",
  "Instrumental Rock", "Ethnic", "Gothic", "Darkwave", "Techno-Industrial",
  "Electronic", "Pop-Folk", "Eurodance", "Dream", "Southern Rock", "Comedy", "Cult",
  "Gangsta Rap", "Top 40", "Christian Rap", "Pop/Funk", "Jungle", "Native American",
  "Cabaret", "New Wave", "Psychedelic", "Rave", "Showtunes", "Trailer", "Lo-Fi", "Tribal",
  "Acid Punk", "Acid Jazz", "Polka", "Retro", "Musical", "Rock & Roll", "Hard Rock",
  "Folk", "Folk/Rock", "National Folk", "Swing", "Fast-Fusion", "Bebob", "Latin", "Revival",
  "Celtic", "Bluegrass", "Avantgarde", "Gothic Rock", "Progressive Rock", "Psychedelic Rock",
  "Symphonic Rock", "Slow Rock", "Big Band", "Chorus", "Easy Listening", "Acoustic", "Humour",
  "Speech", "Chanson", "Opera", "Chamber Music", "Sonata", "Symphony", "Booty Bass", "Primus",
  "Porn Groove", "Satire", "Slow Jam", "Club", "Tango", "Samba", "Folklore",
  "Ballad", "Power Ballad", "Rhythmic Soul", "Freestyle", "Duet", "Punk Rock", "Drum Solo",
  "A Cappella", "Euro-House", "Dance Hall", "Goa", "Drum & Bass", "Club-House",
  "Hardcore", "Terror", "Indie", "BritPop", "Negerpunk", "Polsk Punk", "Beat",
  "Christian Gangsta Rap", "Heavy Metal", "Black Metal", "Crossover", "Contemporary Christian",
  "Christian Rock", "Merengue", "Salsa", "Thrash Metal", "Anime", "JPop", "Synthpop",
  "Abstract", "Art Rock", "Baroque", "Bhangra", "Big Beat", "Breakbeat", "Chillout",
  "Downtempo", "Dub", "EBM", "Eclectic", "Electro", "Electroclash", "Emo", "Experimental",
  "Garage", "Global", "IDM", "Illbient", "Industro-Goth", "Jam Band", "Krautrock",
  "Leftfield", "Lounge", "Math Rock", "New Romantic", "Nu-Breakz", "Post-Punk", "Post-Rock",
  "Psytrance", "Shoegaze", "Space Rock", "Trop Rock", "World Music", "Neoclassical", "Audiobook",
  "Audio Theatre", "Neue Deutsche Welle", "Podcast", "Indie Rock", "G-Funk", "Dubstep",
  "Garage Rock", "Psybient"
];

/**
 * ID3v1 tag header interface
 */
interface Iid3v1Header {
  header: string,
  title: string,
  artist: string,
  album: string,
  year: string,
  comment: string,
  zeroByte: number,
  track: number,
  genre: number
}

/**
 * Spec: http://id3.org/ID3v1
 * Wiki: https://en.wikipedia.org/wiki/ID3
 */
const Iid3v1Token: Token.IGetToken<Iid3v1Header> = {
  len: 128,

  /**
   * @param buf Buffer possibly holding the 128 bytes ID3v1.1 metadata header
   * @param off Offset in buffer in bytes
   * @returns ID3v1.1 header if first 3 bytes equals 'TAG', otherwise null is returned
   */
  get: (buf, off): Iid3v1Header => {
    const header = new Id3v1StringType(3).get(buf, off);
    return header === "TAG" ? {
      header,
      title: new Id3v1StringType(30).get(buf, off + 3),
      artist: new Id3v1StringType(30).get(buf, off + 33),
      album: new Id3v1StringType(30).get(buf, off + 63),
      year: new Id3v1StringType(4).get(buf, off + 93),
      comment: new Id3v1StringType(28).get(buf, off + 97),
      // ID3v1.1 separator for track
      zeroByte: Token.UINT8.get(buf, off + 127),
      // track: ID3v1.1 field added by Michael Mutschler
      track: Token.UINT8.get(buf, off + 126),
      genre: Token.UINT8.get(buf, off + 127)
    } : null;
  }
};

class Id3v1StringType extends Token.StringType {

  constructor(len: number) {
    super(len, "binary");
  }

  public get(buf: Buffer, off: number): string {
    let value = super.get(buf, off);
    value = BitUtil.trimRightNull(value);
    value = value.trim();
    return value.length > 0 ? value : undefined;
  }
}

export class ID3v1Parser extends BasicParser {

  private static getGenre(genreIndex: number): string {
    if (genreIndex < Genres.length) {
      return Genres[genreIndex];
    }
    return undefined; // ToDO: generate warning
  }

  public async parse(): Promise<void> {

    if (!this.tokenizer.fileSize) {
      debug('Skip checking for ID3v1 because the file-size is unknown');
      return;
    }
    const offset = this.tokenizer.fileSize - Iid3v1Token.len;
    if (this.tokenizer.position > offset) {
      debug('Already consumed the last 128 bytes');
      return;
    }
    const header = await this.tokenizer.readToken<Iid3v1Header>(Iid3v1Token, offset);
    if (header) {
      debug("ID3v1 header found at: pos=%s", this.tokenizer.fileSize - Iid3v1Token.len);
      for (const id of ["title", "artist", "album", "comment", "track", "year"]) {
        if (header[id] && header[id] !== "")
          this.addTag(id, header[id]);
      }
      const genre = ID3v1Parser.getGenre(header.genre);
      if (genre)
        this.addTag('genre', genre);
    } else {
      debug("ID3v1 header not found at: pos=%s", this.tokenizer.fileSize - Iid3v1Token.len);
    }
  }

  private addTag(id: string, value: any) {
    this.metadata.addTag('ID3v1', id, value);
  }
}
