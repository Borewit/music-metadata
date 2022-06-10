import { EndOfStreamError, ITokenizer } from "strtok3/lib/core";
import initDebug from "debug";

import { ID3v2Header } from "./ID3v2Token";
import { ID3v2Parser } from "./ID3v2Parser";
import { ID3v1Parser } from "../id3v1/ID3v1Parser";
import { BasicParser } from "../common/BasicParser";

const debug = initDebug("music-metadata:parser:ID3");

/**
 * Abstract parser which tries take ID3v2 and ID3v1 headers.
 */
export abstract class AbstractID3Parser extends BasicParser {
  public static async startsWithID3v2Header(
    tokenizer: ITokenizer
  ): Promise<boolean> {
    return (await tokenizer.peekToken(ID3v2Header)).fileIdentifier === "ID3";
  }

  private id3parser = new ID3v2Parser();

  public async parse(): Promise<void> {
    try {
      await this.parseID3v2();
    } catch (err) {
      if (err instanceof EndOfStreamError) {
        debug(`End-of-stream`);
      } else {
        throw err;
      }
    }
  }

  /**
   * Called after ID3v2 headers are parsed
   */
  public abstract postId3v2Parse(): Promise<void>;

  protected finalize() {
    return;
  }

  private async parseID3v2(): Promise<void> {
    await this.tryReadId3v2Headers();

    debug(
      "End of ID3v2 header, go to MPEG-parser: pos=%s",
      this.tokenizer.position
    );
    await this.postId3v2Parse();
    if (this.options.skipPostHeaders && this.metadata.hasAny()) {
      this.finalize();
    } else {
      const id3v1parser = new ID3v1Parser();
      await id3v1parser
        .init(this.metadata, this.tokenizer, this.options)
        .parse();
      this.finalize();
    }
  }

  private async tryReadId3v2Headers(): Promise<void> {
    const id3Header = await this.tokenizer.peekToken(ID3v2Header);

    if (id3Header.fileIdentifier === "ID3") {
      debug("Found ID3v2 header, pos=%s", this.tokenizer.position);
      await this.id3parser.parse(this.metadata, this.tokenizer, this.options);
      return this.tryReadId3v2Headers();
    }
  }
}
