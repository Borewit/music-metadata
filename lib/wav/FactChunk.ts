import { IGetToken } from "../strtok3";

import { IChunkHeader } from "../iff";

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
      throw new Error("Invalid fact chunk size.");
    }
    this.len = header.chunkSize;
  }

  public get(buf: Buffer, off: number): IFactChunk {
    return {
      dwSampleLength: buf.readUInt32LE(off),
    };
  }
}
