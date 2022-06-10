import * as Token from "token-types";
import initDebug from "debug";
import * as strtok3 from "strtok3/lib/core";

import { FourCcToken } from "../common/FourCC";
import { BasicParser } from "../common/BasicParser";
import { ID3v2Parser } from "../id3v2/ID3v2Parser";

import { ChunkHeader64, IChunkHeader64 } from "./DsdiffToken";

const debug = initDebug("music-metadata:parser:aiff");

/**
 * DSDIFF - Direct Stream Digital Interchange File Format (Phillips)
 *
 * Ref:
 * - http://www.sonicstudio.com/pdf/dsd/DSDIFF_1.5_Spec.pdf
 */
export class DsdiffParser extends BasicParser {
  public async parse(): Promise<void> {
    const header = await this.tokenizer.readToken<IChunkHeader64>(
      ChunkHeader64
    );
    if (header.chunkID !== "FRM8") throw new Error("Unexpected chunk-ID");

    const type = (await this.tokenizer.readToken<string>(FourCcToken)).trim();
    switch (type) {
      case "DSD":
        this.metadata.setFormat("container", `DSDIFF/${type}`);
        this.metadata.setFormat("lossless", true);
        return this.readFmt8Chunks(header.chunkSize - BigInt(FourCcToken.len));

      default:
        throw Error(`Unsupported DSDIFF type: ${type}`);
    }
  }

  private async readFmt8Chunks(remainingSize: bigint): Promise<void> {
    while (remainingSize >= ChunkHeader64.len) {
      const chunkHeader = await this.tokenizer.readToken<IChunkHeader64>(
        ChunkHeader64
      );

      //  If the data is an odd number of bytes in length, a pad byte must be added at the end
      debug(`Chunk id=${chunkHeader.chunkID}`);
      await this.readData(chunkHeader);
      remainingSize -= BigInt(ChunkHeader64.len) + chunkHeader.chunkSize;
    }
  }

  private async readData(header: IChunkHeader64): Promise<void> {
    debug(
      `Reading data of chunk[ID=${header.chunkID}, size=${header.chunkSize}]`
    );
    const p0 = this.tokenizer.position;
    switch (header.chunkID.trim()) {
      case "FVER": // 3.1 FORMAT VERSION CHUNK
        const version = await this.tokenizer.readToken<number>(Token.UINT32_LE);
        debug(`DSDIFF version=${version}`);
        break;

      case "PROP": // 3.2 PROPERTY CHUNK
        const propType = await this.tokenizer.readToken(FourCcToken);
        if (propType !== "SND ") throw new Error("Unexpected PROP-chunk ID");
        await this.handleSoundPropertyChunks(
          header.chunkSize - BigInt(FourCcToken.len)
        );
        break;

      case "ID3": // Unofficial ID3 tag support
        const id3_data = await this.tokenizer.readToken<Uint8Array>(
          new Token.Uint8ArrayType(Number(header.chunkSize))
        );
        const rst = strtok3.fromBuffer(id3_data);
        await new ID3v2Parser().parse(this.metadata, rst, this.options);
        break;

      default:
        debug(`Ignore chunk[ID=${header.chunkID}, size=${header.chunkSize}]`);
        break;

      case "DSD":
        this.metadata.setFormat(
          "numberOfSamples",
          Number(
            (header.chunkSize * BigInt(8)) /
              BigInt(this.metadata.format.numberOfChannels)
          )
        );
        this.metadata.setFormat(
          "duration",
          this.metadata.format.numberOfSamples / this.metadata.format.sampleRate
        );
        break;
    }
    const remaining = header.chunkSize - BigInt(this.tokenizer.position - p0);
    if (remaining > 0) {
      debug(`After Parsing chunk, remaining ${remaining} bytes`);
      await this.tokenizer.ignore(Number(remaining));
    }
  }

