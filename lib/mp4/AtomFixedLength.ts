import initDebug from "debug";

const debug = initDebug("music-metadata:parser:MP4:atom");

/**
 * Base class for 'fixed' length atoms.
 * In some cases these atoms are longer then the sum of the described fields.
 * Issue: https://github.com/Borewit/music-metadata/issues/120
 */
export abstract class FixedLengthAtom {
  /**
   *
   * @param {number} len Length as specified in the size field
   * @param {number} expLen Total length of sum of specified fields in the standard
   * @param atomId
   */
  protected constructor(public len: number, expLen: number, atomId: string) {
    if (len < expLen) {
      throw new Error(
        `Atom ${atomId} expected to be ${expLen}, but specifies ${len} bytes long.`
      );
    } else if (len > expLen) {
      debug(
        `Warning: atom ${atomId} expected to be ${expLen}, but was actually ${len} bytes long.`
      );
    }
  }
}
