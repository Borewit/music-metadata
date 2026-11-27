import initDebug from 'debug';
import { EndOfStreamError } from 'strtok3';
import { BasicParser } from '../common/BasicParser.js';
import { ID3v1Parser } from '../id3v1/ID3v1Parser.js';

const debug = initDebug('music-metadata:parser:ID3');

/**
 * Parse the audio payload and collect any trailing ID3v1 metadata.
 */
export abstract class AbstractID3Parser extends BasicParser {
  public async parse(): Promise<void> {
    try {
      await this.postId3v2Parse();
      if (!(this.options.skipPostHeaders && this.metadata.hasAny())) {
        await new ID3v1Parser(this.metadata, this.tokenizer, this.options).parse();
      }
      this.finalize();
    } catch (err) {
      if (err instanceof EndOfStreamError) {
        debug('End-of-stream');
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
}
