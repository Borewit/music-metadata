import * as Token from 'token-types';
import { Readable } from 'stream';
import * as initDebug from 'debug';
import { endOfFile } from 'strtok3/lib/type';
import * as strtok3 from 'strtok3/lib/core';

import { ID3v2Parser } from '../id3v2/ID3v2Parser';
import { FourCcToken } from '../common/FourCC';
import { BasicParser } from '../common/BasicParser';

import * as Chunk from './Chunk';

const debug = initDebug('music-metadata:parser:aiff');

/**
 * AIFF - Audio Interchange File Format
 *
 * Ref:
 *  http://www.onicos.com/staff/iz/formats/aiff.html
 *  http://muratnkonar.com/aiff/index.html
 *  http://www-mmsp.ece.mcgill.ca/Documents/AudioFormats/AIFF/AIFF.html
 */
export class AIFFParser extends BasicParser {

  private isCompressed: boolean;

  public async parse(): Promise<void> {

    const header = await this.tokenizer.readToken<Chunk.IChunkHeader>(Chunk.Header);
    if (header.chunkID !== 'FORM')
      throw new Error('Invalid Chunk-ID, expected \'FORM\''); // Not AIFF format

    const type = await this.tokenizer.readToken<string>(FourCcToken);
    switch (type) {

      case 'AIFF':
        this.metadata.setFormat('dataformat', type);
        this.isCompressed = false;
        break;

      case 'AIFC':
        this.metadata.setFormat('dataformat', 'AIFF-C');
        this.isCompressed = true;
        break;

      default:
        throw Error('Unsupported AIFF type: ' + type);
    }
    this.metadata.setFormat('lossless', !this.isCompressed);

    try {
      do {
        const chunkHeader = await this.tokenizer.readToken<Chunk.IChunkHeader>(Chunk.Header);

        debug(`Chunk id=${chunkHeader.chunkID}`);
        const nextChunk = 2 * Math.round(chunkHeader.size / 2);
        const bytesread = await this.readData(chunkHeader);
        await this.tokenizer.ignore(nextChunk - bytesread);
      } while (true);
    } catch (err) {
      if (err.message !== endOfFile) {
        throw err;
      }
    }
  }

  public async readData(header: Chunk.IChunkHeader): Promise<number> {
    switch (header.chunkID) {

      case 'COMM': // The Common Chunk
        const common = await this.tokenizer.readToken<Chunk.ICommon>(new Chunk.Common(header, this.isCompressed));
        this.metadata.setFormat('bitsPerSample', common.sampleSize);
        this.metadata.setFormat('sampleRate', common.sampleRate);
        this.metadata.setFormat('numberOfChannels', common.numChannels);
        this.metadata.setFormat('numberOfSamples', common.numSampleFrames);
        this.metadata.setFormat('duration', common.numSampleFrames / common.sampleRate);
        this.metadata.setFormat('encoder', common.compressionName);
        return header.size;

      case 'ID3 ': // ID3-meta-data
        const id3_data = await this.tokenizer.readToken<Buffer>(new Token.BufferType(header.size));
        const id3stream = new ID3Stream(id3_data);
        const rst = strtok3.fromStream(id3stream);
        await ID3v2Parser.getInstance().parse(this.metadata, rst, this.options);
        return header.size;

      case 'SSND': // Sound Data Chunk
        if (this.metadata.format.duration) {
          this.metadata.setFormat('bitrate', 8 * header.size / this.metadata.format.duration);
        }
        return 0;

      default:
        return 0;
    }
  }

}

class ID3Stream extends Readable {

  constructor(private buf: Buffer) {
    super();
  }

  public _read() {
    this.push(this.buf);
    this.push(null); // push the EOF-signaling `null` chunk
  }
}
