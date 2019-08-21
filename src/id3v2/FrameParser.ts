import * as initDebug from 'debug';
import * as Token from 'token-types';

import common, { StringEncoding } from '../common/Util';
import { AttachedPictureType, TextEncodingToken } from './ID3v2Token';

const debug = initDebug('music-metadata:id3v2:frame-parser');

interface IOut {
  language?: string,
  description?: string,
  text?: string,
}

interface IPicture {
  type?: string,
  description?: string;
  format?: string,
  data?: Uint8Array;
}

const defaultEnc: StringEncoding = 'iso-8859-1';

export default class FrameParser {

  public static readData(b: Buffer, type: string, major: number, includeCovers: boolean) {
    const {encoding, bom} = TextEncodingToken.get(b, 0);
    const length = b.length;
    let offset = 0;
    let output: any = []; // ToDo
    const nullTerminatorLength = FrameParser.getNullTerminatorLength(encoding);
    let fzero: number;
    const out: IOut = {};

    debug(`Parsing tag type=${type}, encoding=${encoding}, bom=${bom}`);
    switch (type !== 'TXXX' && type[0] === 'T' ? 'T*' : type) {
      case 'T*': // 4.2.1. Text information frames - details
      case 'IPLS': // v2.3: Involved people list
        const text = common.decodeString(b.slice(1), encoding).replace(/\x00+$/, '');
        switch (type) {
          case 'TMCL': // Musician credits list
          case 'TIPL': // Involved people list
          case 'IPLS': // Involved people list
            output = FrameParser.splitValue(4, text);
            output = FrameParser.functionList(output);
            break;
          case 'TRK':
          case 'TRCK':
          case 'TPOS':
            output = text;
            break;
          case 'TCOM':
          case 'TEXT':
          case 'TOLY':
          case 'TOPE':
          case 'TPE1':
          case 'TSRC':
            // id3v2.3 defines that TCOM, TEXT, TOLY, TOPE & TPE1 values are separated by /
            output = FrameParser.splitValue(major, text);
            break;
          default:
            output = major >= 4 ? FrameParser.splitValue(major, text) : [text];
        }
        break;

      case 'TXXX':
        output = FrameParser.readIdentifierAndData(b, offset + 1, length, encoding);
        output = {
          description: output.id,
          text: FrameParser.splitValue(major, common.decodeString(output.data, encoding).replace(/\x00+$/, ''))
        };
        break;

      case 'PIC':
      case 'APIC':
        if (includeCovers) {
          const pic: IPicture = {};

          offset += 1;

          switch (major) {
            case 2:
              pic.format = common.decodeString(b.slice(offset, offset + 3), encoding);
              offset += 3;
              break;
            case 3:
            case 4:
              fzero = common.findZero(b, offset, length, defaultEnc);
              pic.format = common.decodeString(b.slice(offset, fzero), defaultEnc);
              offset = fzero + 1;
              break;

            default:
              throw new Error('Warning: unexpected major versionIndex: ' + major);
          }

          pic.format = FrameParser.fixPictureMimeType(pic.format);

          pic.type = AttachedPictureType[b[offset]];
          offset += 1;

          fzero = common.findZero(b, offset, length, encoding);
          pic.description = common.decodeString(b.slice(offset, fzero), encoding);
          offset = fzero + nullTerminatorLength;

          pic.data = Buffer.from(b.slice(offset, length));
          output = pic;
        }
        break;

      case 'CNT':
      case 'PCNT':
        output = Token.UINT32_BE.get(b, 0);
        break;

      case 'SYLT':
        // skip text encoding (1 byte),
        //      language (3 bytes),
        //      time stamp format (1 byte),
        //      content tagTypes (1 byte),
        //      content descriptor (1 byte)
        offset += 7;

        output = [];
        while (offset < length) {
          const txt = b.slice(offset, offset = common.findZero(b, offset, length, encoding));
          offset += 5; // push offset forward one +  4 byte timestamp
          output.push(common.decodeString(txt, encoding));
        }
        break;

      case 'ULT':
      case 'USLT':
      case 'COM':
      case 'COMM':

        offset += 1;

        out.language = common.decodeString(b.slice(offset, offset + 3), defaultEnc);
        offset += 3;

        fzero = common.findZero(b, offset, length, encoding);
        out.description = common.decodeString(b.slice(offset, fzero), encoding);
        offset = fzero + nullTerminatorLength;

        out.text = common.decodeString(b.slice(offset, length), encoding).replace(/\x00+$/, '');

        output = [out];
        break;

      case 'UFID':
        output = FrameParser.readIdentifierAndData(b, offset, length, defaultEnc);
        output = {owner_identifier: output.id, identifier: output.data};
        break;

      case 'PRIV': // private frame
        output = FrameParser.readIdentifierAndData(b, offset, length, defaultEnc);
        output = {owner_identifier: output.id, data: output.data};
        break;

      case 'POPM': // Popularimeter
        fzero = common.findZero(b, offset, length, defaultEnc);
        const email = common.decodeString(b.slice(offset, fzero), defaultEnc);
        offset = fzero + 1;
        const dataLen = length - offset;
        output = {
          email,
          rating: b.readUInt8(offset),
          counter: dataLen >= 5 ? b.readUInt32BE(offset + 1) : undefined
        };
        break;

      case 'GEOB': {  // General encapsulated object
          fzero = common.findZero(b, offset + 1, length, encoding);
          const mimeType = common.decodeString(b.slice(offset + 1, fzero), defaultEnc);
          offset = fzero + 1;
          fzero = common.findZero(b, offset, length - offset, encoding);
          const filename = common.decodeString(b.slice(offset + 1, fzero), defaultEnc);
          offset = fzero + 1;
          fzero = common.findZero(b, offset, length - offset, encoding);
          const description = common.decodeString(b.slice(offset + 1, fzero), defaultEnc);
          output = {
            type: mimeType,
            filename,
            description,
            data: b.slice(offset + 1, length)
          };
          break;
        }

      // W-Frames:
      case 'WCOM':
      case 'WCOP':
      case 'WOAF':
      case 'WOAR':
      case 'WOAS':
      case 'WORS':
      case 'WPAY':
      case 'WPUB':
        // Decode URL
        output = common.decodeString(b.slice(offset, fzero), encoding);
        break;

      case 'WXXX': {
          // Decode URL
          fzero = common.findZero(b, offset + 1, length, encoding);
          const description = common.decodeString(b.slice(offset + 1, fzero), defaultEnc);
          offset = fzero + 1;
          output = {description, url: common.decodeString(b.slice(offset, length - offset), encoding)};
          break;
        }

      case 'MCDI': {
        // Music CD identifier
        output = b.slice(0, length);
        break;
      }

      default:
        debug('Warning: unsupported id3v2-tag-type: ' + type);
        break;
    }

    return output;
  }

