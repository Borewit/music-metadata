import * as common from '../common/Util.js';

/**
 * ADTS/AAC fixed header. The remaining three bytes contain the rest of the frame length.
 * Ref: https://wiki.multimedia.cx/index.php/ADTS
 */
export class AdtsFrameHeader {
  private static readonly profiles = ['AAC Main', 'AAC LC', 'AAC SSR', 'AAC LTP'];
  private static readonly samplingRates = [
    96000,
    88200,
    64000,
    48000,
    44100,
    32000,
    24000,
    22050,
    16000,
    12000,
    11025,
    8000,
    7350,
    null, // Reserved index 13
    null, // Reserved index 14
    null // Escape index 15
  ];
  private static readonly channelCounts = [undefined, 1, 2, 3, 4, 5, 6, 8];

  public readonly container: string;
  public readonly codec = 'AAC';
  public readonly codecProfile: string;
  public readonly samplingRate: number | null;
  public readonly numberOfChannels: number | undefined;
  public readonly frameLength: number;

  public static matches(buf: Uint8Array): boolean {
    // MPEG version index 2 or 3, with layer bits 00, identifies ADTS after synchronization.
    return (buf[1] & 0x16) === 0x10;
  }

  public constructor(buf: Uint8Array) {
    this.container = `ADTS/MPEG-${common.isBitSet(buf, 1, 4) ? 2 : 4}`;
    this.codecProfile = AdtsFrameHeader.profiles[common.getBitAllignedNumber(buf, 2, 0, 2)];
    this.samplingRate = AdtsFrameHeader.samplingRates[common.getBitAllignedNumber(buf, 2, 2, 4)];
    this.numberOfChannels = AdtsFrameHeader.channelCounts[common.getBitAllignedNumber(buf, 2, 7, 3)];
    this.frameLength = common.getBitAllignedNumber(buf, 3, 6, 2) << 11;
  }
}
