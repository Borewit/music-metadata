import * as Token from "../token-types";
import initDebug from "debug";
import * as strtok3 from "../strtok3";
import * as fromBuffer from "../strtok3/fromBuffer";

import { ID3v2Parser } from "../id3v2/ID3v2Parser";
import { FourCcToken } from "../common/FourCC";
import { BasicParser } from "../common/BasicParser";

import * as AiffToken from "./AiffTokenCommon";
import * as iff from "../iff";

const debug = initDebug("music-metadata:parser:aiff");

/**
 * AIFF - Audio Interchange File Format
 *
 * Ref:
 * - http://www-mmsp.ece.mcgill.ca/Documents/AudioFormats/AIFF/AIFF.html
 * - http://www-mmsp.ece.mcgill.ca/Documents/AudioFormats/AIFF/Docs/AIFF-1.3.pdf
 */
export class AIFFParser extends BasicParser {
  private isCompressed: boolean;

  public async parse(): Promise<void> {
    const header = await this.tokenizer.readToken<iff.IChunkHeader>(iff.Header);
    if (header.chunkID !== "FORM")
      throw new Error("Invalid Chunk-ID, expected 'FORM'"); // Not AIFF format

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
        throw Error("Unsupported AIFF type: " + type);
    }
    this.metadata.setFormat("lossless", !this.isCompressed);

    try {
      while (
        !this.tokenizer.fileInfo.size ||
        this.tokenizer.fileInfo.size - this.tokenizer.position >= iff.Header.len
      ) {
        debug("Reading AIFF chunk at offset=" + this.tokenizer.position);
        const chunkHeader = await this.tokenizer.readToken<iff.IChunkHeader>(
          iff.Header
        );

        debug(`Chunk id=${chunkHeader.chunkID}`);
        const nextChunk = 2 * Math.round(chunkHeader.chunkSize / 2);
        const bytesRead = await this.readData(chunkHeader);
        await this.tokenizer.ignore(nextChunk - bytesRead);
      }
    } catch (error) {
      if (error instanceof strtok3.EndOfStreamError) {
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
        this.metadata.setFormat(
          "duration",
          common.numSampleFrames / common.sampleRate
        );
        this.metadata.setFormat("codec", common.compressionName);
        return header.chunkSize;
      }
      case "ID3 ": {
        // ID3-meta-data
        const id3_data = await this.tokenizer.readToken<Uint8Array>(
          new Token.Uint8ArrayType(header.chunkSize)
        );
        const rst = fromBuffer.fromBuffer(id3_data);
        await new ID3v2Parser().parse(this.metadata, rst, this.options);
        return header.chunkSize;
      }
      case "SSND": // Sound Data Chunk
        if (this.metadata.format.duration) {
          this.metadata.setFormat(
            "bitrate",
            (8 * header.chunkSize) / this.metadata.format.duration
          );
        }
        return 0;

      default:
        return 0;
    }
  }
}