  private async handleSoundPropertyChunks(
    remainingSize: bigint
  ): Promise<void> {
    debug(`Parsing sound-property-chunks, remainingSize=${remainingSize}`);
    while (remainingSize > 0) {
      const sndPropHeader = await this.tokenizer.readToken<IChunkHeader64>(
        ChunkHeader64
      );
      debug(
        `Sound-property-chunk[ID=${sndPropHeader.chunkID}, size=${sndPropHeader.chunkSize}]`
      );
      const p0 = this.tokenizer.position;
      switch (sndPropHeader.chunkID.trim()) {
        case "FS": // 3.2.1 Sample Rate Chunk
          const sampleRate = await this.tokenizer.readToken<number>(
            Token.UINT32_BE
          );
          this.metadata.setFormat("sampleRate", sampleRate);
          break;

        case "CHNL": // 3.2.2 Channels Chunk
          const numChannels = await this.tokenizer.readToken<number>(
            Token.UINT16_BE
          );
          this.metadata.setFormat("numberOfChannels", numChannels);
          await this.handleChannelChunks(
            sndPropHeader.chunkSize - BigInt(Token.UINT16_BE.len)
          );
          break;

        case "CMPR": // 3.2.3 Compression Type Chunk
          const compressionIdCode = (
            await this.tokenizer.readToken<string>(FourCcToken)
          ).trim();
          const count = await this.tokenizer.readToken<number>(Token.UINT8);
          const compressionName = await this.tokenizer.readToken<string>(
            new Token.StringType(count, "ascii")
          );
          if (compressionIdCode === "DSD") {
            this.metadata.setFormat("lossless", true);
            this.metadata.setFormat("bitsPerSample", 1);
          }
          this.metadata.setFormat(
            "codec",
            `${compressionIdCode} (${compressionName})`
          );
          break;

        case "ABSS": // 3.2.4 Absolute Start Time Chunk
          const hours = await this.tokenizer.readToken<number>(Token.UINT16_BE);
          const minutes = await this.tokenizer.readToken<number>(Token.UINT8);
          const seconds = await this.tokenizer.readToken<number>(Token.UINT8);
          const samples = await this.tokenizer.readToken<number>(
            Token.UINT32_BE
          );
          debug(`ABSS ${hours}:${minutes}:${seconds}.${samples}`);
          break;

        case "LSCO": // 3.2.5 Loudspeaker Configuration Chunk
          const lsConfig = await this.tokenizer.readToken<number>(
            Token.UINT16_BE
          );
          debug(`LSCO lsConfig=${lsConfig}`);
          break;

        case "COMT":
        default:
          debug(
            `Unknown sound-property-chunk[ID=${sndPropHeader.chunkID}, size=${sndPropHeader.chunkSize}]`
          );
          await this.tokenizer.ignore(Number(sndPropHeader.chunkSize));
      }
      const remaining =
        sndPropHeader.chunkSize - BigInt(this.tokenizer.position - p0);
      if (remaining > 0) {
        debug(
          `After Parsing sound-property-chunk ${sndPropHeader.chunkSize}, remaining ${remaining} bytes`
        );
        await this.tokenizer.ignore(Number(remaining));
      }
      remainingSize -= BigInt(ChunkHeader64.len) + sndPropHeader.chunkSize;
      debug(`Parsing sound-property-chunks, remainingSize=${remainingSize}`);
    }
    if (
      this.metadata.format.lossless &&
      this.metadata.format.sampleRate &&
      this.metadata.format.numberOfChannels &&
      this.metadata.format.bitsPerSample
    ) {
      const bitrate =
        this.metadata.format.sampleRate *
        this.metadata.format.numberOfChannels *
        this.metadata.format.bitsPerSample;
      this.metadata.setFormat("bitrate", bitrate);
    }
  }

  private async handleChannelChunks(remainingSize: bigint): Promise<string[]> {
    debug(`Parsing channel-chunks, remainingSize=${remainingSize}`);
    const channels: string[] = [];
    while (remainingSize >= FourCcToken.len) {
      const channelId = await this.tokenizer.readToken<string>(FourCcToken);
      debug(`Channel[ID=${channelId}]`);
      channels.push(channelId);
      remainingSize -= BigInt(FourCcToken.len);
    }
    debug(`Channels: ${channels.join(", ")}`);
    return channels;
  }
}
