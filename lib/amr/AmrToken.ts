import type { IGetToken } from 'strtok3';
import { getBitAllignedNumber } from '../common/Util.js';

interface IFrameHeader {
  frameType: number;
}

/**
 * ID3v2 header
 * Ref: http://id3.org/id3v2.3.0#ID3v2_header
 * ToDo
 */
export const FrameHeader: IGetToken<IFrameHeader > = {
  len: 1,

  get: (buf: Uint8Array, off: number): IFrameHeader => {
    return {
      frameType: getBitAllignedNumber(buf, off, 1, 4)
    };
  }
};
