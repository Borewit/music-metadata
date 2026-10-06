import initDebug from 'debug';
import * as strtok3 from 'strtok3';
import * as Token from 'token-types';
import { BasicParser } from '../common/BasicParser.js';
import * as CafToken from './CafToken.js';
import { CafContentError, type IAudioDescription, type IPacketTableHeader } from './CafToken.js';

const debug = initDebug('music-metadata:parser:caf');

interface ICodecInfo {
  codec: string;
  lossless: boolean;
}

// Unrecognised mFormatID values are reported as-is, without claiming losslessness.
const codecByFormatId: Record<string, ICodecInfo> = {
  lpcm: { codec: 'PCM', lossless: true },
  ima4: { codec: 'IMA4 ADPCM', lossless: false },
  alac: { codec: 'ALAC', lossless: true },
  flac: { codec: 'FLAC', lossless: true },
  ulaw: { codec: 'ITU-T G.711 mu-law', lossless: false },
  alaw: { codec: 'ITU-T G.711 A-law', lossless: false },
  '.mp1': { codec: 'MPEG-1 Layer I', lossless: false },
  '.mp2': { codec: 'MPEG-1 Layer II', lossless: false },
  '.mp3': { codec: 'MPEG-1 Layer III', lossless: false },
  'aac ': { codec: 'AAC', lossless: false },
  aace: { codec: 'AAC', lossless: false },
  aacf: { codec: 'AAC', lossless: false },
  aacg: { codec: 'AAC', lossless: false },
  aach: { codec: 'AAC', lossless: false },
  aacl: { codec: 'AAC', lossless: false },
  aacp: { codec: 'AAC', lossless: false }
};

const channelDescriptionLen = 12;
const editCountLen = 4;
const numEntriesLen = 4;

/**
 * CAF - Core Audio File Format
 *
 * Ref: https://developer.apple.com/library/archive/documentation/MusicAudio/Reference/CAFSpec/CAF_spec/CAF_spec.html
 */
export class CafParser extends BasicParser {
  private desc: IAudioDescription | undefined;
  private packetTable: IPacketTableHeader | undefined;
  private dataBytes: number | undefined;
  private expectedFirstChunk = true;
  private reachedEndOfFile = false;

  public async parse(): Promise<void> {
    const header = await this.tokenizer.readToken<CafToken.ICafFileHeader>(CafToken.FileHeader);
    if (header.fileType !== 'caff') {
      throw new CafContentError(`Invalid file-type, expected 'caff', found '${header.fileType}'`);
    }

    this.metadata.setFormat('container', 'CAF');
    this.metadata.setAudioOnly();

    try {
      while (!this.reachedEndOfFile && !this.endOfFileReached()) {
        const chunkHeader = await this.tokenizer.readToken<CafToken.ICafChunkHeader>(CafToken.ChunkHeader);
        debug(`Reading CAF chunk type=${chunkHeader.chunkType} size=${chunkHeader.chunkSize}`);
        if (this.expectedFirstChunk) {
          this.expectedFirstChunk = false;
          if (chunkHeader.chunkType !== 'desc') {
            throw new CafContentError(`Expected an Audio Description chunk, found '${chunkHeader.chunkType}'`);
          }
        }
        await this.readChunk(chunkHeader);
      }
    } catch (error) {
      if (error instanceof strtok3.EndOfStreamError) {
        debug('End-of-stream');
      } else {
        throw error;
      }
    }

    if (!this.desc) {
      throw new CafContentError('Missing Audio Description chunk');
    }
    this.applyDerivedFormat();
  }

  private endOfFileReached(): boolean {
    const { size } = this.tokenizer.fileInfo;
    return size !== undefined && size - this.tokenizer.position < CafToken.ChunkHeader.len;
  }

  private async readChunk(header: CafToken.ICafChunkHeader): Promise<void> {
    switch (header.chunkType) {
      case 'desc':
        return this.readAudioDescription(header.chunkSize);

      case 'pakt':
        return this.readPacketTable(header.chunkSize);

      case 'data':
        return this.readAudioData(header.chunkSize);

      case 'info':
        return this.readInfo(header.chunkSize);

      case 'chan':
        return this.readChannelLayout(header.chunkSize);

      default:
        debug(`Ignore chunk type=${header.chunkType} size=${header.chunkSize}`);
        return this.skipUnknownChunk(header.chunkSize);
    }
  }

  private async readAudioDescription(chunkSize: number): Promise<void> {
    if (chunkSize < CafToken.AudioDescription.len) {
      throw new CafContentError(
        `Audio Description chunk size ${chunkSize} is smaller than ${CafToken.AudioDescription.len}`
      );
    }
    this.desc = await this.tokenizer.readToken<IAudioDescription>(CafToken.AudioDescription);
    await this.tokenizer.ignore(chunkSize - CafToken.AudioDescription.len);
    this.applyAudioDescription(this.desc);
  }

  private applyAudioDescription(desc: IAudioDescription): void {
    this.metadata.setFormat('sampleRate', desc.sampleRate);
    this.metadata.setFormat('numberOfChannels', desc.channelsPerFrame);
    if (desc.bitsPerChannel > 0) {
      this.metadata.setFormat('bitsPerSample', desc.bitsPerChannel);
    }

    const codec = codecByFormatId[desc.formatId];
    this.metadata.setFormat('codec', codec ? codec.codec : desc.formatId);
    if (codec) {
      this.metadata.setFormat('lossless', codec.lossless);
    }
  }

