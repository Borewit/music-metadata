import * as Token from "../token-types";

/**
 * Info Tag: Xing, LAME
 */
export const InfoTagHeaderTag = new Token.StringType(4, "ascii");

/**
 * LAME TAG value
 * Did not find any official documentation for this
 * Value e.g.: "3.98.4"
 */
export const LameEncoderVersion = new Token.StringType(6, "ascii");
