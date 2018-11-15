import * as initDebug from 'debug';

import { BasicParser } from '../common/BasicParser';

import * as Token from 'token-types';
import { ITokenParser } from '../ParserFactory';
import { MpcSv8Parser } from './sv8/MpcSv8Parser';
import { MpcSv7Parser } from './sv7/MpcSv7Parser';

const debug = initDebug('music-metadata:parser:musepack');

class MusepackParser extends BasicParser {

  public parse(): Promise<void> {
    return this.tokenizer.peekToken(new Token.StringType(3, 'binary')).then(signature => {
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
    });
  }

}

export default MusepackParser;
