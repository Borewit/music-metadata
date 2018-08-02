import * as strtok3 from "strtok3";
import {IOptions} from "../index";
import {ID3v2Token} from "./ID3v2";
import {ID3v2Parser} from "./ID3v2Parser";
import {ID3v1Parser} from "../id3v1/ID3v1Parser";
import {Promise} from "es6-promise";

import * as _debug from "debug";
import {IMetadataCollector} from "../common/MetadataCollector";
import {BasicParser} from "../common/BasicParser";

const debug = _debug("music-metadata:parser:ID3");

/**
 * Abstract parser which tries take ID3v2 and ID3v1 headers.
 */
export abstract class AbstractID3Parser extends BasicParser {

  public static startsWithID3v2Header(tokenizer: strtok3.ITokenizer): Promise<boolean> {
    return tokenizer.peekToken(ID3v2Token.Header).then(id3Header => (id3Header.fileIdentifier === "ID3"));
  }

  private id3parser = new ID3v2Parser();

  public parse(): Promise<void> {

    return this.parseID3v2().catch(err => {
      if (err.message === strtok3.endOfFile)
      // ToDo: maybe a warning?
        return;
      else
        throw err;
    });
  }

  /**
   * Called after ID3v2 headers are parsed
   */
  public abstract _parse(): Promise<void>;

  protected finalize() {
    return;
  }

  private parseID3v2(): Promise<void> {
    return this.tryReadId3v2Headers()
      .then(() => {
        debug("End of ID3v2 header, go to MPEG-parser: pos=%s", this.tokenizer.position);
        return this._parse();
      })
      .then(() => {
        if (this.options.skipPostHeaders && this.metadata.hasAny()) {
          this.finalize();
        } else {
          const id3v1parser = new ID3v1Parser();
          return id3v1parser.init(this.metadata, this.tokenizer, this.options).parse().then(() => {
            this.finalize();
          });
        }
      });
  }

  private tryReadId3v2Headers(): Promise<void> {
    return this.tokenizer.peekToken(ID3v2Token.Header)
      .then(id3Header => {
        if (id3Header.fileIdentifier === "ID3") {
          debug("Found ID3v2 header, pos=%s", this.tokenizer.position);
          return this.id3parser.parse(this.metadata, this.tokenizer, this.options)
            .then(() => this.tryReadId3v2Headers());
        }
      });
  }

}
