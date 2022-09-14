import { UINT8, UINT24_BE, UINT32_BE, UINT16_BE } from "../token-types";

import { SecondsSinceMacEpoch } from "./SecondsSinceMacEpoch";

import type { IGetToken } from "../strtok3";
import type { IVersionAndFlags } from "./VersionAndFlags";

/**
 * Track Header Atoms interface
 * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-25550
 */
export interface ITrackHeaderAtom extends IVersionAndFlags {
  /**
   * Creation Time
   */
  creationTime: Date;

  /**
   * Modification Time
   */
  modificationTime: Date;

  /**
   * TrackID
   */
  trackId: number;

  /**
   * A time value that indicates the duration of this track (in the movie’s time coordinate system).
   * Note that this property is derived from the track’s edits. The value of this field is equal to the sum of the
   * durations of all of the track’s edits. If there is no edit list, then the duration is the sum of the sample
   * durations, converted into the movie timescale.
   */
  duration: number;

  /**
   * A 16-bit integer that indicates this track’s spatial priority in its movie.
   * The QuickTime Movie Toolbox uses this value to determine how tracks overlay one another.
   * Tracks with lower layer values are displayed in front of tracks with higher layer values.
   */
  layer: number;

  /**
   * A 16-bit integer that identifies a collection of movie tracks that contain alternate data for one another.
   * This same identifier appears in each 'tkhd' atom of the other tracks in the group.
   * QuickTime chooses one track from the group to be used when the movie is played.
   * The choice may be based on such considerations as playback quality, language, or the capabilities of the computer.
   * A value of zero indicates that the track is not in an alternate track group.
   */
  alternateGroup: number;

  /**
   * A 16-bit fixed-point value that indicates how loudly this track’s sound is to be played.
   * A value of 1.0 indicates normal volume.
   */
  volume: number;
}

/**
 * Track Header Atoms structure
 * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-25550
 */
export class TrackHeaderAtom implements IGetToken<ITrackHeaderAtom> {
  public constructor(public len: number) {}

  public get(buf: Uint8Array, off: number): ITrackHeaderAtom {
    return {
      version: UINT8.get(buf, off),
      flags: UINT24_BE.get(buf, off + 1),
      creationTime: SecondsSinceMacEpoch.get(buf, off + 4),
      modificationTime: SecondsSinceMacEpoch.get(buf, off + 8),
      trackId: UINT32_BE.get(buf, off + 12),
      // reserved 4 bytes
      duration: UINT32_BE.get(buf, off + 20),
      layer: UINT16_BE.get(buf, off + 24),
      alternateGroup: UINT16_BE.get(buf, off + 26),
      volume: UINT16_BE.get(buf, off + 28), // ToDo: fixed point
      // ToDo: add remaining fields
    };
  }
}