  protected static fixPictureMimeType(pictureType: string): string {
    pictureType = pictureType.toLocaleLowerCase();
    switch (pictureType) {
      case 'jpg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
    }
    return pictureType;
  }

  /**
   * Converts TMCL (Musician credits list) or TIPL (Involved people list)
   * @param entries
   */
  private static functionList(entries: string[]): { [index: string]: string[] } {
    const res: { [index: string]: string[] } = {};
    for (let i = 0; i + 1 < entries.length; i += 2) {
      const names: string[] = entries[i + 1].split(',');
      res[entries[i]] = res.hasOwnProperty(entries[i]) ? res[entries[i]].concat(names) : names;
    }
    return res;
  }

  /**
   * id3v2.4 defines that multiple T* values are separated by 0x00
   * id3v2.3 defines that TCOM, TEXT, TOLY, TOPE & TPE1 values are separated by /
   * @param {number} major Major version, e.g. (4) for  id3v2.4
   * @param {string} text Concatenated tag value
   * @returns {string[]} Slitted value
   */
  private static splitValue(major: number, text: string) {
    const values = text.split(major >= 4 ? /\x00/g : /\//g);
    return FrameParser.trimArray(values);
  }

  private static trimArray(values: string[]): string[] {
    for (let i = 0; i < values.length; ++i) {
      values[i] = values[i].replace(/\x00+$/, '').trim();
    }
    return values;
  }

  private static readIdentifierAndData(b: Buffer, offset: number, length: number, encoding: StringEncoding): { id: string, data: Uint8Array } {
    const fzero = common.findZero(b, offset, length, encoding);

    const id = common.decodeString(b.slice(offset, fzero), encoding);
    offset = fzero + FrameParser.getNullTerminatorLength(encoding);

    return {id, data: b.slice(offset, length)};
  }

  private static getNullTerminatorLength(enc) {
    switch (enc) {
      case 'utf16':
        return 2;
      default:
        return 1;
    }
  }

}
