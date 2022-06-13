import { IGetToken } from "../strtok3";

import GUID, {
  HeaderExtensionObject as GUIDHeaderExtensionObject,
} from "./GUID";

export interface IHeaderExtensionObject {
  reserved1: GUID;
  reserved2: number;
  extensionDataSize: number;
}

/**
 * 3.4: Header Extension Object (mandatory, one only)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_4
 */
export class HeaderExtensionObject
  implements IGetToken<IHeaderExtensionObject>
{
  public static guid = GUIDHeaderExtensionObject;

  public len: number;

  public constructor() {
    this.len = 22;
  }

  public get(buf: Buffer, off: number): IHeaderExtensionObject {
    return {
      reserved1: GUID.fromBin(buf, off),
      reserved2: buf.readUInt16LE(off + 16),
      extensionDataSize: buf.readUInt32LE(off + 18),
    };
  }
}
