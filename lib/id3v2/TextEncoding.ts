import { IGetToken } from "../strtok3";

import * as util from "../common/Util";

export interface ITextEncoding {
  encoding: util.StringEncoding;
  bom?: boolean;
}

export const TextEncodingToken: IGetToken<ITextEncoding> = {
  len: 1,

  get: (uint8Array: Uint8Array, off: number): ITextEncoding => {
    switch (uint8Array[off]) {
      case 0x00:
        return { encoding: "latin1" }; // binary
      case 0x01:
        return { encoding: "utf16le", bom: true };
      case 0x02:
        return { encoding: "utf16le", bom: false };
      case 0x03:
        return { encoding: "utf8", bom: false };
      default:
        return { encoding: "utf8", bom: false };
    }
  },
};
