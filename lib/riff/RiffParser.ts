import {ITokenParser} from "../ParserFactory";
import * as strtok3 from "strtok3";
import {IOptions, INativeAudioMetadata} from "../";
import * as Token from "token-types";
import * as RiffChunk from "./RiffChunk";
import * as WaveChunk from "./../wav/WaveChunk";
import {Readable} from "stream";
import {ID3v2Parser} from "../id3v2/ID3v2Parser";

/**
 * Resource Interchange File Format (RIFF) Parser
 *
 * WAVE PCM soundfile format
 *
 * Ref:
 *  http://www.johnloomis.org/cpe102/asgn/asgn1/riff.html
 *  http://soundfile.sapp.org/doc/WaveFormat
 */
export class WavePcmParser implements ITokenParser {

  private tokenizer: strtok3.ITokenizer;
  private options: IOptions;

  private metadata: INativeAudioMetadata = {
    format: {
      dataformat: "WAVE PCM"
    },
    native: {}
  };
  private warnings: string[] = [];

  private blockAlign: number;

  private native: INativeAudioMetadata;

  public parse(tokenizer: strtok3.ITokenizer, options: IOptions): Promise<INativeAudioMetadata> {

    this.tokenizer = tokenizer;
    this.options = options;

    return this.tokenizer.readToken<RiffChunk.IChunkHeader>(RiffChunk.Header)
      .then((header) => {
        if (header.chunkID !== 'RIFF')
          return null; // Not AIFF format

        return this.tokenizer.readToken<string>(new Token.StringType(4, 'ascii')).then((type) => {
          this.metadata.format.dataformat = type;
        }).then(() => {
          return this.readChunk().then(() => {
            return null;
          });
        });
      })
      .catch((err) => {
        if (err === strtok3.EndOfFile) {
          return this.metadata;
        } else {
          throw err;
        }
      });
  }

  public readChunk(): Promise<void> {
    return this.tokenizer.readToken<RiffChunk.IChunkHeader>(WaveChunk.Header)
      .then((header) => {
        switch (header.chunkID) {

          case "fmt ": // The Common Chunk
            return this.tokenizer.readToken<WaveChunk.IFormat>(new WaveChunk.Format(header))
              .then((common) => {
                this.metadata.format.bitsPerSample = common.bitsPerSample;
                this.metadata.format.sampleRate = common.sampleRate;
                this.metadata.format.numberOfChannels = common.numChannels;
                this.metadata.format.bitrate = common.blockAlign * common.sampleRate * 8;
                this.blockAlign = common.blockAlign;
             });

          case "id3 ": // The way Picard currently stores, ID3 meta-data
          case "ID3 ": // The way Mp3Tags stores ID3 meta-data
            return this.tokenizer.readToken<Buffer>(new Token.BufferType(header.size))
              .then((id3_data) => {
                const id3stream = new ID3Stream(id3_data);
                return strtok3.fromStream(id3stream).then((rst) => {
                  return ID3v2Parser.getInstance().parse(rst, this.options).then((id3) => {
                    this.metadata.format.headerType = id3.format.headerType;
                    this.metadata.native = id3.native;
                  });
                });
              });

          case 'data': // PCM-data
            this.metadata.format.numberOfSamples = header.size / this.blockAlign;
            this.metadata.format.duration = this.metadata.format.numberOfSamples / this.metadata.format.sampleRate;
            return this.tokenizer.ignore(header.size);

          case "LIST": // LIST ToDo?
          default:
            this.warnings.push("Ignore chunk: " + header.chunkID);
            return this.tokenizer.ignore(header.size);
        }
      }).then(() => {
        return this.readChunk();
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
