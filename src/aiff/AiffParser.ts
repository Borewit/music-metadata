import {ITokenParser} from "../ParserFactory";
import {ITokenizer} from "strtok3";
import {IOptions, INativeAudioMetadata, IFormat} from "../";
import * as Token from "token-types";

interface IByteHeader {
  groupId: string,
  // Size
  size: number,
  // Type-ID
  typeId: string
}

class Structure {
  /**
   * APE_DESCRIPTOR: defines the sizes (and offsets) of all the pieces, as well as the MD5 checksum
   */
  public static ByteHeader: Token.IGetToken<IByteHeader> = {
    len: 12,

    get: (buf, off): IByteHeader => {
      return {
        // Group-ID
        groupId: new Token.StringType(4, 'ascii').get(buf, off),
        // Size
        size: buf.readUInt32BE(off + 4),
        // Type-ID
        typeId: new Token.StringType(4, 'ascii').get(buf, off + 8)

      };
    }
  };
}

/**
 * AIFF - Audio Interchange File Format
 *
 * Ref:
 *  http://www.onicos.com/staff/iz/formats/aiff.html
 *  http://muratnkonar.com/aiff/index.html
 */
export class AIFFParser implements ITokenParser {

  private tokenizer: ITokenizer;
  private options: IOptions;
  private format: IFormat = {
    headerType: "AIFF"
  };

  public parse(tokenizer: ITokenizer, options: IOptions): Promise<INativeAudioMetadata> {

    this.tokenizer = tokenizer;
    this.options = options;

    return this.tokenizer.readToken(Structure.ByteHeader)
      .then((header) => {
        this.format.dataformat = header.typeId;
        return null;
      });

  }

}
