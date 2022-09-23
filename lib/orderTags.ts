import type { INativeTagDict, ITag } from "./type";

/**
 * Create a dictionary ordered by their tag id (key)
 * @param nativeTags list of tags
 * @returns tags indexed by id
 */

/**
 *
 * @param nativeTags
 * @returns
 */
export function orderTags(nativeTags: ITag[]): INativeTagDict {
  const tags: INativeTagDict = {};
  for (const tag of nativeTags) {
    (tags[tag.id] = tags[tag.id] || []).push(tag.value);
  }
  return tags;
}
