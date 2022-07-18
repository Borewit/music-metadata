import { IPicture } from "./type";

/**
 * Select most likely cover image.
 * @param pictures Usually metadata.common.picture
 * @returns Cover image, if any, otherwise null
 */

/**
 *
 * @param pictures
 * @returns
 */
export function selectCover(pictures?: IPicture[]): IPicture | null {
  if (pictures) {
    const picture = pictures?.find((cur) => cur.name && cur.name.toLowerCase() in ["front", "cover", "cover (front)"]);
    return picture ?? pictures[0] ?? null;
  }
  return null;
}
