import { UINT32_LE, Uint8ArrayType } from "../token-types";
import { Latin1StringType } from "../token-types/string";

import { ITagFlags, parseTagFlags } from "./APEv2TokenTagFlags";

import type { IGetToken } from "../strtok3";

export interface IFooter {
  // should equal 'APETAGEX'
  ID: string;
  // equals CURRENT_APE_TAG_VERSION
  version: number;
  // the complete size of the tag, including this footer (excludes header)
  size: number;
  // the number of fields in the tag
  fields: number;
  // Global tag flags of all items
  flags: ITagFlags; // ToDo: what is this???
}

/**
 * APE Tag Header/Footer Version 2.0
 * TAG: describes all the properties of the file [optional]
 */
export const TagFooter: IGetToken<IFooter> = {
  len: 32,

  get: (buf: Uint8Array, off) => {
    return {
      // should equal 'APETAGEX'
      ID: new Latin1StringType(8).get(buf, off),
      // equals CURRENT_APE_TAG_VERSION
      version: UINT32_LE.get(buf, off + 8),
      // the complete size of the tag, including this footer (excludes header)
      size: UINT32_LE.get(buf, off + 12),
      // the number of fields in the tag
      fields: UINT32_LE.get(buf, off + 16),
      // reserved for later use (must be zero),
      flags: parseTagFlags(UINT32_LE.get(buf, off + 20)),
    };
  },
};

export const TagField = (footer: { size: number }) => {
  return new Uint8ArrayType(footer.size - TagFooter.len);
};
