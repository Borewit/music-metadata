import { BasicParser } from "../common/BasicParser";
import initDebug from "../debug";
import { ID3v2Parser } from "../id3v2/ID3v2Parser";
import { dsdiffChunkHeader, DsdiffChunkHeader64 } from "../parse-unit/dsdiff/chunk-header-64";
import { fourCc } from "../parse-unit/iff/four-cc";
import { bytesTokenizer } from "../parse-unit/primitive/bytes";
import { u16be, u32be, u32le, u8 } from "../parse-unit/primitive/integer";
import { latin1 } from "../parse-unit/primitive/string";
import { readUnitFromTokenizer } from "../parse-unit/utility/read-unit";

const debug = initDebug("music-metadata:parser:aiff");

/**
 * DSDIFF - Direct Stream Digital Interchange File Format (Phillips)
 *
 * Ref:
 * - http://www.sonicstudio.com/pdf/dsd/DSDIFF_1.5_Spec.pdf
 */
export class DsdiffParser extends BasicParser {
  public async parse(): Promise<void> {
    const header = await readUnitFromTokenizer(this.tokenizer, dsdiffChunkHeader);
    if (header.id !== "FRM8") throw new Error("Unexpected chunk-ID");

    const fourCcToken = await readUnitFromTokenizer(this.tokenizer, fourCc);
    const type = fourCcToken.trim();
    switch (type) {
      case "DSD":
        this.metadata.setFormat("container", `DSDIFF/${type}`);
        this.metadata.setFormat("lossless", true);
        return this.readFmt8Chunks(header.size - BigInt(fourCc[0]));

      default:
        throw new Error(`Unsupported DSDIFF type: ${type}`);
    }
  }

  private async readFmt8Chunks(remainingSize: bigint): Promise<void> {
    const [size] = dsdiffChunkHeader;
    while (remainingSize >= size) {
      const chunkHeader = await readUnitFromTokenizer(this.tokenizer, dsdiffChunkHeader);

      //  If the data is an odd number of bytes in length, a pad byte must be added at the end
      debug(`Chunk id=${chunkHeader.id}`);
      await this.readData(chunkHeader);
      remainingSize -= BigInt(size) + chunkHeader.size;
    }
  }

  private async readData(header: DsdiffChunkHeader64): Promise<void> {
    debug(`Reading data of chunk[ID=${header.id}, size=${header.size}]`);
    const p0 = this.tokenizer.position;
    switch (header.id.trim()) {
      case "FVER": {
        // 3.1 FORMAT VERSION CHUNK
        const version = await readUnitFromTokenizer(this.tokenizer, u32le);
        debug(`DSDIFF version=${version}`);
        break;
      }

      case "PROP": {
        // 3.2 PROPERTY CHUNK
        const propType = await readUnitFromTokenizer(this.tokenizer, fourCc);
        if (propType !== "SND ") throw new Error("Unexpected PROP-chunk ID");
        await this.handleSoundPropertyChunks(header.size - BigInt(fourCc[0]));
        break;
      }

      case "ID3": {
        // Unofficial ID3 tag support
        const id3_data = await readUnitFromTokenizer(this.tokenizer, bytesTokenizer(Number(header.size)));
        await new ID3v2Parser().parse(this.metadata, id3_data, this.options);
        break;
      }
      default:
        debug(`Ignore chunk[ID=${header.size}, size=${header.size}]`);
        break;

      case "DSD":
        this.metadata.setFormat(
          "numberOfSamples",
          Number((header.size * BigInt(8)) / BigInt(this.metadata.format.numberOfChannels))
        );
        this.metadata.setFormat("duration", this.metadata.format.numberOfSamples / this.metadata.format.sampleRate);
        break;
    }
    const remaining = header.size - BigInt(this.tokenizer.position - p0);
    if (remaining > 0) {
      debug(`After Parsing chunk, remaining ${remaining} bytes`);
      await this.tokenizer.ignore(Number(remaining));
    }
  }

