import { IGetToken } from "../strtok3";

import { ITag } from "../type";
import { getParserForAttr } from "./AsfUtil";
import { HeaderObjectToken, IAsfObjectHeader } from "./AsfObjectHeader";
import { WmPictureToken } from "./WmPicture";

export abstract class State<T> implements IGetToken<T> {
  public len: number;

  constructor(header: IAsfObjectHeader) {
    this.len = Number(header.objectSize) - HeaderObjectToken.len;
  }

  public abstract get(buf: Uint8Array, off: number): T;

  protected postProcessTag(tags: ITag[], name: string, valueType: number, data: any) {
    if (name === "WM/Picture") {
      tags.push({ id: name, value: WmPictureToken.fromBuffer(data as Uint8Array) });
    } else {
      const parseAttr = getParserForAttr(valueType);
      if (!parseAttr) {
        throw new Error(`unexpected value headerType: ${valueType}`);
      }
      tags.push({ id: name, value: parseAttr(data as Uint8Array) });
    }
  }
}
