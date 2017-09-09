import {ITokenParser} from "../ParserFactory";
import * as strtok3 from "strtok3";
import {INativeAudioMetadata, IOptions} from "../index";
import {ID3v2Token} from "./ID3v2";
import {ID3v2Parser} from "./ID3v2Parser";
import {ID3v1Parser} from "../id3v1/ID3v1Parser";

export abstract class AbstractID3v2Parser implements ITokenParser {

  public static startsWithID3v2Header(tokenizer: strtok3.ITokenizer): Promise<boolean> {
    return tokenizer.peekToken(ID3v2Token.Header).then(id3Header => (id3Header.fileIdentifier === "ID3"));
  }

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
    });
  }

  /**
   * Called after ID3v2 headers are parsed
   * @param metadata Metadata result
   * @param tokenizer
   * @param options
   * @param prefixSize Number of bytes already parsed since beginning of stream / file
   * @private
   */
  public abstract _parse(metadata: INativeAudioMetadata, tokenizer: strtok3.ITokenizer, options: IOptions): Promise<void>;

  protected finalize(metadata: INativeAudioMetadata): INativeAudioMetadata {
    return metadata;
  }

  private parseID3v2(metadata: INativeAudioMetadata, tokenizer: strtok3.ITokenizer, options: IOptions): Promise<void> {
    return tokenizer.peekToken(ID3v2Token.Header)
      .then(id3Header => (id3Header.fileIdentifier === "ID3"))
      .then(isID3 => {
        if (isID3) {
          const id3parser = new ID3v2Parser();
          return id3parser.parse(metadata, tokenizer, options).then(() => this.parseID3v2(metadata, tokenizer, options));
        }
      })
      .then(() => {
        // merge ID3v2 metadata with whatever came after the ID3v2 header
        return this._parse(metadata, tokenizer, options);
      })
      .then(() => {
        const id3v1parser = new ID3v1Parser();
        return id3v1parser.parse(tokenizer).then(id3v1Metadata => {
          for (const tagType in id3v1Metadata) {
            metadata.native[tagType] = id3v1Metadata[tagType];
          }
          this.finalize(metadata);
        });
      });
  }
}
