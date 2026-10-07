import * as common from '../common/Util.js';
import { makeUnexpectedFileContentError } from '../ParseError.js';

export class MpegContentError extends makeUnexpectedFileContentError('MPEG') {}

/**
 * MPEG Audio Layer I/II/III frame header.
 * Bit layout: AAAAAAAA AAABBCCD EEEEFFGH IIJJKLMM
 * Ref: https://www.mp3-tech.org/programmer/frame_header.html
 */
export class MpegFrameHeader {
  public static readonly len = 4;

  private static readonly versions = [2.5, null, 2, 1];
  private static readonly layers = [0, 3, 2, 1];
  private static readonly sideInfoLengths = [
    [17, 32],
    [9, 17]
  ];

  private static readonly bitrates: { [bitrateIndex: number]: { [codecIndex: number]: number } } = {
    1: { 11: 32, 12: 32, 13: 32, 21: 32, 22: 8, 23: 8 },
    2: { 11: 64, 12: 48, 13: 40, 21: 48, 22: 16, 23: 16 },
    3: { 11: 96, 12: 56, 13: 48, 21: 56, 22: 24, 23: 24 },
    4: { 11: 128, 12: 64, 13: 56, 21: 64, 22: 32, 23: 32 },
    5: { 11: 160, 12: 80, 13: 64, 21: 80, 22: 40, 23: 40 },
    6: { 11: 192, 12: 96, 13: 80, 21: 96, 22: 48, 23: 48 },
    7: { 11: 224, 12: 112, 13: 96, 21: 112, 22: 56, 23: 56 },
    8: { 11: 256, 12: 128, 13: 112, 21: 128, 22: 64, 23: 64 },
    9: { 11: 288, 12: 160, 13: 128, 21: 144, 22: 80, 23: 80 },
    10: { 11: 320, 12: 192, 13: 160, 21: 160, 22: 96, 23: 96 },
    11: { 11: 352, 12: 224, 13: 192, 21: 176, 22: 112, 23: 112 },
    12: { 11: 384, 12: 256, 13: 224, 21: 192, 22: 128, 23: 128 },
    13: { 11: 416, 12: 320, 13: 256, 21: 224, 22: 144, 23: 144 },
    14: { 11: 448, 12: 384, 13: 320, 21: 256, 22: 160, 23: 160 }
  };

  private static readonly samplingRates: { [version: number]: { [index: number]: number } } = {
    1: { 0: 44100, 1: 48000, 2: 32000 },
    2: { 0: 22050, 1: 24000, 2: 16000 },
    2.5: { 0: 11025, 1: 12000, 2: 8000 }
  };

  private static readonly samplesInFrameTable = [
    /* Layer   I    II   III */
    [0, 384, 1152, 1152], // MPEG-1
    [0, 384, 1152, 576] // MPEG-2/2.5
  ];

  public readonly container = 'MPEG';
  public readonly codec: string;
  public readonly layer: number;
  public readonly isProtectedByCRC: boolean;
  public readonly bitrate: number;
  public readonly samplingRate: number;
  public readonly numberOfChannels: number;
  public readonly samplesPerFrame: number;
  public readonly frameSize: number;
  public readonly sideInfoLength: number;

  public constructor(buf: Uint8Array) {
    const version = MpegFrameHeader.versions[common.getBitAllignedNumber(buf, 1, 3, 2)];
    if (version === null) {
      throw new MpegContentError('Cannot determine bit-rate');
    }
    this.layer = MpegFrameHeader.layers[common.getBitAllignedNumber(buf, 1, 5, 2)];
    this.isProtectedByCRC = !common.isBitSet(buf, 1, 7);
    const bitrateIndex = common.getBitAllignedNumber(buf, 2, 0, 4);
    const samplingRateIndex = common.getBitAllignedNumber(buf, 2, 4, 2);
    const padding = common.isBitSet(buf, 2, 6);
    this.numberOfChannels = common.getBitAllignedNumber(buf, 3, 0, 2) === 3 ? 1 : 2;
    this.codec = `MPEG ${version} Layer ${this.layer}`;

    const bitrate = MpegFrameHeader.bitrates[bitrateIndex]?.[10 * Math.floor(version) + this.layer];
    if (!bitrate) {
      throw new MpegContentError('Cannot determine bit-rate');
    }
    this.bitrate = bitrate * 1000;

    const samplingRate = MpegFrameHeader.samplingRates[version][samplingRateIndex];
    if (samplingRate == null) {
      throw new MpegContentError('Cannot determine sampling-rate');
    }
    this.samplingRate = samplingRate;
    this.samplesPerFrame = MpegFrameHeader.samplesInFrameTable[version === 1 ? 0 : 1][this.layer];
    const slotSize = this.layer === 1 ? 4 : 1;
    this.frameSize = Math.floor(((this.samplesPerFrame / 8) * this.bitrate) / samplingRate + (padding ? slotSize : 0));
    this.sideInfoLength =
      this.layer !== 3
        ? 2
        : MpegFrameHeader.sideInfoLengths[version === 1 ? 0 : 1][this.numberOfChannels === 1 ? 0 : 1];
  }
}
