import * as common from "../common/Util";
import initDebug from "debug";

const debug = initDebug("music-metadata:parser:mpeg");

type UInt4 =
  | 0x0
  | 0x1
  | 0x2
  | 0x3
  | 0x4
  | 0x5
  | 0x6
  | 0x7
  | 0x8
  | 0x9
  | 0xa
  | 0xb
  | 0xc
  | 0xd
  | 0xe
  | 0xf;

type MPEG4Channel =
  | "front-center"
  | "front-left"
  | "front-right"
  | "side-left"
  | "side-right"
  | "back-left"
  | "back-right"
  | "back-center"
  | "LFE-channel";

type MPEG4ChannelConfiguration = MPEG4Channel[];

/**
 * MPEG-4 Audio definitions
 * Ref:  https://wiki.multimedia.cx/index.php/MPEG-4_Audio
 */
const MPEG4 = {
  /**
   * Audio Object Types
   */
  AudioObjectTypes: [
    "AAC Main",
    "AAC LC", // Low Complexity
    "AAC SSR", // Scalable Sample Rate
    "AAC LTP", // Long Term Prediction
  ],

  /**
   * Sampling Frequencies
   * https://wiki.multimedia.cx/index.php/MPEG-4_Audio#Sampling_Frequencies
   */
  SamplingFrequencies: [
    96_000,
    88_200,
    64_000,
    48_000,
    44_100,
    32_000,
    24_000,
    22_050,
    16_000,
    12_000,
    11_025,
    8000,
    7350,
    undefined,
    undefined,
    -1,
  ],

  /**
   * Channel Configurations
   */
};

const MPEG4_ChannelConfigurations: MPEG4ChannelConfiguration[] = [
  undefined,
  ["front-center"],
  ["front-left", "front-right"],
  ["front-center", "front-left", "front-right"],
  ["front-center", "front-left", "front-right", "back-center"],
  ["front-center", "front-left", "front-right", "back-left", "back-right"],
  [
    "front-center",
    "front-left",
    "front-right",
    "back-left",
    "back-right",
    "LFE-channel",
  ],
  [
    "front-center",
    "front-left",
    "front-right",
    "side-left",
    "side-right",
    "back-left",
    "back-right",
    "LFE-channel",
  ],
];

/**
 * MPEG Audio Layer I/II/III frame header
 * Ref: https://www.mp3-tech.org/programmer/frame_header.html
 * Bit layout: AAAAAAAA AAABBCCD EEEEFFGH IIJJKLMM
 * Ref: https://wiki.multimedia.cx/index.php/ADTS
 */
export class MpegFrameHeader {
  public static SyncByte1 = 0xff;
  public static SyncByte2 = 0xe0;

  public static VersionID: [2.5, null, 2, 1] = [2.5, null, 2, 1];
  public static LayerDescription = [0, 3, 2, 1];
  public static ChannelMode = [
    "stereo",
    "joint_stereo",
    "dual_channel",
    "mono",
  ];

  private static bitrate_index = {
    0x01: { 11: 32, 12: 32, 13: 32, 21: 32, 22: 8, 23: 8 },
    0x02: { 11: 64, 12: 48, 13: 40, 21: 48, 22: 16, 23: 16 },
    0x03: { 11: 96, 12: 56, 13: 48, 21: 56, 22: 24, 23: 24 },
    0x04: { 11: 128, 12: 64, 13: 56, 21: 64, 22: 32, 23: 32 },
    0x05: { 11: 160, 12: 80, 13: 64, 21: 80, 22: 40, 23: 40 },
    0x06: { 11: 192, 12: 96, 13: 80, 21: 96, 22: 48, 23: 48 },
    0x07: { 11: 224, 12: 112, 13: 96, 21: 112, 22: 56, 23: 56 },
    0x08: { 11: 256, 12: 128, 13: 112, 21: 128, 22: 64, 23: 64 },
    0x09: { 11: 288, 12: 160, 13: 128, 21: 144, 22: 80, 23: 80 },
    0x0a: { 11: 320, 12: 192, 13: 160, 21: 160, 22: 96, 23: 96 },
    0x0b: { 11: 352, 12: 224, 13: 192, 21: 176, 22: 112, 23: 112 },
    0x0c: { 11: 384, 12: 256, 13: 224, 21: 192, 22: 128, 23: 128 },
    0x0d: { 11: 416, 12: 320, 13: 256, 21: 224, 22: 144, 23: 144 },
    0x0e: { 11: 448, 12: 384, 13: 320, 21: 256, 22: 160, 23: 160 },
  };

