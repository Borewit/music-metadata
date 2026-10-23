import type { IGetToken } from 'strtok3';
import * as Token from 'token-types';
import { stripNulls } from '../common/Util.js';
import { WaveContentError } from './WaveChunk.js';

export interface IBroadcastAudioExtensionChunk {
  description: string;
  originator: string;
  originatorReference: string;
  originationDate: string;
  originationTime: string;
  timeReferenceLow: number;
  timeReferenceHigh: number;
  version: number;
  umid?: Uint8Array;
  /** BWF v2 integer units: hundredths of LUFS, LU, or dBTP; absent when unset/invalid. */
  loudnessValue?: number;
  loudnessRange?: number;
  maxTruePeakLevel?: number;
  maxMomentaryLoudness?: number;
  maxShortTermLoudness?: number;
}

/**
 * Broadcast Audio Extension Chunk
 * Ref: https://tech.ebu.ch/docs/tech/tech3285.pdf
 */
export class BroadcastAudioExtensionChunk implements IGetToken<IBroadcastAudioExtensionChunk> {
  public readonly len: number;

  public constructor(length: number) {
    if (length < 348) {
      throw new WaveContentError('BWF extension is shorter than its 348-byte base header');
    }
    // Reserved bytes and CodingHistory are skipped by the RIFF reader.
    this.len = Math.min(length, 422);
  }

  public get(uint8array: Uint8Array, off: number): IBroadcastAudioExtensionChunk {
    const version = Token.UINT16_LE.get(uint8array, off + 346);
    if (version >= 2 && this.len < 422) {
      throw new WaveContentError('BWF v2 extension is missing loudness fields');
    }
    const result: IBroadcastAudioExtensionChunk = {
      description: stripNulls(new Token.StringType(256, 'ascii').get(uint8array, off)).trim(),
      originator: stripNulls(new Token.StringType(32, 'ascii').get(uint8array, off + 256)).trim(),
      originatorReference: stripNulls(new Token.StringType(32, 'ascii').get(uint8array, off + 288)).trim(),
      originationDate: stripNulls(new Token.StringType(10, 'ascii').get(uint8array, off + 320)).trim(),
      originationTime: stripNulls(new Token.StringType(8, 'ascii').get(uint8array, off + 330)).trim(),
      timeReferenceLow: Token.UINT32_LE.get(uint8array, off + 338),
      timeReferenceHigh: Token.UINT32_LE.get(uint8array, off + 342),
      version
    };
    // Accept short historical headers, but never borrow fields from the next chunk.
    if (version >= 1 && this.len >= 412) {
      result.umid = new Token.Uint8ArrayType(64).get(uint8array, off + 348);
    }
    if (version >= 2) {
      const fields = [
        'loudnessValue',
        'loudnessRange',
        'maxTruePeakLevel',
        'maxMomentaryLoudness',
        'maxShortTermLoudness'
      ] as const;
      for (const [index, field] of fields.entries()) {
        const value = Token.INT16_LE.get(uint8array, off + 412 + index * 2);
        // EBU Tech 3285 v2: ignore 0x7fff and all values outside the defined ranges.
        if (value >= (field === 'loudnessRange' ? 0 : -9999) && value <= 9999) {
          result[field] = value;
        }
      }
    }
    return result;
  }
}
