import { ITag } from "../type";
import { ExtendedContentDescriptionObject } from "./GUID";
import { parseUnicodeAttr } from "./AsfUtil";
import { IAsfObjectHeader } from "./AsfObjectHeader";
import { State } from "./State";

/**
 * 3.11 Extended Content Description Object (optional, one only)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_11
 */
export class ExtendedContentDescriptionObjectState extends State<ITag[]> {
  public static guid = ExtendedContentDescriptionObject;

  constructor(header: IAsfObjectHeader) {
    super(header);
  }

  public get(buf: Buffer, off: number): ITag[] {
    const tags: ITag[] = [];
    const attrCount = buf.readUInt16LE(off);
    let pos = off + 2;
    for (let i = 0; i < attrCount; i += 1) {
      const nameLen = buf.readUInt16LE(pos);
      pos += 2;
      const name = parseUnicodeAttr(buf.slice(pos, pos + nameLen));
      pos += nameLen;
      const valueType = buf.readUInt16LE(pos);
      pos += 2;
      const valueLen = buf.readUInt16LE(pos);
      pos += 2;
      const value = buf.slice(pos, pos + valueLen);
      pos += valueLen;
      this.postProcessTag(tags, name, valueType, value);
    }
    return tags;
  }
}
