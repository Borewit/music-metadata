/*!
 * media-typer
 * Copyright(c) 2014-2017 Douglas Christopher Wilson
 * MIT Licensed
 */

"use strict";

// Type definitions for media-typer 1.1
// Project: https://github.com/jshttp/media-typer
// Definitions by: BendingBender <https://github.com/BendingBender>
//                 Piotr Błażejewicz <https://github.com/peterblazejewicz>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/**
 * Simple RFC 6838 media type parser.
 * This module will parse a given media type into its component parts, like type, subtype, and suffix.
 * A formatter is also provided to put them back together and the two can be combined to normalize media types into a canonical form.
 * If you are looking to parse the string that represents a media type and its parameters in HTTP (for example, the Content-Type header), use the content-type module
 */

export interface MediaType {
  /**
   * The type of the media type (always lower case). Example: `image`
   */
  type: string;
  /**
   * The subtype of the media type (always lower case). Example: `svg`
   */
  subtype: string;
  /**
   * The suffix of the media type (always lower case). Example: `xml`
   */
  suffix?: string | undefined;
}

/**
 * RegExp to match type in RFC 6838
 *
 * type-name = restricted-name
 * subtype-name = restricted-name
 * restricted-name = restricted-name-first *126restricted-name-chars
 * restricted-name-first  = ALPHA / DIGIT
 * restricted-name-chars  = ALPHA / DIGIT / "!" / "#" / "$" / "&" / "-" / "^" / "_"
 * restricted-name-chars =/ "." ; Characters before first dot always ; specify a facet name
 * restricted-name-chars =/ "+" ; Characters after last plus always  ; specify a structured syntax suffix
 * ALPHA =  %x41-5A / %x61-7A   ; A-Z / a-z
 * DIGIT =  %x30-39             ; 0-9
 */
const SUBTYPE_NAME_REGEXP = /^[\dA-Za-z][\w!#$&.^-]{0,126}$/;
const TYPE_NAME_REGEXP = /^[\dA-Za-z][\w!#$&^-]{0,126}$/;
const TYPE_REGEXP = /^ *([\dA-Za-z][\w!#$&^-]{0,126})\/([\dA-Za-z][\w!#$&+.^-]{0,126}) *$/;

/**
 * Module exports.
 */

exports.format = format;
exports.parse = parse;
exports.test = test;

/**
 * Format an object into a media type string.
 * This will return a string of the mime type for the given object
 * @param mediaTypeDescriptor
 * @returns
 * @throws TypeError If any of the given object values are invalid
 * @public
 */
export function format(mediaTypeDescriptor: MediaType): string {
  if (!mediaTypeDescriptor || typeof mediaTypeDescriptor !== "object") {
    throw new TypeError("argument obj is required");
  }

  const subtype = mediaTypeDescriptor.subtype;
  const suffix = mediaTypeDescriptor.suffix;
  const type = mediaTypeDescriptor.type;

  if (!type || !TYPE_NAME_REGEXP.test(type)) {
    throw new TypeError("invalid type");
  }

  if (!subtype || !SUBTYPE_NAME_REGEXP.test(subtype)) {
    throw new TypeError("invalid subtype");
  }

  // format as type/subtype
  const formatted = type + "/" + subtype;

  // append +suffix
  if (suffix) {
    if (!TYPE_NAME_REGEXP.test(suffix)) {
      throw new TypeError("invalid suffix");
    }

    return formatted + "+" + suffix;
  }

  return formatted;
}

/**
 * Validate a media type string
 * @param mediaType
 * @returns
 * @public
 */
export function test(mediaType: string): boolean {
  if (!mediaType) {
    throw new TypeError("argument string is required");
  }

  if (typeof mediaType !== "string") {
    throw new TypeError("argument string is required to be a string");
  }

  return TYPE_REGEXP.test(mediaType.toLowerCase());
}

/**
 * Parse a media type string
 * @param mediaType
 * @returns
 * @throws TypeError If the given type string is invalid
 * @public
 */
export function parse(mediaType: string): MediaType {
  if (!mediaType) {
    throw new TypeError("argument string is required");
  }

  if (typeof mediaType !== "string") {
    throw new TypeError("argument string is required to be a string");
  }

  const match = TYPE_REGEXP.exec(mediaType.toLowerCase());

  if (!match) {
    throw new TypeError("invalid media type");
  }

  const type = match[1];
  let subtype = match[2];
  let suffix;

  // suffix after last +
  const index = subtype.lastIndexOf("+");
  if (index !== -1) {
    suffix = subtype.slice(index + 1);
    subtype = subtype.slice(0, Math.max(0, index));
  }

  return { type, subtype, suffix };
}
