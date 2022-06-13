import { IGetToken } from "./type";

/**
 * Ignore a given number of bytes
 */
export class IgnoreType implements IGetToken<void> {
  /**
   * @param len number of bytes to ignore
   */
  constructor(public len: number) {}

  // ToDo: don't read, but skip data
  public get(array: Uint8Array, off: number) {
    // empty
  }
}
