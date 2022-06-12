import { IPicture } from "./type";

/**
 * Select most likely cover image.
 * @param pictures Usually metadata.common.picture
 * @return Cover image, if any, otherwise null
 */

export function selectCover(pictures?: IPicture[]): IPicture | null {
  return pictures
    ? pictures.reduce((acc, cur) => {
        if (
          cur.name &&
          cur.name.toLowerCase() in ["front", "cover", "cover (front)"]
        )
          return cur;
        return acc;
      })
    : null;
}
