import { UINT16_LE } from "../token-types";

import { parseUnicodeAttr } from "./AsfUtil";
import { ContentDescriptionObject } from "./GUID";
import { State } from "./State";

import type { ITag } from "../type";

/**
 * 3.10 Content Description Object (optional, one only)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_10
 */
export class ContentDescriptionObjectState extends State<ITag[]> {
  public static guid = ContentDescriptionObject;

  private static contentDescTags = ["Title", "Author", "Copyright", "Description", "Rating"];

  public get(buf: Uint8Array, off: number): ITag[] {
    const tags: ITag[] = [];

    let pos = off + 10;
    for (let i = 0; i < ContentDescriptionObjectState.contentDescTags.length; ++i) {
      const length = UINT16_LE.get(buf, off + i * 2);
      if (length > 0) {
        const tagName = ContentDescriptionObjectState.contentDescTags[i];
        const end = pos + length;
        tags.push({
          id: tagName,
          value: parseUnicodeAttr(buf.slice(pos, end)),
        });
        pos = end;
      }
    }
    return tags;
  }
}
