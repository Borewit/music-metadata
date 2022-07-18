import type { IVersionAndFlags } from "./VersionAndFlags";

/**
 * Common interface for the mvhd (Movie Header) & mdhd (Media) atom
 */
export interface IAtomMxhd extends IVersionAndFlags {
  /**
   * A 32-bit integer that specifies (in seconds since midnight, January 1, 1904) when the media atom was created.
   * It is strongly recommended that this value should be specified using coordinated universal time (UTC).
   */
  creationTime: Date;

  /**
   * A 32-bit integer that specifies (in seconds since midnight, January 1, 1904) when the media atom was changed.
   * It is strongly recommended that this value should be specified using coordinated universal time (UTC).
   */
  modificationTime: Date;

  /**
   * A time value that indicates the time scale for this media—that is, the number of time units that pass per second in its time coordinate system.
   */
  timeScale: number;

  /**
   * Duration: the duration of this media in units of its time scale.
   */
  duration: number;
}