  private static sampling_rate_freq_index = {
    1: { 0x00: 44_100, 0x01: 48_000, 0x02: 32_000 },
    2: { 0x00: 22_050, 0x01: 24_000, 0x02: 16_000 },
    2.5: { 0x00: 11_025, 0x01: 12_000, 0x02: 8000 },
  };

  private static samplesInFrameTable = [
    /* Layer   I    II   III */
    [0, 384, 1152, 1152], // MPEG-1
    [0, 384, 1152, 576], // MPEG-2(.5
  ];

  // B(20,19): MPEG Audio versionIndex ID
  public versionIndex: number;
  // C(18,17): Layer description
  public layer: number;
  // D(16): Protection bit
  public isProtectedByCRC: boolean;
  // E(15,12): Bitrate index
  public bitrateIndex: UInt4;
  // F(11,10): Sampling rate frequency index
  public sampRateFreqIndex: number;
  // G(9): Padding bit
  public padding: boolean;
  // H(8): Private bit
  public privateBit: boolean;
  // I(7,6): Channel Mode
  public channelModeIndex: number;
  // J(5,4): Mode extension (Only used in Joint stereo)
  public modeExtension: number;
  // K(3): Copyright
  public isCopyrighted: boolean;
  // L(2): Original
  public isOriginalMedia: boolean;
  // M(3): The original bit indicates, if it is set, that the frame is located on its original media.
  public emphasis: number;

  public version: 1 | 2 | 2.5 | 4 | null;
  public channelMode: string;
  public bitrate: number;
  public samplingRate: number;

  public container: string;
  public codec: string;
  public codecProfile: string;

  public frameLength: number;

  public mp4ChannelConfig: MPEG4ChannelConfiguration;

  public constructor(buf: Uint8Array, off: number) {
    // B(20,19): MPEG Audio versionIndex ID
    this.versionIndex = common.getBitAllignedNumber(buf, off + 1, 3, 2);
    // C(18,17): Layer description
    this.layer =
      MpegFrameHeader.LayerDescription[
        common.getBitAllignedNumber(buf, off + 1, 5, 2)
      ];

    if (this.versionIndex > 1 && this.layer === 0) {
      this.parseAdtsHeader(buf, off); // Audio Data Transport Stream (ADTS)
    } else {
      this.parseMpegHeader(buf, off); // Conventional MPEG header
    }

    // D(16): Protection bit (if true 16-bit CRC follows header)
    this.isProtectedByCRC = !common.isBitSet(buf, off + 1, 7);
  }

  public calcDuration(numFrames: number): number {
    return (numFrames * this.calcSamplesPerFrame()) / this.samplingRate;
  }

  public calcSamplesPerFrame(): number {
    return MpegFrameHeader.samplesInFrameTable[this.version === 1 ? 0 : 1][
      this.layer
    ];
  }

  public calculateSideInfoLength(): number {
    if (this.layer !== 3) return 2;
    if (this.channelModeIndex === 3) {
      // mono
      if (this.version === 1) {
        return 17;
      } else if (this.version === 2 || this.version === 2.5) {
        return 9;
      }
    } else {
      if (this.version === 1) {
        return 32;
      } else if (this.version === 2 || this.version === 2.5) {
        return 17;
      }
    }
  }

  public calcSlotSize(): number {
    return [null, 4, 1, 1][this.layer];
  }

