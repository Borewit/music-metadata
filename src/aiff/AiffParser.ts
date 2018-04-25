import {ITokenParser} from "../ParserFactory";
import * as strtok3 from "strtok3";
import {IOptions, INativeAudioMetadata} from "../";
import * as Token from "token-types";
import * as Chunk from "./Chunk";
import {Readable} from "stream";
import {ID3v2Parser} from "../id3v2/ID3v2Parser";
import {FourCcToken} from "../common/FourCC";

/**
 * AIFF - Audio Interchange File Format
 *
 * Ref:
 *  http://www.onicos.com/staff/iz/formats/aiff.html
 *  http://muratnkonar.com/aiff/index.html
 */
export class AIFFParser implements ITokenParser {

  private tokenizer: strtok3.ITokenizer;
  private options: IOptions;

  private metadata: INativeAudioMetadata = {
    format: {
      dataformat: "AIFF",
      tagTypes: []
    },
    native: {}
  };

  private native: INativeAudioMetadata;

  public parse(tokenizer: strtok3.ITokenizer, options: IOptions): Promise<INativeAudioMetadata> {

    this.tokenizer = tokenizer;
    this.options = options;

    return this.tokenizer.readToken<Chunk.IChunkHeader>(Chunk.Header)
      .then(header => {
        if (header.chunkID !== 'FORM')
          throw new Error("Invalid Chunk-ID, expected 'FORM'"); // Not AIFF format

        return this.tokenizer.readToken<string>(FourCcToken).then(type => {
          this.metadata.format.dataformat = type;
        }).then(() => {
          return this.readChunk().then(() => this.metadata);
        });
      });
  }

  public readChunk(): Promise<void> {
    return this.tokenizer.readToken<Chunk.IChunkHeader>(Chunk.Header)
      .then(header => {
        switch (header.chunkID) {

          case 'COMM': // The Common Chunk
            return this.tokenizer.readToken<Chunk.ICommon>(new Chunk.Common(header))
              .then(common => {
                this.metadata.format.bitsPerSample = common.sampleSize;
                this.metadata.format.sampleRate = common.sampleRate;
                this.metadata.format.numberOfChannels = common.numChannels;
                this.metadata.format.numberOfSamples = common.numSampleFrames;
                this.metadata.format.duration = this.metadata.format.numberOfSamples / this.metadata.format.sampleRate;
              });

          case 'ID3 ': // ID3-meta-data
            return this.tokenizer.readToken<Buffer>(new Token.BufferType(header.size))
              .then(id3_data => {
                const id3stream = new ID3Stream(id3_data);
                return strtok3.fromStream(id3stream).then(rst => {
                  return ID3v2Parser.getInstance().parse(this.metadata, rst, this.options);
                });
              });

          case 'SSND': // Sound Data Chunk
          default:
            return this.tokenizer.ignore(header.size);

        }
      }).then(() => this.readChunk()).catch(err => {
        if (err.message !== strtok3.endOfFile) {
          throw err;
        }
      });
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
