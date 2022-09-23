export interface IVersionAndFlags {
  /**
   * A 1-byte specification of the version
   */
  version: number;

  /**
   * Three bytes of space for (future) flags.
   */
  flags: number;
}
