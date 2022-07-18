export interface ParsedMediaType {
  type: string;
  parameters: Record<string, string>;
}

export interface MediaType {
  type: string;
  parameters?: Record<string, string> | undefined;
}

export interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

export interface ResponseLike {
  getHeader(name: string): number | string | string[] | undefined;
}

/**
 * RegExp to match *( ";" parameter ) in RFC 7231 sec 3.1.1.1
 *
 * parameter     = token "=" ( token / quoted-string )
 * token         = 1*tchar
 * tchar         = "!" / "#" / "$" / "%" / "&" / "'" / "*" / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~" / DIGIT / ALPHA ; any VCHAR, except delimiters
 * quoted-string = DQUOTE *( qdtext / quoted-pair ) DQUOTE
 * qdtext        = HTAB / SP / %x21 / %x23-5B / %x5D-7E / obs-text
 * obs-text      = %x80-FF
 * quoted-pair   = "\" ( HTAB / SP / VCHAR / obs-text )
 */
const PARAM_REGEXP =
  /; *([\w!#$%&'*+.^`|~-]+) *= *("(?:[\u000B !\u0023-\u005B\u005D-\u007E\u0080-\u00FF]|\\[\u000B\u0020-\u00FF])*"|[\w!#$%&'*+.^`|~-]+) */g; // eslint-disable-line no-control-regex
const TEXT_REGEXP = /^[\u000B\u0020-\u007E\u0080-\u00FF]+$/; // eslint-disable-line no-control-regex
const TOKEN_REGEXP = /^[\w!#$%&'*+.^`|~-]+$/;

/**
 * RegExp to match quoted-pair in RFC 7230 sec 3.2.6
 *
 * quoted-pair = "\" ( HTAB / SP / VCHAR / obs-text )
 * obs-text    = %x80-FF
 */
const QESC_REGEXP = /\\([\u000B\u0020-\u00FF])/g; // eslint-disable-line no-control-regex

/**
 * RegExp to match chars that must be quoted-pair in RFC 7230 sec 3.2.6
 */
const QUOTE_REGEXP = /(["\\])/g;

/**
 * RegExp to match type in RFC 7231 sec 3.1.1.1
 *
 * media-type = type "/" subtype
 * type       = token
 * subtype    = token
 */
const TYPE_REGEXP = /^[\w!#$%&'*+.^`|~-]+\/[\w!#$%&'*+.^`|~-]+$/;

/**
 * Module exports.
 * @public
 */

/**
 * Format object to media type.
 * @param obj
 * @returns
 * @public
 */
export function format(obj: MediaType): string {
  if (!obj || typeof obj !== "object") {
    throw new TypeError("argument obj is required");
  }

  const parameters = obj.parameters;
  const type = obj.type;

  if (!type || !TYPE_REGEXP.test(type)) {
    throw new TypeError("invalid type");
  }

  let formatted = type;

  // append parameters
  if (parameters && typeof parameters === "object") {
    const params = Object.keys(parameters).sort();

    for (const param of params) {
      if (!TOKEN_REGEXP.test(param)) {
        throw new TypeError("invalid parameter name");
      }

      formatted += "; " + param + "=" + qstring(parameters[param]);
    }
  }

  return formatted;
}

/**
 * Parse media type to object.
 * @param contentString
 * @returns
 * @public
 */
export function parse(contentString: RequestLike | ResponseLike | string): ParsedMediaType {
  if (!contentString) {
    throw new TypeError("argument string is required");
  }

  // support req/res-like objects as argument
  const header = typeof contentString === "object" ? getcontenttype(contentString) : contentString;

  if (typeof header !== "string") {
    throw new TypeError("argument string is required to be a string");
  }

  let index = header.indexOf(";");
  const type = index !== -1 ? header.slice(0, Math.max(0, index)).trim() : header.trim();

  if (!TYPE_REGEXP.test(type)) {
    throw new TypeError("invalid media type");
  }

  const obj: ParsedMediaType = {
    type: type.toLowerCase(),
    parameters: Object.create(null),
  };

  // parse parameters
  if (index !== -1) {
    let key;
    let match;
    let value;

    PARAM_REGEXP.lastIndex = index;

    while ((match = PARAM_REGEXP.exec(header))) {
      if (match.index !== index) {
        throw new TypeError("invalid parameter format");
      }

      index += match[0].length;
      key = match[1].toLowerCase();
      value = match[2];

      if (value.startsWith('"')) {
        // remove quotes and escapes
        value = value.slice(1, 1 + value.length - 2).replace(QESC_REGEXP, "$1");
      }

      obj.parameters[key] = value;
    }

    if (index !== header.length) {
      throw new TypeError("invalid parameter format");
    }
  }

  return obj;
}

/**
 * Get content-type from req/res objects.
 * @param obj
 * @returns
 * @private
 */
function getcontenttype(obj: RequestLike | ResponseLike) {
  let header;

  if ("getHeader" in obj && typeof obj.getHeader === "function") {
    // res-like
    header = obj.getHeader("content-type");
  } else if ("headers" in obj && typeof obj.headers === "object") {
    // req-like
    header = obj.headers?.["content-type"];
  }

  if (typeof header !== "string") {
    throw new TypeError("content-type header is missing from object");
  }

  return header;
}

/**
 * Quote a string if necessary.
 * @param val
 * @returns
 * @private
 */
function qstring(val: string) {
  const str = String(val);

  // no need to quote tokens
  if (TOKEN_REGEXP.test(str)) {
    return str;
  }

  if (str.length > 0 && !TEXT_REGEXP.test(str)) {
    throw new TypeError("invalid parameter value");
  }

  return '"' + str.replace(QUOTE_REGEXP, "\\$1") + '"';
}
