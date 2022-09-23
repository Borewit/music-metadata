import { Latin1StringType } from "../token-types/string";

/**
 * Info Tag: Xing, LAME
 */
export const InfoTagHeaderTag = new Latin1StringType(4);

/**
 * LAME TAG value
 * Did not find any official documentation for this
 * Value e.g.: "3.98.4"
 */
export const LameEncoderVersion = new Latin1StringType(6);
