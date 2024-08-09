/**
 * Extended Lame Header
 */

import type { IGetToken } from 'strtok3';
import * as Token from 'token-types';

import * as common from '../common/Util.js';
import { ReplayGain, type IReplayGain } from './ReplayGainDataFormat.js';

/**
 * LAME Tag, extends the Xing header format
 * First added in LAME 3.12 for VBR
 * The modified header is also included in CBR files (effective LAME 3.94), with "Info" instead of "XING" near the beginning.
 */
export interface IExtendedLameHeader {

  revision: number,
  vbr_method: number,
  lowpass_filter: number;
  track_peak?: number | null;
  track_gain?: IReplayGain;
  album_gain?: IReplayGain;
  music_length: number;
  music_crc: number;
  header_crc: number;
}

/**
 * Info Tag
 * @link http://gabriel.mp3-tech.org/mp3infotag.html
 * @link https://github.com/quodlibet/mutagen/blob/abd58ee58772224334a18817c3fb31103572f70e/mutagen/mp3/_util.py#L112
 */
export const ExtendedLameHeader: IGetToken<IExtendedLameHeader> = {
  len: 27,

  get: (buf, off) => {
    const track_peak = Token.UINT32_BE.get(buf, off + 2);
    return {
      revision: common.getBitAllignedNumber(buf, off, 0, 4),
      vbr_method: common.getBitAllignedNumber(buf, off, 4, 4),
      lowpass_filter: 100 * Token.UINT8.get(buf, off + 1),
      track_peak: track_peak === 0 ? null : track_peak / 2 ** 23,
      track_gain: ReplayGain.get(buf, 6),
      album_gain: ReplayGain.get(buf, 8),
      music_length: Token.UINT32_BE.get(buf, off + 20),
      music_crc: Token.UINT8.get(buf, off + 24),
      header_crc: Token.UINT16_BE.get(buf, off + 24)
    };
  }
};
