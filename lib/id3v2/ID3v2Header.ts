import { getBit } from "../common/Util";
import { INT8 } from "../token-types";
import { Latin1StringType } from "../token-types/string";

import { UINT32SYNCSAFE } from "./UINT32SYNCSAFE";

import type { IGetToken } from "../strtok3";
import type { ID3v2MajorVersion } from "./ID3v2MajorVersion";

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
        major: INT8.get(buf, off + 3) as ID3v2MajorVersion,
        revision: INT8.get(buf, off + 4),
      },
      // ID3v2 flags
      flags: {
        // Unsynchronisation
        unsynchronisation: getBit(buf, off + 5, 7),
        // Extended header
        isExtendedHeader: getBit(buf, off + 5, 6),
        // Experimental indicator
        expIndicator: getBit(buf, off + 5, 5),
        footer: getBit(buf, off + 5, 4),
      },
      size: UINT32SYNCSAFE.get(buf, off + 6),
    };
  },
};
