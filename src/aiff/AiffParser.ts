import * as Token from 'token-types';
import { Readable } from 'stream';
import * as initDebug from 'debug';
import { endOfFile } from 'strtok3/lib/type';
import * as strtok3 from 'strtok3/lib/core';

import { ID3v2Parser } from '../id3v2/ID3v2Parser';
import { FourCcToken } from '../common/FourCC';
import { BasicParser } from '../common/BasicParser';

import * as AiffToken from './AiffToken';
import * as iff from '../iff';
import { ID3Stream } from "../id3v2/ID3Stream";

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

    const header = await this.tokenizer.readToken<iff.IChunkHeader>(iff.Header);
    if (header.chunkID !== 'FORM')
      throw new Error('Invalid Chunk-ID, expected \'FORM\''); // Not AIFF format

    const type = await this.tokenizer.readToken<string>(FourCcToken);
    switch (type) {

      case 'AIFF':
        this.metadata.setFormat('container', type);
        this.isCompressed = false;
        break;

      case 'AIFC':
        this.metadata.setFormat('container', 'AIFF-C');
        this.isCompressed = true;
        break;

      default:
        throw Error('Unsupported AIFF type: ' + type);
    }
    this.metadata.setFormat('lossless', !this.isCompressed);

    try {
      do {
        const chunkHeader = await this.tokenizer.readToken<iff.IChunkHeader>(iff.Header);

        debug(`Chunk id=${chunkHeader.chunkID}`);
        const nextChunk = 2 * Math.round(chunkHeader.chunkSize / 2);
        const bytesRead = await this.readData(chunkHeader);
        await this.tokenizer.ignore(nextChunk - bytesRead);
      } while (true);
    } catch (err) {
      if (err.message !== endOfFile) {
        throw err;
      }
    }
  }

  public async readData(header: iff.IChunkHeader): Promise<number> {
    switch (header.chunkID) {

      case 'COMM': // The Common Chunk
        const common = await this.tokenizer.readToken<AiffToken.ICommon>(new AiffToken.Common(header, this.isCompressed));
        this.metadata.setFormat('bitsPerSample', common.sampleSize);
        this.metadata.setFormat('sampleRate', common.sampleRate);
        this.metadata.setFormat('numberOfChannels', common.numChannels);
        this.metadata.setFormat('numberOfSamples', common.numSampleFrames);
        this.metadata.setFormat('duration', common.numSampleFrames / common.sampleRate);
        this.metadata.setFormat('codec', common.compressionName);
        return header.chunkSize;

      case 'ID3 ': // ID3-meta-data
        const id3_data = await this.tokenizer.readToken<Buffer>(new Token.BufferType(header.chunkSize));
        const id3stream = new ID3Stream(id3_data);
        const rst = strtok3.fromStream(id3stream);
        await new ID3v2Parser().parse(this.metadata, rst, this.options);
        return header.chunkSize;

      case 'SSND': // Sound Data Chunk
        if (this.metadata.format.duration) {
          this.metadata.setFormat('bitrate', 8 * header.chunkSize / this.metadata.format.duration);
        }
        return 0;

      default:
        return 0;
    }
  }

}
