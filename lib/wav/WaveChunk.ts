import type { IGetToken } from 'strtok3';
import type { IChunkHeader } from '../iff/index.js';
import * as Token from 'token-types';
import { makeUnexpectedFileContentError } from '../ParseError.js';

export class WaveContentError extends makeUnexpectedFileContentError('Wave'){
}

/**
 * Ref: https://msdn.microsoft.com/en-us/library/windows/desktop/dd317599(v=vs.85).aspx
 */
export enum WaveFormat {
  PCM = 0x0001,
  // MPEG-4 and AAC Audio Types
  ADPCM = 0x0002,
  IEEE_FLOAT = 0x0003,
  MPEG_ADTS_AAC = 0x1600,
  MPEG_LOAS = 0x1602,
  RAW_AAC1 = 0x00FF,
  // Dolby Audio Types
  DOLBY_AC3_SPDIF = 0x0092,
  DVM = 0x2000,
  RAW_SPORT = 0x0240,
  ESST_AC3 = 0x0241,
  DRM = 0x0009,
  DTS2 = 0x2001,
  MPEG = 0x0050
}

/**
 * "fmt"  sub-chunk describes the sound data's format
 * Ref: http://soundfile.sapp.org/doc/WaveFormat
 */
export interface IWaveFormat {
  /**
   * PCM = 1 (i.e. Linear quantization). Values other than 1 indicate some form of compression.
   */
  wFormatTag: WaveFormat,
  /**
   * Mono = 1, Stereo = 2, etc.
   */
  nChannels: number,
  /**
   * 8000, 44100, etc.
   */
  nSamplesPerSec: number,
  nAvgBytesPerSec: number,
  nBlockAlign: number,
  wBitsPerSample: number
}

/**
 * format chunk; chunk-id is "fmt "
 * http://soundfile.sapp.org/doc/WaveFormat/
 */
export class Format implements IGetToken<IWaveFormat> {

  public len: number;

  public constructor(header: IChunkHeader) {
    if (header.chunkSize < 16)
      throw new WaveContentError('Invalid chunk size');
    this.len = header.chunkSize;
  }

  public get(buf: Uint8Array, off: number): IWaveFormat {
    return {
      wFormatTag: Token.UINT16_LE.get(buf, off),
      nChannels: Token.UINT16_LE.get(buf,off + 2),
      nSamplesPerSec: Token.UINT32_LE.get(buf,off + 4),
      nAvgBytesPerSec: Token.UINT32_LE.get(buf,off + 8),
      nBlockAlign: Token.UINT16_LE.get(buf,off + 12),
      wBitsPerSample: Token.UINT16_LE.get(buf,off + 14)
    };
  }
}

export interface IFactChunk {
  dwSampleLength: number;
}

/**
 * Fact chunk; chunk-id is "fact"
 * http://www-mmsp.ece.mcgill.ca/Documents/AudioFormats/WAVE/WAVE.html
 * http://www.recordingblogs.com/wiki/fact-chunk-of-a-wave-file
 */
export class FactChunk implements IGetToken<IFactChunk> {

  public len: number;

  public constructor(header: IChunkHeader) {
    if (header.chunkSize < 4) {
      throw new WaveContentError('Invalid fact chunk size.');
    }
    this.len = header.chunkSize;
  }

  public get(buf: Uint8Array, off: number): IFactChunk {
    return {
      dwSampleLength: Token.UINT32_LE.get(buf, off)
    };
  }

}
