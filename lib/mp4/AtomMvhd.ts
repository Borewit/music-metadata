import { UINT8, UINT24_BE, UINT32_BE, UINT16_BE } from "../token-types";

import { FixedLengthAtom } from "./AtomFixedLength";
import { SecondsSinceMacEpoch } from "./SecondsSinceMacEpoch";

import type { IGetToken } from "../token-types";
import type { IAtomMxhd } from "./AtomMxhd";

/**
 * Interface for the parsed Movie Header Atom (mvhd)
 */
export interface IAtomMvhd extends IAtomMxhd {
  /**
   * Preferred rate: a 32-bit fixed-point number that specifies the rate at which to play this movie.
   * A value of 1.0 indicates normal rate.
   */
  preferredRate: number;

  /**
   * Preferred volume: A 16-bit fixed-point number that specifies how loud to play this movie’s sound.
   * A value of 1.0 indicates full volume.
   */
  preferredVolume: number;

  /**
   * Reserved: Ten bytes reserved for use by Apple. Set to 0.
   */
  // reserved: number,

  /**
   * Matrix structure: The matrix structure associated with this movie.
   * A matrix shows how to map points from one coordinate space into another.
   * See Matrices for a discussion of how display matrices are used in QuickTime.
   */
  // matrixStructure: ???;

  /**
   * Preview time: The time value in the movie at which the preview begins.
   */
  previewTime: number;

  /**
   * Preview duration: The duration of the movie preview in movie time scale units.
   */
  previewDuration: number;

  /**
   * Poster time: The time value of the time of the movie poster.
   */
  posterTime: number;

  /**
   * selection time: The time value for the start time of the current selection.
   */
  selectionTime: number;

  /**
   * Selection duration:  The duration of the current selection in movie time scale units.
   */
  selectionDuration: number;

  /**
   * Current time:  The time value for current time position within the movie.
   */
  currentTime: number;

  /**
   * Next track ID:  A 32-bit integer that indicates a value to use for the track ID number of the next track added to this movie. Note that 0 is not a valid track ID value.
   */
  nextTrackID: number;
}

/**
 * Token: Movie Header Atom
 */
export class MvhdAtom extends FixedLengthAtom implements IGetToken<IAtomMvhd> {
  public constructor(public override len: number) {
    super(len, 100, "mvhd");
  }

  public get(buf: Uint8Array, off: number): IAtomMvhd {
    return {
      version: UINT8.get(buf, off),
      flags: UINT24_BE.get(buf, off + 1),
      creationTime: SecondsSinceMacEpoch.get(buf, off + 4),
      modificationTime: SecondsSinceMacEpoch.get(buf, off + 8),
      timeScale: UINT32_BE.get(buf, off + 12),
      duration: UINT32_BE.get(buf, off + 16),
      preferredRate: UINT32_BE.get(buf, off + 20),
      preferredVolume: UINT16_BE.get(buf, off + 24),
      // ignore reserver: 10 bytes
      // ignore matrix structure: 36 bytes
      previewTime: UINT32_BE.get(buf, off + 72),
      previewDuration: UINT32_BE.get(buf, off + 76),
      posterTime: UINT32_BE.get(buf, off + 80),
      selectionTime: UINT32_BE.get(buf, off + 84),
      selectionDuration: UINT32_BE.get(buf, off + 88),
      currentTime: UINT32_BE.get(buf, off + 92),
      nextTrackID: UINT32_BE.get(buf, off + 96),
    };
  }
}
