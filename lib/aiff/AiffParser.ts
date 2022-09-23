import { BasicParser } from "../common/BasicParser";
import { FourCcToken } from "../common/FourCC";
import initDebug from "../debug";
import { ID3v2Parser } from "../id3v2/ID3v2Parser";
import * as iff from "../iff";
import { EndOfStreamError } from "../strtok3";
import { fromBuffer } from "../strtok3/fromBuffer";
import { Uint8ArrayType } from "../token-types";
import { Latin1StringType } from "../token-types/string";

import * as AiffToken from "./AiffTokenCommon";

const debug = initDebug("music-metadata:parser:aiff");

const compressionTypes: Record<string, string> = {
  NONE: "not compressed	PCM	Apple Computer",
  sowt: "PCM (byte swapped)",
  fl32: "32-bit floating point IEEE 32-bit float",
  fl64: "64-bit floating point IEEE 64-bit float	Apple Computer",
  alaw: "ALaw 2:1	8-bit ITU-T G.711 A-law",
  ulaw: "µLaw 2:1	8-bit ITU-T G.711 µ-law	Apple Computer",
  ULAW: "CCITT G.711 u-law 8-bit ITU-T G.711 µ-law",
  ALAW: "CCITT G.711 A-law 8-bit ITU-T G.711 A-law",
  FL32: "Float 32	IEEE 32-bit float ",
};

/**
 * AIFF - Audio Interchange File Format
 *
 * Ref:
 * - http://www-mmsp.ece.mcgill.ca/Documents/AudioFormats/AIFF/AIFF.html
 * - http://www-mmsp.ece.mcgill.ca/Documents/AudioFormats/AIFF/Docs/AIFF-1.3.pdf
 */
export class AIFFParser extends BasicParser {
  private isCompressed = false;

  public async parse(): Promise<void> {
    const header = await this.tokenizer.readToken<iff.IChunkHeader>(iff.Header);
    if (header.chunkID !== "FORM") throw new Error("Invalid Chunk-ID, expected 'FORM'"); // Not AIFF format

    const type = await this.tokenizer.readToken<string>(FourCcToken);
    switch (type) {
      case "AIFF":
        this.metadata.setFormat("container", type);
        this.isCompressed = false;
        break;

      case "AIFC":
        this.metadata.setFormat("container", "AIFF-C");
        this.isCompressed = true;
        break;

      default:
        throw new Error("Unsupported AIFF type: " + type);
    }
    this.metadata.setFormat("lossless", !this.isCompressed);

    try {
      while (
        this.tokenizer.fileInfo.size === 0 ||
        this.tokenizer.fileInfo.size - this.tokenizer.position >= iff.Header.len
      ) {
        debug(`Reading AIFF chunk at offset=${this.tokenizer.position}`);
        const chunkHeader = await this.tokenizer.readToken<iff.IChunkHeader>(iff.Header);

        const nextChunk = 2 * Math.round(chunkHeader.chunkSize / 2);
        const bytesRead = await this.readData(chunkHeader);
        await this.tokenizer.ignore(nextChunk - bytesRead);
      }
    } catch (error) {
      if (error instanceof EndOfStreamError) {
        debug(`End-of-stream`);
      } else {
        throw error;
      }
    }
  }

  public async readData(header: iff.IChunkHeader): Promise<number> {
    switch (header.chunkID) {
      case "COMM": {
        // The Common Chunk
        const common = await this.tokenizer.readToken<AiffToken.ICommon>(
          new AiffToken.Common(header, this.isCompressed)
        );
        this.metadata.setFormat("bitsPerSample", common.sampleSize);
        this.metadata.setFormat("sampleRate", common.sampleRate);
        this.metadata.setFormat("numberOfChannels", common.numChannels);
        this.metadata.setFormat("numberOfSamples", common.numSampleFrames);
        this.metadata.setFormat("duration", common.numSampleFrames / common.sampleRate);
        this.metadata.setFormat("codec", common.compressionName ?? compressionTypes[common.compressionType]);
        return header.chunkSize;
      }
      case "ID3 ": {
        // ID3-meta-data
        const id3_data = await this.tokenizer.readToken<Uint8Array>(new Uint8ArrayType(header.chunkSize));
        const rst = fromBuffer(id3_data);
        await new ID3v2Parser().parse(this.metadata, rst, this.options);
        return header.chunkSize;
      }
      case "SSND": // Sound Data Chunk
        if (this.metadata.format.duration) {
          this.metadata.setFormat("bitrate", (8 * header.chunkSize) / this.metadata.format.duration);
        }
        return 0;

      case "NAME": // Sample name chunk
      case "AUTH": // Author chunk
      case "(c) ": // Copyright chunk
      case "ANNO": // Annotation chunk
        return this.readTextChunk(header);

      default:
        debug(`Ignore chunk id=${header.chunkID}, size=${header.chunkSize}`);
        return 0;
    }
  }

  public async readTextChunk(header: iff.IChunkHeader): Promise<number> {
    const value = await this.tokenizer.readToken(new Latin1StringType(header.chunkSize));
    for (const item of value
      .split("\0")
      .map((v) => v.trim())
      .filter((v) => v && v.length > 0)) {
      this.metadata.addTag("AIFF", header.chunkID, item.trim());
    }
    return header.chunkSize;
  }
}
