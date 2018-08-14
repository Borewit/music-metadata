import {ITokenParser} from "../ParserFactory";
import * as strtok3 from "strtok3";
import {INativeAudioMetadata, IOptions} from "../index";
import {ID3v2Token} from "./ID3v2";
import {ID3v2Parser} from "./ID3v2Parser";
import {ID3v1Parser} from "../id3v1/ID3v1Parser";
import {Promise} from "es6-promise";

import * as _debug from "debug";

const debug = _debug("music-metadata:parser:ID3");

/**
 * Abstract parser which tries take ID3v2 and ID3v1 headers.
 */
export abstract class AbstractID3Parser implements ITokenParser {

  public static startsWithID3v2Header(tokenizer: strtok3.ITokenizer): Promise<boolean> {
    return tokenizer.peekToken(ID3v2Token.Header).then(id3Header => (id3Header.fileIdentifier === "ID3"));
  }

  private id3parser = new ID3v2Parser();

  public parse(tokenizer: strtok3.ITokenizer, options: IOptions): Promise<INativeAudioMetadata> {

    const metadata: INativeAudioMetadata = {
      format: {},
      native: {}
    };

    return this.parseID3v2(metadata, tokenizer, options).then(() => {
      return metadata;
    }).catch(err => {
      if (err.message === strtok3.endOfFile)
      // ToDo: maybe a warning?
        return metadata;
      else
        throw err;
    });
  }

  /**
   * Called after ID3v2 headers are parsed
   */
  public abstract _parse(metadata: INativeAudioMetadata, tokenizer: strtok3.ITokenizer, options: IOptions): Promise<void>;

  protected finalize(metadata: INativeAudioMetadata): INativeAudioMetadata {
    return metadata;
  }

  private parseID3v2(metadata: INativeAudioMetadata, tokenizer: strtok3.ITokenizer, options: IOptions): Promise<void> {
    return this.tryReadId3v2Headers(metadata, tokenizer, options)
      .then(() => {
        debug("End of ID3v2 header, go to MPEG-parser: pos=%s", tokenizer.position);
        return this._parse(metadata, tokenizer, options);
      })
      .then(() => {
        if (options.skipPostHeaders && this.hasAnyMetadata(metadata)) {
          this.finalize(metadata);
        } else {
          const id3v1parser = new ID3v1Parser();
          return id3v1parser.parse(tokenizer).then(id3v1Metadata => {
            for (const tagType in id3v1Metadata) {
              metadata.native[tagType] = id3v1Metadata[tagType];
            }
            this.finalize(metadata);
          });
        }
      });
  }

  private hasAnyMetadata(md: INativeAudioMetadata) {
    for (const tagType in md.native) {
      return true;
    }
    return false;
  }

  private tryReadId3v2Headers(metadata: INativeAudioMetadata, tokenizer: strtok3.ITokenizer, options: IOptions): Promise<void> {
    return tokenizer.peekToken(ID3v2Token.Header)
      .then(id3Header => {
        if (id3Header.fileIdentifier === "ID3") {
          debug("Found ID3v2 header, pos=%s", tokenizer.position);
          return this.id3parser.parse(metadata, tokenizer, options)
            .then(() => this.tryReadId3v2Headers(metadata, tokenizer, options));
        }
      });
  }

}
