import {endOfFile} from 'strtok3/lib/type';
import * as strtok3 from 'strtok3/lib/core';
import * as Token from 'token-types';
import * as initDebug from 'debug';
import {Readable} from 'stream';

import * as RiffChunk from './RiffChunk';
import * as WaveChunk from './../wav/WaveChunk';
import {ID3v2Parser} from '../id3v2/ID3v2Parser';
import {IChunkHeader} from '../aiff/Chunk';
import Common from '../common/Util';
import {FourCcToken} from '../common/FourCC';
import {BasicParser} from '../common/BasicParser';

const debug = initDebug('music-metadata:parser:RIFF');

/**
 * Resource Interchange File Format (RIFF) Parser
 *
 * WAVE PCM soundfile format
 *
 * Ref:
 *  http://www.johnloomis.org/cpe102/asgn/asgn1/riff.html
 *  http://soundfile.sapp.org/doc/WaveFormat
 *
 *  ToDo: Split WAVE part from RIFF parser
 */
export class WavePcmParser extends BasicParser {

  private fact: WaveChunk.IFactChunk;

  private blockAlign: number;

  public parse(): Promise<void> {

    return this.tokenizer.readToken<RiffChunk.IChunkHeader>(RiffChunk.Header)
      .then(riffHeader => {
        debug('pos=%s, parse: chunkID=%s', this.tokenizer.position, riffHeader.chunkID);
        if (riffHeader.chunkID !== 'RIFF')
          return null; // Not RIFF format

        return this.parseRiffChunk();
      })
      .catch(err => {
        if (err.message !== endOfFile) {
          throw err;
        }
      });
  }

  public parseRiffChunk(): Promise<void> {
    return this.tokenizer.readToken<string>(FourCcToken).then(type => {
      this.metadata.setFormat('dataformat', type);
      switch (type) {
        case "WAVE":
          return this.readWaveChunk();
        default:
          throw new Error("Unsupported RIFF format: RIFF/" + type);
      }
    });
  }

  public readWaveChunk(): Promise<void> {
    return this.tokenizer.readToken<RiffChunk.IChunkHeader>(RiffChunk.Header)
      .then(header => {
        debug('pos=%s, readChunk: chunkID=RIFF/WAVE/%s', this.tokenizer.position, header.chunkID);
        switch (header.chunkID) {

          case "LIST":
            return this.parseListTag(header);

          case 'fact': // extended Format chunk,
            this.metadata.setFormat('lossless', false);
            return this.tokenizer.readToken(new WaveChunk.FactChunk(header)).then(fact => {
              this.fact = fact;
            });

          case "fmt ": // The Util Chunk, non-PCM Formats
            return this.tokenizer.readToken<WaveChunk.IWaveFormat>(new WaveChunk.Format(header))
              .then(fmt => {
                let subFormat = WaveChunk.WaveFormat[fmt.wFormatTag];
                if (!subFormat) {
                  debug("WAVE/non-PCM format=" + fmt.wFormatTag);
                  subFormat = "non-PCM (" + fmt.wFormatTag + ")";
                }
                this.metadata.setFormat('dataformat', 'WAVE/' + subFormat);
                this.metadata.setFormat('bitsPerSample', fmt.wBitsPerSample);
                this.metadata.setFormat('sampleRate',  fmt.nSamplesPerSec);
                this.metadata.setFormat('numberOfChannels', fmt.nChannels);
                this.metadata.setFormat('bitrate', fmt.nBlockAlign * fmt.nSamplesPerSec * 8);
                this.blockAlign = fmt.nBlockAlign;
              });

          case "id3 ": // The way Picard, FooBar currently stores, ID3 meta-data
          case "ID3 ": // The way Mp3Tags stores ID3 meta-data
            return this.tokenizer.readToken<Buffer>(new Token.BufferType(header.size))
              .then(id3_data => {
                const id3stream = new ID3Stream(id3_data);
                const rst = strtok3.fromStream(id3stream);
                return ID3v2Parser.getInstance().parse(this.metadata, rst, this.options);
              });

          case 'data': // PCM-data
            if (this.metadata.format.lossless !== false) {
              this.metadata.setFormat('lossless', true);
            }
            const numberOfSamples = this.fact ? this.fact.dwSampleLength : (header.size / this.blockAlign);
            this.metadata.setFormat('numberOfSamples', numberOfSamples);

            this.metadata.setFormat('duration', numberOfSamples / this.metadata.format.sampleRate);
            this.metadata.setFormat('bitrate', this.metadata.format.numberOfChannels * this.blockAlign * this.metadata.format.sampleRate); // ToDo: check me
            return this.tokenizer.ignore(header.size);

          default:
            debug("Ignore chunk: RIFF/" + header.chunkID);
            this.warnings.push("Ignore chunk: RIFF/" + header.chunkID);
            return this.tokenizer.ignore(header.size);
        }
      }).then(() => {
        return this.readWaveChunk();
      });
  }

  public parseListTag(listHeader: IChunkHeader): Promise<void> {
    return this.tokenizer.readToken<string>(FourCcToken).then(listType => {
      debug('pos=%s, parseListTag: chunkID=RIFF/WAVE/LIST/%s', this.tokenizer.position, listType);
      switch (listType) {
        case 'INFO':
          return this.parseRiffInfoTags(listHeader.size - 4);

        default:
          this.warnings.push("Ignore chunk: RIFF/WAVE/LIST/" + listType);
          debug("Ignoring chunkID=RIFF/WAVE/LIST/" + listType);

        case 'adtl':
          return this.tokenizer.ignore(listHeader.size - 4);
      }
    });
  }

  private parseRiffInfoTags(chunkSize): Promise<void> {
    if (chunkSize === 0) {
      return Promise.resolve<void>(null);
    }
    return this.tokenizer.readToken<RiffChunk.IChunkHeader>(RiffChunk.Header)
      .then(header => {
        const valueToken = new RiffChunk.ListInfoTagValue(header);
        return this.tokenizer.readToken(valueToken).then(value => {
          this.addTag(header.chunkID, Common.stripNulls(value));
          chunkSize -= (8 + valueToken.len);
          if (chunkSize >= 8) {
            return this.parseRiffInfoTags(chunkSize);
          } else if (chunkSize !== 0) {
            throw Error("Illegal remaining size: " + chunkSize);
          }
        });
      });
  }

  private addTag(id: string, value: any) {
    this.metadata.addTag('exif', id, value);
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
