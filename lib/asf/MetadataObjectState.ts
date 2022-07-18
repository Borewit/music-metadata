import type { ITag } from "../type";
import { MetadataObject } from "./GUID";
import { parseUnicodeAttr } from "./AsfUtil";
import { State } from "./State";
import { UINT16_LE, UINT32_LE } from "../token-types";

/**
 * 4.7  Metadata Object (optional, 0 or 1)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/04_objects_in_the_asf_header_extension_object.html#4_7
 */
export class MetadataObjectState extends State<ITag[]> {
  public static guid = MetadataObject;

  public get(uint8Array: Uint8Array, off: number): ITag[] {
    const tags: ITag[] = [];
    const descriptionRecordsCount = UINT16_LE.get(uint8Array, off);
    let pos = off + 2;
    for (let i = 0; i < descriptionRecordsCount; i += 1) {
      pos += 4;
      const nameLen = UINT16_LE.get(uint8Array, pos);
      pos += 2;
      const dataType = UINT16_LE.get(uint8Array, pos);
      pos += 2;
      const dataLen = UINT32_LE.get(uint8Array, pos);
      pos += 4;
      const name = parseUnicodeAttr(uint8Array.slice(pos, pos + nameLen));
      pos += nameLen;
      const data = uint8Array.slice(pos, pos + dataLen);
      pos += dataLen;
      this.postProcessTag(tags, name, dataType, data);
    }
    return tags;
  }
}
