import { map } from "../combinate/map";
import { sequence } from "../combinate/sequence";
import { sequenceToObject } from "../combinate/sequence-to-object";
import { fourCc } from "../iff/four-cc";
import { u16be, u32be } from "../primitive/integer";
import { skip } from "../primitive/skip";

import { f80 } from "./float80";
import { pstring } from "./pstring";

import type { Unit } from "../type/unit";

/**
 * The Common Chunk.
 * Describes fundamental parameters of the waveform data such as sample rate, bit resolution, and how many channels of
 * digital audio are stored in the FORM AIFF.
 */
export interface AiffCommonChunk {
  numChannels: number;
  numSampleFrames: number;
  sampleSize: number;
  sampleRate: number;
  compressionType?: string;
  compressionName: string;
}

const aiff = sequenceToObject(
  {
    numChannels: 0,
    numSampleFrames: 1,
    sampleSize: 2,
    sampleRate: 3,
  },
  u16be,
  u32be,
  u16be,
  f80
);

export const commonChunk = (length: number, isComplessed: boolean): Unit<AiffCommonChunk, RangeError> => {
  const minimumChunkSize = isComplessed ? 22 : 18;
  if (length < minimumChunkSize) throw new Error(`COMMON CHUNK size should always be at least ${minimumChunkSize}`);

  return isComplessed
    ? map(sequence(aiff, fourCc, pstring(length - 22)), ([value, compressionType, compressionName]) => {
        return { ...value, compressionType, compressionName };
      })
    : map(sequence(aiff, skip(length - 18)), ([value]) => {
        return { ...value, compressionName: "PCM" };
      });
};
