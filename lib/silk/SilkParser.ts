import { BasicParser } from '../common/BasicParser';
import * as Token from 'token-types';

interface RangeCoderState {
  bufferIx: number;
  base_Q32: number;
  range_Q16: number;
  error: number;
}

/**
 * Based on SKP_Silk_decoder_state & SKP_int SKP_Silk_init_decoder
 *
 */
class DecoderState {
  public nFramesDecoded: number = 0;
  /**
   * Range coder state
   */
  public rc: RangeCoderState;
  /**
   * Sampling frequency in kHz
   */
  public fs_kHz: number = 24;
  public frame_length: number;
  public subfr_length: number;
  public LPC_order: number;
}

const samplingRates_CDF = [0, 16000, 32000, 48000, 65535];
const samplingRates_table = [8, 12, 16, 24];
const samplingRates_offset = 2;

// Error codes
const RANGE_CODER_CDF_OUT_OF_RANGE = -2;
const RANGE_CODER_ILLEGAL_SAMPLING_RATE = -7;

const FRAME_LENGTH_MS = 20;
const NB_SUBFR = 4;
const MIN_LPC_ORDER = 10;
const MAX_LPC_ORDER = 16;

const MAX_FS_KHZ = 24;
const MAX_FRAME_LENGTH = FRAME_LENGTH_MS * MAX_FS_KHZ;

/**
 *
 */
export class SilkParser extends BasicParser {

  private decoderState: DecoderState; // psDec

  public async parse(): Promise<void> {
    this.metadata.setFormat('container', 'SILK');
    this.metadata.setFormat('lossless', false);

    this.decoderState = new DecoderState();

    await this.decode_frame();
  }


  private async decode_frame(): Promise<void> {
    if (this.decoderState.nFramesDecoded === 0) {
      // Initialize range decoder state
      this.decoderState.rc = await this.range_dec_init();
      // Decode parameters and pulse signal
      await this.decode_parameters();
    }
  }

  private async range_dec_init(): Promise<RangeCoderState> {
    const base_Q32 = await this.tokenizer.readToken(Token.UINT32_BE);
    return {
      bufferIx: 0,
      base_Q32,
      range_Q16: 0x0000FFFF,
      error: 0
    };
  }

  private async decode_parameters(): Promise<void> {
    // Decode sampling rate
    // only done for first frame of packet
    if (this.decoderState.nFramesDecoded === 0) {
      const Ix = await this.range_decoder();

      if (Ix < 0 || Ix > 3) {
        this.decoderState.rc.error = RANGE_CODER_ILLEGAL_SAMPLING_RATE;
        return;
      }
      const fs_kHz_dec = samplingRates_table[Ix];
      this.decoder_set_fs(fs_kHz_dec);
      this.metadata.setFormat('sampleRate', fs_kHz_dec * 1000);
    }
  }

  /**
   * Range decoder for one symbol
   */
  private async range_decoder(): Promise<number> {
    if (this.decoderState.rc.error > 0)
      return;
    let probIx = samplingRates_offset;
    let high_Q16 = samplingRates_CDF[probIx];
    let base_tmp = this.decoderState.rc.range_Q16 * high_Q16;
    let low_Q16;
    if (base_tmp > this.decoderState.rc.base_Q32) {
      while (1) {
        low_Q16 = samplingRates_CDF[--probIx];
        base_tmp = this.decoderState.rc.range_Q16 * low_Q16;
        if (base_tmp <= this.decoderState.rc.base_Q32) {
          break;
        }
        high_Q16 = low_Q16;
        /* Test for out of range */
        if (high_Q16 === 0) {
          this.decoderState.rc.error = RANGE_CODER_CDF_OUT_OF_RANGE;
          return 0;
        }
      }
    } else {
      return 0;
    }
    return probIx;
  }

  private decoder_set_fs(fs_kHz: number) {
    if (this.decoderState.fs_kHz !== fs_kHz) {
      this.decoderState.fs_kHz = fs_kHz;
      this.decoderState.frame_length = FRAME_LENGTH_MS * fs_kHz;
      this.decoderState.subfr_length = (FRAME_LENGTH_MS / NB_SUBFR) * fs_kHz;
      this.decoderState.LPC_order = this.decoderState.fs_kHz === 8 ? MIN_LPC_ORDER : MAX_LPC_ORDER;
      /* Reset part of the decoder state */
      if (this.decoderState.frame_length <= 0 || this.decoderState.frame_length > MAX_FRAME_LENGTH) {
        throw new Error('Invalid frame length');
      }
    }
  }
}
