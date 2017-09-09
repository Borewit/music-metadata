import {ITokenParser} from "../ParserFactory";
import * as strtok3 from "strtok3";
import {IOptions, INativeAudioMetadata, ITag} from "../";
import * as Token from "token-types";
import * as RiffChunk from "./RiffChunk";
import * as WaveChunk from "./../wav/WaveChunk";
import {Readable} from "stream";
import {ID3v2Parser} from "../id3v2/ID3v2Parser";
import {IChunkHeader} from "../aiff/Chunk";
import Common from "../common";

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

  /**
   * RIFF/ILIST-INFO tag stored in EXIF
   */
  private riffInfoTags: ITag[] = [];

  private warnings: string[] = [];

  private blockAlign: number;

  public parse(tokenizer: strtok3.ITokenizer, options: IOptions): Promise<INativeAudioMetadata> {

    this.tokenizer = tokenizer;
    this.options = options;

    return this.tokenizer.readToken<RiffChunk.IChunkHeader>(RiffChunk.Header)
      .then(header => {
        if (header.chunkID !== 'RIFF')
          return null; // Not RIFF format

        return this.tokenizer.readToken<string>(new Token.StringType(4, 'ascii')).then(type => {
          this.metadata.format.dataformat = type;
        }).then(() => {
          return this.readChunk(header).then(() => {
            return null;
          });
        });
      })
      .catch(err => {
        if (err.message === strtok3.endOfFile) {
          return this.metadata;
        } else {
          throw err;
        }
      }).then(metadata => {
        if (this.riffInfoTags.length > 0) {
          metadata.native.exif = this.riffInfoTags;
        }
        return metadata;
      });
  }

  public readChunk(parent: IChunkHeader): Promise<void> {
    return this.tokenizer.readToken<RiffChunk.IChunkHeader>(WaveChunk.Header)
      .then(header => {
        switch (header.chunkID) {

          case "LIST":
            return this.tokenizer.readToken<string>(new Token.StringType(4, 'ascii')).then(listTypes => {
              switch (listTypes) {
                case 'INFO':
                  return this.parseRiffInfoTags(header.size - 4).then(() => header.size);

                default:
                  this.warnings.push("Ignore chunk: RIFF/LIST." + listTypes);
                  return this.tokenizer.ignore(header.size).then(() => header.size);
              }
            });

          case "fmt ": // The Common Chunk
            return this.tokenizer.readToken<WaveChunk.IFormat>(new WaveChunk.Format(header))
              .then(common => {
                this.metadata.format.bitsPerSample = common.bitsPerSample;
                this.metadata.format.sampleRate = common.sampleRate;
                this.metadata.format.numberOfChannels = common.numChannels;
                this.metadata.format.bitrate = common.blockAlign * common.sampleRate * 8;
                this.blockAlign = common.blockAlign;
              });

          case "id3 ": // The way Picard, FooBar currently stores, ID3 meta-data
          case "ID3 ": // The way Mp3Tags stores ID3 meta-data
            return this.tokenizer.readToken<Buffer>(new Token.BufferType(header.size))
              .then(id3_data => {
                const id3stream = new ID3Stream(id3_data);
                return strtok3.fromStream(id3stream).then(rst => {
                  return ID3v2Parser.getInstance().parse(this.metadata, rst, this.options);
                });
              });

          case 'data': // PCM-data
            this.metadata.format.numberOfSamples = header.size / this.blockAlign;
            this.metadata.format.duration = this.metadata.format.numberOfSamples / this.metadata.format.sampleRate;
            this.metadata.format.bitrate = this.metadata.format.numberOfChannels * this.blockAlign * this.metadata.format.sampleRate; // ToDo: check me
            return this.tokenizer.ignore(header.size);

          default:
            this.warnings.push("Ignore chunk: RIFF/" + header.chunkID);
            return this.tokenizer.ignore(header.size);
        }
      }).then(() => {
        return this.readChunk(parent);
      });
  }

  private parseRiffInfoTags(chunkSize): Promise<void> {
    return this.tokenizer.readToken<RiffChunk.IChunkHeader>(WaveChunk.Header)
      .then(header => {
        const valueToken = new RiffChunk.ListInfoTagValue(header);
        return this.tokenizer.readToken(valueToken).then(value => {
          this.riffInfoTags.push({id: header.chunkID, value: Common.stripNulls(value)});
          chunkSize -= (8 + valueToken.len);
          if (chunkSize > 8) {
            return this.parseRiffInfoTags(chunkSize);
          } else if (chunkSize === 0) {
            return Promise.resolve<void>();
          } else {
            throw Error("Illegal remaining size: " + chunkSize);
          }
        });
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
