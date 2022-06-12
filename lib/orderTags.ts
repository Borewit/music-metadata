import { INativeTagDict, ITag } from "./type";

/**
 * Create a dictionary ordered by their tag id (key)
 * @param nativeTags list of tags
 * @returns tags indexed by id
 */

export function orderTags(nativeTags: ITag[]): INativeTagDict {
  const tags = {};
  for (const tag of nativeTags) {
    (tags[tag.id] = tags[tag.id] || []).push(tag.value);
  }
  return tags;
}
