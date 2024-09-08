import { BasicParser } from '../common/BasicParser.js';
import { AnsiStringType } from 'token-types';
import initDebug from 'debug';
import { FrameHeader } from './AmrToken.js';

const debug = initDebug('music-metadata:parser:AMR');

/**
 * There are 8 varying levels of compression. First byte of the frame specifies CMR
 * (codec mode request), values 0-7 are valid for AMR. Each mode have different frame size.
 * This table reflects that fact.
 */
const m_block_size = [12, 13, 15, 17, 19, 20, 26, 31, 5, 0, 0, 0, 0, 0, 0, 0];

/**
 * Adaptive Multi-Rate audio codec
 */
export class AmrParser extends BasicParser {

  public async parse(): Promise<void> {
    const magicNr = await this.tokenizer.readToken(new AnsiStringType(5));
    if (magicNr !== '#!AMR') {
      throw new Error('Invalid AMR file: invalid MAGIC number');
    }
    this.metadata.setFormat('container', 'AMR');
    this.metadata.setFormat('codec', 'AMR');
    this.metadata.setFormat('sampleRate', 8000);
    this.metadata.setFormat('bitrate', 64000);
    this.metadata.setFormat('numberOfChannels', 1);

    let total_size = 0;
    let frames = 0;

    const assumedFileLength = this.tokenizer.fileInfo?.size ?? Number.MAX_SAFE_INTEGER;

    if (this.options.duration) {
      while (this.tokenizer.position < assumedFileLength) {

        const header = await this.tokenizer.readToken(FrameHeader);

        /* first byte is rate mode. each rate mode has frame of given length. look it up. */
        const size = m_block_size[header.frameType];

        if(size>0) {
          total_size += size + 1;
          if (total_size > assumedFileLength) break;
          await this.tokenizer.ignore(size);
          ++frames;
        } else {
          debug(`Found no-data frame, frame-type: ${header.frameType}. Skipping`);
        }

      }
      this.metadata.setFormat('duration', frames * 0.02);
    }
  }
}