  private async readPacketTable(chunkSize: number): Promise<void> {
    const desc = this.desc;
    if (!desc) {
      throw new CafContentError('Packet Table chunk found before the Audio Description chunk');
    }
    if (chunkSize < CafToken.PacketTableHeader.len) {
      throw new CafContentError(
        `Packet Table chunk size ${chunkSize} is smaller than ${CafToken.PacketTableHeader.len}`
      );
    }
    const packetTable = await this.tokenizer.readToken<IPacketTableHeader>(CafToken.PacketTableHeader);
    const body = await this.tokenizer.readToken(new Token.Uint8ArrayType(chunkSize - CafToken.PacketTableHeader.len));
    CafToken.decodePacketTableEntries(body, desc, packetTable.numberPackets);
    this.packetTable = packetTable;
  }

  private async readAudioData(chunkSize: number): Promise<void> {
    if (chunkSize >= 0 && chunkSize < editCountLen) {
      throw new CafContentError(`Audio Data chunk size ${chunkSize} is too small to hold mEditCount`);
    }
    await this.tokenizer.ignore(editCountLen); // Audio payload is not decoded

    if (chunkSize === -1) {
      this.reachedEndOfFile = true; // Runs to the end of the file, nothing can follow
      const { size } = this.tokenizer.fileInfo;
      if (size === undefined) {
        debug('Audio Data chunk has an unknown size, cannot derive the bitrate');
        return;
      }
      this.dataBytes = size - this.tokenizer.position;
      await this.tokenizer.ignore(this.dataBytes);
      return;
    }

    this.dataBytes = chunkSize - editCountLen;
    await this.tokenizer.ignore(this.dataBytes);
  }

  private async readInfo(chunkSize: number): Promise<void> {
    if (chunkSize < numEntriesLen) {
      throw new CafContentError(`Information chunk size ${chunkSize} is too small to hold mNumEntries`);
    }
    const body = await this.tokenizer.readToken(new Token.Uint8ArrayType(chunkSize));
    for (const { key, value } of CafToken.parseInfoEntries(body)) {
      debug(`info key=${key}`);
      await this.metadata.addTag('CAF', key, value);
    }
  }

  private async readChannelLayout(chunkSize: number): Promise<void> {
    if (chunkSize < CafToken.ChannelLayoutHeader.len) {
      throw new CafContentError(
        `Channel Layout chunk size ${chunkSize} is smaller than ${CafToken.ChannelLayoutHeader.len}`
      );
    }
    const header = await this.tokenizer.readToken<CafToken.IChannelLayoutHeader>(CafToken.ChannelLayoutHeader);

    const descriptionLen = header.numberChannelDescriptions * channelDescriptionLen;
    const bodyLen = CafToken.ChannelLayoutHeader.len + descriptionLen;
    if (bodyLen > chunkSize) {
      throw new CafContentError(
        `Channel Layout chunk declares ${header.numberChannelDescriptions} description(s) which exceed its size of ${chunkSize}`
      );
    }

    const descriptions =
      descriptionLen > 0
        ? CafToken.parseChannelDescriptions(
            await this.tokenizer.readToken(new Token.Uint8ArrayType(descriptionLen)),
            header.numberChannelDescriptions
          )
        : [];

    await this.addChannelLayout(header, descriptions);
    await this.tokenizer.ignore(chunkSize - bodyLen);
  }

  private async addChannelLayout(
    header: CafToken.IChannelLayoutHeader,
    descriptions: CafToken.IChannelDescription[]
  ): Promise<void> {
    await this.metadata.addTag('CAF', 'channelLayoutTag', header.channelLayoutTag);
    await this.metadata.addTag('CAF', 'channelLayoutBitmap', header.channelBitmap);
    if (descriptions.length > 0) {
      // No common tag describes channel order
      await this.metadata.addTag(
        'CAF',
        'channelLayoutDescriptions',
        descriptions.map(description => description.channelLabel)
      );
    }
  }

  private async skipUnknownChunk(chunkSize: number): Promise<void> {
    if (chunkSize < 0) {
      throw new CafContentError(`Chunk size ${chunkSize} may only be -1 for an Audio Data chunk`);
    }
    await this.tokenizer.ignore(chunkSize);
  }

  // Deferred: the packet table and audio payload may arrive after the description
  private applyDerivedFormat(): void {
    const desc = this.desc;
    if (!desc || desc.sampleRate <= 0) {
      return;
    }
    const frames = this.deriveFrameCount(desc);
    if (frames === undefined) {
      debug('Unable to derive the number of sample frames');
      return;
    }
    const duration = frames / desc.sampleRate;
    this.metadata.setFormat('numberOfSamples', frames);
    this.metadata.setFormat('duration', duration);
    if (this.dataBytes !== undefined) {
      this.metadata.setFormat('bitrate', (8 * this.dataBytes) / duration);
    }
  }

  private deriveFrameCount(desc: IAudioDescription): number | undefined {
    const packetTable = this.packetTable;
    if (packetTable) {
      // Signed field, writers emit negative values. Already excludes priming and remainder frames.
      if (packetTable.numberValidFrames > 0) {
        return packetTable.numberValidFrames;
      }
      debug(`Ignoring packet table with mNumberValidFrames=${packetTable.numberValidFrames}`);
    }
    if (desc.bytesPerPacket > 0 && desc.framesPerPacket > 0 && this.dataBytes !== undefined) {
      const frames = (this.dataBytes * desc.framesPerPacket) / desc.bytesPerPacket;
      if (frames > 0) {
        return frames;
      }
    }
    return undefined;
  }
}