  private parseMpegHeader(buf: Uint8Array, off: number): void {
    this.container = "MPEG";
    // E(15,12): Bitrate index
    this.bitrateIndex = common.getBitAllignedNumber(
      buf,
      off + 2,
      0,
      4
    ) as UInt4;
    // F(11,10): Sampling rate frequency index
    this.sampRateFreqIndex = common.getBitAllignedNumber(buf, off + 2, 4, 2);
    // G(9): Padding bit
    this.padding = common.isBitSet(buf, off + 2, 6);
    // H(8): Private bit
    this.privateBit = common.isBitSet(buf, off + 2, 7);
    // I(7,6): Channel Mode
    this.channelModeIndex = common.getBitAllignedNumber(buf, off + 3, 0, 2);
    // J(5,4): Mode extension (Only used in Joint stereo)
    this.modeExtension = common.getBitAllignedNumber(buf, off + 3, 2, 2);
    // K(3): Copyright
    this.isCopyrighted = common.isBitSet(buf, off + 3, 4);
    // L(2): Original
    this.isOriginalMedia = common.isBitSet(buf, off + 3, 5);
    // M(3): The original bit indicates, if it is set, that the frame is located on its original media.
    this.emphasis = common.getBitAllignedNumber(buf, off + 3, 7, 2);

    this.version = MpegFrameHeader.VersionID[this.versionIndex];
    this.channelMode = MpegFrameHeader.ChannelMode[this.channelModeIndex];

    this.codec = `MPEG ${this.version} Layer ${this.layer}`;

    // Calculate bitrate
    const bitrateInKbps = this.calcBitrate();
    if (!bitrateInKbps) {
      throw new Error("Cannot determine bit-rate");
    }
    this.bitrate = bitrateInKbps * 1000;

    // Calculate sampling rate
    this.samplingRate = this.calcSamplingRate();
    if (this.samplingRate == null) {
      throw new Error("Cannot determine sampling-rate");
    }
  }

  private parseAdtsHeader(buf: Uint8Array, off: number): void {
    debug(`layer=0 => ADTS`);
    this.version = this.versionIndex === 2 ? 4 : 2;
    this.container = "ADTS/MPEG-" + this.version;
    const profileIndex = common.getBitAllignedNumber(buf, off + 2, 0, 2);
    this.codec = "AAC";
    this.codecProfile = MPEG4.AudioObjectTypes[profileIndex];

    debug(`MPEG-4 audio-codec=${this.codec}`);

    const samplingFrequencyIndex = common.getBitAllignedNumber(
      buf,
      off + 2,
      2,
      4
    );
    this.samplingRate = MPEG4.SamplingFrequencies[samplingFrequencyIndex];
    debug(`sampling-rate=${this.samplingRate}`);

    const channelIndex = common.getBitAllignedNumber(buf, off + 2, 7, 3);
    this.mp4ChannelConfig = MPEG4_ChannelConfigurations[channelIndex];
    debug(`channel-config=${this.mp4ChannelConfig.join("+")}`);

    this.frameLength = common.getBitAllignedNumber(buf, off + 3, 6, 2) << 11;
  }

  private calcBitrate(): number {
    if (
      this.bitrateIndex === 0x00 || // free
      this.bitrateIndex === 0x0f
    ) {
      // reserved
      return;
    }
    type CodecIndex = "11" | "12" | "13" | "21" | "22" | "23";
    const codecIndex: CodecIndex = `${Math.floor(this.version)}${
      this.layer
    }` as CodecIndex;
    return MpegFrameHeader.bitrate_index[this.bitrateIndex][codecIndex];
  }

  private calcSamplingRate(): number {
    if (this.sampRateFreqIndex === 0x03) return null; // 'reserved'
    if (this.version === 4) return null;
    if (
      this.sampRateFreqIndex !== 0 &&
      this.sampRateFreqIndex !== 1 &&
      this.sampRateFreqIndex !== 2
    )
      return null;
    return MpegFrameHeader.sampling_rate_freq_index[this.version][
      this.sampRateFreqIndex
    ];
  }
}

/**
 * MPEG Audio Layer I/II/III
 */
export const FrameHeader = {
  len: 4,

  get: (buf: Uint8Array, off: number): MpegFrameHeader => {
    return new MpegFrameHeader(buf, off);
  },
};
