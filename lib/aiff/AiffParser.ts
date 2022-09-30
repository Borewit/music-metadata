import { BasicParser } from "../common/BasicParser";
import initDebug from "../debug";
import { ID3v2Parser } from "../id3v2/ID3v2Parser";
import { commonChunk } from "../parse-unit/aiff/common-chunk";
import { IffChunkHeader, iffChunkHeader } from "../parse-unit/iff/chunk-header";
import { fourCc } from "../parse-unit/iff/four-cc";
import { bytes } from "../parse-unit/primitive/bytes";
import { latin1 } from "../parse-unit/primitive/string";
import { readUnitFromTokenizer } from "../parse-unit/utility/read-unit";
import { EndOfStreamError } from "../peek-readable/EndOfFileStream";
import { fromBuffer } from "../strtok3/fromBuffer";

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
    const header = await readUnitFromTokenizer(this.tokenizer, iffChunkHeader);
    if (header.id !== "FORM") throw new Error("Invalid Chunk-ID, expected 'FORM'"); // Not AIFF format

    const type = await readUnitFromTokenizer(this.tokenizer, fourCc);
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
        this.tokenizer.fileInfo.size - this.tokenizer.position >= iffChunkHeader[0]
      ) {
        debug(`Reading AIFF chunk at offset=${this.tokenizer.position}`);
        const chunkHeader = await readUnitFromTokenizer(this.tokenizer, iffChunkHeader);

        const nextChunk = 2 * Math.round(chunkHeader.size / 2);
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

  public async readData(header: IffChunkHeader): Promise<number> {
    switch (header.id) {
      case "COMM": {
        // The Common Chunk
        const common = await readUnitFromTokenizer(this.tokenizer, commonChunk(header.size, this.isCompressed));

        this.metadata.setFormat("bitsPerSample", common.sampleSize);
        this.metadata.setFormat("sampleRate", common.sampleRate);
        this.metadata.setFormat("numberOfChannels", common.numChannels);
        this.metadata.setFormat("numberOfSamples", common.numSampleFrames);
        this.metadata.setFormat("duration", common.numSampleFrames / common.sampleRate);
        this.metadata.setFormat("codec", common.compressionName || compressionTypes[common.compressionType]);
        return header.size;
      }
      case "ID3 ": {
        // ID3-meta-data
        const id3_data = await readUnitFromTokenizer(this.tokenizer, bytes(header.size));
        const rst = fromBuffer(id3_data);
        await new ID3v2Parser().parse(this.metadata, rst, this.options);
        return header.size;
      }
      case "SSND": // Sound Data Chunk
        if (this.metadata.format.duration) {
          this.metadata.setFormat("bitrate", (8 * header.size) / this.metadata.format.duration);
        }
        return 0;

      case "NAME": // Sample name chunk
      case "AUTH": // Author chunk
      case "(c) ": // Copyright chunk
      case "ANNO": // Annotation chunk
        return this.readTextChunk(header);

      default:
        debug(`Ignore chunk id=${header.id}, size=${header.size}`);
        return 0;
    }
  }

  public async readTextChunk(header: IffChunkHeader): Promise<number> {
    const value = await readUnitFromTokenizer(this.tokenizer, latin1(header.size));
    for (const item of value
      .split("\0")
      .map((v) => v.trim())
      .filter((v) => v && v.length > 0)) {
      this.metadata.addTag("AIFF", header.id, item.trim());
    }
    return header.size;
  }
}
