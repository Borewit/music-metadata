import { UINT16_LE, UINT32_LE } from "../token-types";

import GUID, { HeaderExtensionObject as GUIDHeaderExtensionObject } from "./GUID";

import type { IGetToken } from "../token-types";

export interface IHeaderExtensionObject {
  reserved1: GUID;
  reserved2: number;
  extensionDataSize: number;
}

/**
 * 3.4: Header Extension Object (mandatory, one only)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_4
 */
export class HeaderExtensionObject implements IGetToken<IHeaderExtensionObject> {
  public static guid = GUIDHeaderExtensionObject;

  public len: number;

  public constructor() {
    this.len = 22;
  }

  public get(buf: Uint8Array, off: number): IHeaderExtensionObject {
    return {
      reserved1: GUID.fromBin(buf, off),
      reserved2: UINT16_LE.get(buf, off + 16),
      extensionDataSize: UINT32_LE.get(buf, off + 18),
    };
  }
}
