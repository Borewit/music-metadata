import * as initDebug from 'debug';

import * as Token from 'token-types';
import { ITokenParser } from '../ParserFactory';
import { MpcSv8Parser } from './sv8/MpcSv8Parser';
import { MpcSv7Parser } from './sv7/MpcSv7Parser';
import { AbstractID3Parser } from '../id3v2/AbstractID3Parser';

const debug = initDebug('music-metadata:parser:musepack');

class MusepackParser extends AbstractID3Parser {

  public async _parse(): Promise<void> {
    const signature = await this.tokenizer.peekToken(new Token.StringType(3, 'binary'));
    let mpcParser: ITokenParser;
    switch (signature) {
      case 'MP+': {
        debug('Musepack stream-version 7');
        mpcParser = new MpcSv7Parser();
        break;
      }
      case 'MPC': {
        debug('Musepack stream-version 8');
        mpcParser = new MpcSv8Parser();
        break;
      }
      default: {
        throw new Error('Invalid Musepack signature prefix');
      }
    }
    mpcParser.init(this.metadata, this.tokenizer, this.options);
    return mpcParser.parse();
  }

}

export default MusepackParser;
