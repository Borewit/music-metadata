import initDebug from 'debug';
import * as Token from 'token-types';

import type { ITokenParser } from '../ParserFactory.js';
import { AbstractID3Parser } from '../id3v2/AbstractID3Parser.js';

import { MpcSv8Parser } from './sv8/MpcSv8Parser.js';
import { MpcSv7Parser } from './sv7/MpcSv7Parser.js';
import { MusepackContentError } from './MusepackConentError.js';

const debug = initDebug('music-metadata:parser:musepack');

class MusepackParser extends AbstractID3Parser {

  public async postId3v2Parse(): Promise<void> {
    const signature = await this.tokenizer.peekToken(new Token.StringType(3, 'latin1'));
    let mpcParser: ITokenParser;
    switch (signature) {
      case 'MP+': {
        debug('Stream-version 7');
        mpcParser = new MpcSv7Parser();
        break;
      }
      case 'MPC': {
        debug('Stream-version 8');
        mpcParser = new MpcSv8Parser();
        break;
      }
      default: {
        throw new MusepackContentError('Invalid signature prefix');
      }
    }
    mpcParser.init(this.metadata, this.tokenizer, this.options);
    return mpcParser.parse();
  }

}

export default MusepackParser;
