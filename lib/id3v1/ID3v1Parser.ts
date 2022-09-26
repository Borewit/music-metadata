import { APEv2Parser } from "../apev2/APEv2Parser";
import { BasicParser } from "../common/BasicParser";
import { decodeLatin1 } from "../compat/text-decoder";
import initDebug from "../debug";
import { id3v1Header } from "../parse-unit/id3v1/header";
import { readUnitFromTokenizer } from "../parse-unit/utility/read-unit";

import { Genres } from "./ID3v1Genres";

import type { IRandomReader } from "../type";

const debug = initDebug("music-metadata:parser:ID3v1");

export class ID3v1Parser extends BasicParser {
  private static getGenre(genreIndex: number): string | undefined {
    if (genreIndex < Genres.length) {
      return Genres[genreIndex];
    }
    return undefined; // ToDO: generate warning
  }

  public async parse(): Promise<void> {
    if (this.tokenizer.fileInfo.size === 0) {
      debug("Skip checking for ID3v1 because the file-size is unknown");
      return;
    }

    if (this.options.apeHeader) {
      void this.tokenizer.ignore(this.options.apeHeader.offset - this.tokenizer.position);
      const apeParser = new APEv2Parser();
      apeParser.init(this.metadata, this.tokenizer, this.options);
      await apeParser.parseTags(this.options.apeHeader.footer);
    }

    const offset = this.tokenizer.fileInfo.size - id3v1Header[0];
    if (this.tokenizer.position > offset) {
      debug("Already consumed the last 128 bytes");
      return;
    }

    await this.tokenizer.ignore(offset - this.tokenizer.position);
    const header = await readUnitFromTokenizer(this.tokenizer, id3v1Header);

    if (header && header.header === "TAG") {
      debug("ID3v1 header found at: pos=%s", offset);
      for (const id of ["title", "artist", "album", "comment", "track", "year"] as const) {
        if (header[id] && header[id] !== "") this.addTag(id, header[id]);
      }
      const genre = ID3v1Parser.getGenre(header.genre);
      if (genre) this.addTag("genre", genre);
    } else {
      debug("ID3v1 header not found at: pos=%s", offset);
    }
  }

  private addTag(id: string, value: any) {
    this.metadata.addTag("ID3v1", id, value);
  }
}

/**
 *
 * @param reader
 */
export async function hasID3v1Header(reader: IRandomReader): Promise<boolean> {
  if (reader.fileSize >= 128) {
    const tag = new Uint8Array(3);
    await reader.randomRead(tag, 0, tag.length, reader.fileSize - 128);
    return decodeLatin1(tag) === "TAG";
  }
  return false;
}
