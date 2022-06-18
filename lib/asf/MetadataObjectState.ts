import { ITag } from "../type";
import { MetadataObject } from "./GUID";
import { parseUnicodeAttr } from "./AsfUtil";
import { State } from "./State";

/**
 * 4.7  Metadata Object (optional, 0 or 1)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/04_objects_in_the_asf_header_extension_object.html#4_7
 */
export class MetadataObjectState extends State<ITag[]> {
  public static guid = MetadataObject;

  public get(uint8Array: Uint8Array, off: number): ITag[] {
    const tags: ITag[] = [];
    const buf = Buffer.from(uint8Array);
    const descriptionRecordsCount = buf.readUInt16LE(off);
    let pos = off + 2;
    for (let i = 0; i < descriptionRecordsCount; i += 1) {
      pos += 4;
      const nameLen = buf.readUInt16LE(pos);
      pos += 2;
      const dataType = buf.readUInt16LE(pos);
      pos += 2;
      const dataLen = buf.readUInt32LE(pos);
      pos += 4;
      const name = parseUnicodeAttr(buf.slice(pos, pos + nameLen));
      pos += nameLen;
      const data = buf.slice(pos, pos + dataLen);
      pos += dataLen;
      this.postProcessTag(tags, name, dataType, data);
    }
    return tags;
  }
}
