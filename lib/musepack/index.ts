import initDebug from "../debug";
import { AbstractID3Parser } from "../id3v2/AbstractID3Parser";
import { Latin1StringType } from "../token-types/string";

import { MpcSv7Parser } from "./sv7/MpcSv7Parser";
import { MpcSv8Parser } from "./sv8/MpcSv8Parser";

import type { ITokenParser } from "../ParserFactory";

const debug = initDebug("music-metadata:parser:musepack");

class MusepackParser extends AbstractID3Parser {
  public async postId3v2Parse(): Promise<void> {
    const signature = await this.tokenizer.peekToken(new Latin1StringType(3));
    let mpcParser: ITokenParser;
    switch (signature) {
      case "MP+": {
        debug("Musepack stream-version 7");
        mpcParser = new MpcSv7Parser();
        break;
      }
      case "MPC": {
        debug("Musepack stream-version 8");
        mpcParser = new MpcSv8Parser();
        break;
      }
      default: {
        throw new Error("Invalid Musepack signature prefix");
      }
    }
    mpcParser.init(this.metadata, this.tokenizer, this.options);
    return mpcParser.parse();
  }
}

export default MusepackParser;