  private async handleSoundPropertyChunks(remainingSize: bigint): Promise<void> {
    debug(`Parsing sound-property-chunks, remainingSize=${remainingSize}`);
    while (remainingSize > 0) {
      const sndPropHeader = await readUnitFromTokenizer(this.tokenizer, dsdiffChunkHeader);
      debug(`Sound-property-chunk[ID=${sndPropHeader.id}, size=${sndPropHeader.size}]`);
      const p0 = this.tokenizer.position;
      switch (sndPropHeader.id.trim()) {
        case "FS": {
          // 3.2.1 Sample Rate Chunk
          const sampleRate = await readUnitFromTokenizer(this.tokenizer, u32be);
          this.metadata.setFormat("sampleRate", sampleRate);
          break;
        }
        case "CHNL": {
          // 3.2.2 Channels Chunk
          const numChannels = await readUnitFromTokenizer(this.tokenizer, u16be);
          this.metadata.setFormat("numberOfChannels", numChannels);
          await this.handleChannelChunks(sndPropHeader.size - BigInt(u16be[0]));
          break;
        }
        case "CMPR": {
          // 3.2.3 Compression Type Chunk
          const fourCcToken = await readUnitFromTokenizer(this.tokenizer, fourCc);
          const compressionIdCode = fourCcToken.trim();
          const count = await readUnitFromTokenizer(this.tokenizer, u8);
          const compressionName = await readUnitFromTokenizer(this.tokenizer, latin1(count));
          if (compressionIdCode === "DSD") {
            this.metadata.setFormat("lossless", true);
            this.metadata.setFormat("bitsPerSample", 1);
          }
          this.metadata.setFormat("codec", `${compressionIdCode} (${compressionName})`);
          break;
        }
        case "ABSS": {
          // 3.2.4 Absolute Start Time Chunk
          const hours = await readUnitFromTokenizer(this.tokenizer, u16be);
          const minutes = await readUnitFromTokenizer(this.tokenizer, u8);
          const seconds = await readUnitFromTokenizer(this.tokenizer, u8);
          const samples = await readUnitFromTokenizer(this.tokenizer, u32be);
          debug(`ABSS ${hours}:${minutes}:${seconds}.${samples}`);
          break;
        }
        case "LSCO": {
          // 3.2.5 Loudspeaker Configuration Chunk
          const lsConfig = await readUnitFromTokenizer(this.tokenizer, u16be);
          debug(`LSCO lsConfig=${lsConfig}`);
          break;
        }
        // case "COMT":
        default:
          debug(`Unknown sound-property-chunk[ID=${sndPropHeader.id}, size=${sndPropHeader.size}]`);
          await this.tokenizer.ignore(Number(sndPropHeader.size));
      }
      const remaining = sndPropHeader.size - BigInt(this.tokenizer.position - p0);
      if (remaining > 0) {
        debug(`After Parsing sound-property-chunk ${sndPropHeader.size}, remaining ${remaining} bytes`);
        await this.tokenizer.ignore(Number(remaining));
      }
      remainingSize -= BigInt(dsdiffChunkHeader[0]) + sndPropHeader.size;
      debug(`Parsing sound-property-chunks, remainingSize=${remainingSize}`);
    }
    if (
      this.metadata.format.lossless &&
      this.metadata.format.sampleRate &&
      this.metadata.format.numberOfChannels &&
      this.metadata.format.bitsPerSample
    ) {
      const bitrate =
        this.metadata.format.sampleRate * this.metadata.format.numberOfChannels * this.metadata.format.bitsPerSample;
      this.metadata.setFormat("bitrate", bitrate);
    }
  }

  private async handleChannelChunks(remainingSize: bigint): Promise<string[]> {
    debug(`Parsing channel-chunks, remainingSize=${remainingSize}`);
    const channels: string[] = [];
    while (remainingSize >= fourCc[0]) {
      const channelId = await readUnitFromTokenizer(this.tokenizer, fourCc);
      debug(`Channel[ID=${channelId}]`);
      channels.push(channelId);
      remainingSize -= BigInt(fourCc[0]);
    }
    debug(`Channels: ${channels.join(", ")}`);
    return channels;
  }
}
