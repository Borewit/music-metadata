import * as Token from "../token-types";
import { IGetToken } from "../strtok3";
import { ITagFlags, parseTagFlags } from "./APEv2TokenTagFlags";

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

  get: (buf: Buffer, off) => {
    return {
      // should equal 'APETAGEX'
      ID: new Token.StringType(8, "ascii").get(buf, off),
      // equals CURRENT_APE_TAG_VERSION
      version: Token.UINT32_LE.get(buf, off + 8),
      // the complete size of the tag, including this footer (excludes header)
      size: Token.UINT32_LE.get(buf, off + 12),
      // the number of fields in the tag
      fields: Token.UINT32_LE.get(buf, off + 16),
      // reserved for later use (must be zero),
      flags: parseTagFlags(Token.UINT32_LE.get(buf, off + 20)),
    };
  },
};

export const TagField = (footer: { size: number }) => {
  return new Token.Uint8ArrayType(footer.size - TagFooter.len);
};
