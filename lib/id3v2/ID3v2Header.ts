import { ID3v2MajorVersion } from "./ID3v2MajorVersion";
import * as Token from "../token-types";
import { IGetToken } from "../strtok3";

import * as util from "../common/Util";
import { UINT32SYNCSAFE } from "./UINT32SYNCSAFE";
import { Latin1StringType } from "../token-types/string";

/**
 * ID3v2 tag header
 */
export interface IID3v2header {
  // ID3v2/file identifier   "ID3"
  fileIdentifier: string;
  // ID3v2 versionIndex
  version: {
    major: ID3v2MajorVersion;
    revision: number;
  };
  // ID3v2 flags
  flags: {
    // Unsynchronisation
    unsynchronisation: boolean;
    // Extended header
    isExtendedHeader: boolean;
    // Experimental indicator
    expIndicator: boolean;
    footer: boolean;
  };
  size: number;
}

/**
 * ID3v2 header
 * Ref: http://id3.org/id3v2.3.0#ID3v2_header
 * ToDo
 */
export const ID3v2Header: IGetToken<IID3v2header> = {
  len: 10,

  get: (buf: Uint8Array, off): IID3v2header => {
    return {
      // ID3v2/file identifier   "ID3"
      fileIdentifier: new Latin1StringType(3).get(buf, off),
      // ID3v2 versionIndex
      version: {
        major: Token.INT8.get(buf, off + 3) as ID3v2MajorVersion,
        revision: Token.INT8.get(buf, off + 4),
      },
      // ID3v2 flags
      flags: {
        // Unsynchronisation
        unsynchronisation: util.getBit(buf, off + 5, 7),
        // Extended header
        isExtendedHeader: util.getBit(buf, off + 5, 6),
        // Experimental indicator
        expIndicator: util.getBit(buf, off + 5, 5),
        footer: util.getBit(buf, off + 5, 4),
      },
      size: UINT32SYNCSAFE.get(buf, off + 6),
    };
  },
};
