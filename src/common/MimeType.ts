/**
 * MIME-TYPE
 * Used to decode or encode a MIME-Type
 * Ref: https://tools.ietf.org/html/rfc6838
 */
export class MimeType {

  public static parse(mime: string) {

    const parts = mime.split(';');
    const types = parts[0].split('/');
    if (types.length !== 2) {
      throw new Error('Invalid MIME type format');
    }

    const suffix = types[1].split('+');

    const params = MimeType.mapParams(parts.slice(1));

    return new MimeType(types[0].toLocaleLowerCase(), suffix[0].toLocaleLowerCase(), suffix.length > 1 ? suffix[2].toLocaleLowerCase() : undefined, params);
  }

  private static mapParams(params: string[]): {[name: string]: string} {
    const map: { [name: string]: string } = {};
    if (params) {
      for (let pair of params) {
        pair = pair.trim();
        const p = pair.indexOf("=");
        map[pair.substring(0, p).trim().toLocaleLowerCase()] = pair.substring(p + 1).trim().replace (/(^")|("$)/g, '');
      }
    }
    return map;
  }

  /**
   * Rype-name
   */
  public type: string;

  /**
   * Subtype-name
   */
  public subtype: string;

  /**
   * Suffix
   */
  public suffix?: string;

  /**
   * Parameters accessible by their name.
   */
  public parameters?: { [name: string]: string };

  constructor(type: string, subtype: string, suffix?: string, parameters?: { [name: string]: string; }) {
    this.type = type;
    this.subtype = subtype;
    this.suffix = suffix;
    this.parameters = parameters ? parameters : {};
  }
}
