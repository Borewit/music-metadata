import {Promise} from "es6-promise";
import * as Token from "token-types";
import * as AtomToken from "./AtomToken";
import {Genres} from "../id3v1/ID3v1Parser";
import util from "../common/Util";

import * as _debug from "debug";
import {BasicParser} from "../common/BasicParser";
const debug = _debug("music-metadata:parser:MP4");

const tagFormat =  'iTunes MP4';

/*
 * Parser for: MPEG-4 Audio / MPEG-4 Part 3 (m4a/mp4) extension
 * Support for Apple iTunes MP4 tags as found in a M4A/MP4 file
 * Ref:
 *   http://developer.apple.com/mac/library/documentation/QuickTime/QTFF/Metadata/Metadata.html
 *   http://atomicparsley.sourceforge.net/mpeg-4files.html
 */
export class MP4Parser extends BasicParser {

  private static read_BE_Signed_Integer(value: Buffer): number {
    return util.readIntBE(value, 0, value.length);
  }

  private static read_BE_Unsigned_Integer(value: Buffer): number {
    return util.readUIntBE(value, 0, value.length);
  }

  public parse(): Promise<void> {

    this.metadata.setFormat('dataformat', 'MPEG-4 audio');

    return this.parseAtom([], this.tokenizer.fileSize);
  }

  public parseAtom(parent: string[], size: number): Promise<void> {

    // Parse atom header
    const offset = this.tokenizer.position;
    // debug("Reading next token on offset=%s...", offset); //  buf.toString('ascii')
    return this.tokenizer.readToken<AtomToken.IAtomHeader>(AtomToken.Header)
      .then(header => {
        debug("parse atom name=%s, len=%s on offset=%s", parent.concat([header.name]).join('/'), header.length, offset); //  buf.toString('ascii')
        return this.parseAtomData(header, parent).then(() => {
          size -= header.length;
          if (size > 0) {
            return this.parseAtom(parent, size);
          }
        });
      });
  }

  private parseAtomData(header: AtomToken.IAtomHeader, parent: string[]): Promise<void> {
    const dataLen = header.length - 8;
    switch (header.name) {
      case "ftyp":
        return this.parseAtom_ftyp(dataLen).then(() => null);

      // "Container" atoms, contain nested atoms: 'moov', 'udta', 'meta', 'ilst', 'trak', 'mdia'
      case "moov": // The Movie Atom: contains other atoms
      case "udta": // User defined atom
      case "trak":
      case "mdia": // Media atom
      case "minf": // Media Information Atom
      case "stbl": // Media Information Atom
        return this.parseAtom(parent.concat([header.name]), dataLen);

      case "meta": // Metadata Atom, ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW8
        return this.tokenizer.readToken<void>(new Token.IgnoreType(4))
          .then(() => {
            return this.parseMetaAtom(parent.concat([header.name]), dataLen - 4);
          }); // meta has 4 bytes of padding, ignore

     case "mdhd": // Media header atom
        return this.parseAtom_mdhd(dataLen);

      case "mvhd": // 'movie' => 'mvhd': movie header atom; child of Movie Atom
        return this.parseAtom_mvhd(dataLen);

      case "tkhd":
        return this.tokenizer.readToken<AtomToken.ITrackHeaderAtom>(new AtomToken.TrackHeaderAtom(dataLen))
          .then(tkhd => {
            debug("Ignore: name=%s, len=%s", parent.concat([header.name]).join('/'), header.length); //  buf.toString('ascii')
          });

      case "mdat":
        return this.tokenizer.readToken<Buffer>(new Token.IgnoreType(dataLen))
          .then(buf => {
            debug("Ignore payload data in %s of length=%s", parent.concat([header.name]).join('/'), dataLen); //  buf.toString('ascii')
          });

      default:
        return this.tokenizer.readToken<Buffer>(new Token.IgnoreType(dataLen))
          .then(() => {
            debug("Ignore: name=%s, len=%s", parent.concat([header.name]).join('/'), header.length); //  buf.toString('ascii')
          });
    }
  }

  private addTag(id: string, value: any) {
    this.metadata.addTag(tagFormat, id, value);
  }

  /**
   * Parse Metadata Atom (meta), ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW8
   * @param {string[]} parent Parent Atoms
   * @param {number} size Remaining meta atom size
   * @returns {Promise<void>}
   */
  private parseMetaAtom(parent: string[], size: number): Promise<void> {

    // Parse atom header
    return this.tokenizer.readToken<AtomToken.IAtomHeader>(AtomToken.Header)
      .then(header => {
        debug("parse atom name=%s, len=%s on offset=%s", parent.concat([header.name]).join('/'), header.length, this.tokenizer.position); //  buf.toString('ascii')
        return this.parseMetaAtomData(header, parent).then(() => {
          size -= header.length;
          if (size > 0) {
            return this.parseMetaAtom(parent, size);
          }
        });
      });
  }

  private parseMetaAtomData(header: AtomToken.IAtomHeader, parent: string[]): Promise<void> {
    const dataLen = header.length - 8;
    switch (header.name) {
      case "ilst": // 'meta' => 'ilst': Metadata Item List Atom
      case "<id>": // 'meta' => 'ilst' => '<id>': metadata item atom
        // Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW24
        return this.parseMetadataItemList(dataLen);

      default: // If the Atom explicitly ignored, and not a meta-data-item-data, it will likely cause a crash
        return this.parseMetadataItemData(header.name, dataLen);

      case "free":
      case "hdlr": // Handler Reference Atoms, https://developer.apple.com/library/content/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-BBCIBHFD
        return this.tokenizer.readToken<Buffer>(new Token.IgnoreType(dataLen))
          .then(() => {
            debug("Ignore: name=%s, len=%s", parent.concat([header.name]).join('/'), header.length); //  buf.toString('ascii')
          });
    }
  }

  private parseAtom_ftyp(len: number): Promise<string[]> {
    return this.tokenizer.readToken<AtomToken.IAtomFtyp>(AtomToken.ftyp).then(ftype => {
      len -= AtomToken.ftyp.len;
      if (len > 0) {
        return this.parseAtom_ftyp(len).then(types => {
          types.push(ftype.type);
          return types;
        });
      }
      return [];
    });
  }

  /**
   * Parse movie header (mvhd) atom
   * @param len
   */
  private parseAtom_mvhd(len: number): Promise<void> {
    return this.tokenizer.readToken<AtomToken.IAtomMvhd>(new AtomToken.MvhdAtom(len)).then(mvhd => {
      this.parse_mxhd(mvhd);
    });
  }

  /**
   * Parse media header (mdhd) atom
   * @param len
   */
  private parseAtom_mdhd(len: number): Promise<void> {
    return this.tokenizer.readToken<AtomToken.IAtomMdhd>(new AtomToken.MdhdAtom(len)).then(mdhd => {
      this.parse_mxhd(mdhd);
    });
  }

  private parse_mxhd(mxhd: AtomToken.IAtomMxhd) {
    this.metadata.setFormat('sampleRate', mxhd.timeScale);
    this.metadata.setFormat('duration', mxhd.duration / mxhd.timeScale); // calculate duration in seconds
  }

  /**
   * Parse Meta-item-list-atom (item of 'ilst' atom)
   * @param len
   * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW8
   */
  private parseMetadataItemList(len: number): Promise<void> {
    // Parse atom header
    return this.tokenizer.readToken<AtomToken.IAtomHeader>(AtomToken.Header).then(header => {
      debug("metadata-item: name=%s, len=%s", header.name, header.length);
      return this.parseMetadataItemData(header.name, header.length - AtomToken.Header.len).then(() => {
        const remaining = len - AtomToken.Header.len - header.length;
        if (remaining > 0) {
          return this.parseMetadataItemList(remaining);
        } else
          return;
      });
    });
  }

  private parseMetadataItemData(tagKey: string, remLen: number): Promise<void> {
    // Parse Meta Item List Atom
    return this.tokenizer.readToken<AtomToken.IAtomHeader>(AtomToken.Header).then(header => {
      const dataLen = header.length - AtomToken.Header.len;
      switch (header.name) {
        case "data": // value atom
          return this.parseValueAtom(tagKey, header);
        case "name": // name atom (optional)
          return this.tokenizer.readToken<AtomToken.INameAtom>(new AtomToken.NameAtom(dataLen)).then(name => {
            tagKey += ":" + name.name;
            return header.length;
          });
        case "mean": // name atom (optional)
          return this.tokenizer.readToken<AtomToken.INameAtom>(new AtomToken.NameAtom(dataLen)).then(mean => {
            // console.log("  %s[%s] = %s", tagKey, header.name, mean.name);
            tagKey += ":" + mean.name;
            return header.length;
          });
        default:
          return this.tokenizer.readToken<Buffer>(new Token.BufferType(dataLen)).then(dataAtom => {
            debug("Unsupported meta-item: %s[%s] => value=%s ascii=%s", tagKey, header.name, dataAtom.toString("hex"), dataAtom.toString("ascii"));
            this.warnings.push("unsupported meta-item: " + tagKey + "[" + header.name + "] => value=" + dataAtom.toString("hex") + " ascii=" + dataAtom.toString("ascii"));
            return header.length;
          });
      }
    }).then(len => {
      const remaining = remLen - len;
      if (remaining === 0) {
        return;
      } else {
        return this.parseMetadataItemData(tagKey, remaining);
      }
    });
  }

  private parseValueAtom(tagKey: string, header: AtomToken.IAtomHeader): Promise<number> {
    return this.tokenizer.readToken(new AtomToken.DataAtom(header.length - AtomToken.Header.len)).then(dataAtom => {

      if (dataAtom.type.set !== 0) {
        throw new Error("Unsupported type-set != 0: " + dataAtom.type.set);
      }

      // Use well-known-type table
      // Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW35
      switch (dataAtom.type.type) { // ToDo?: use enum

        case 0: // reserved: Reserved for use where no type needs to be indicated
          switch (tagKey) {
            case "trkn":
            case "disk":
              const num = Token.UINT8.get(dataAtom.value, 3);
              const of = Token.UINT8.get(dataAtom.value, 5);
              // console.log("  %s[data] = %s/%s", tagKey, num, of);
              this.addTag(tagKey, num + "/" + of);
              break;

            case "gnre":
              const genreInt = Token.UINT8.get(dataAtom.value, 1);
              const genreStr = Genres[genreInt - 1];
              // console.log("  %s[data] = %s", tagKey, genreStr);
              this.addTag(tagKey, genreStr);
              break;

            default:
            // console.log("  reserved-data: name=%s, len=%s, set=%s, type=%s, locale=%s, value{ hex=%s, ascii=%s }",
            // header.name, header.length, dataAtom.type.set, dataAtom.type.type, dataAtom.locale, dataAtom.value.toString('hex'), dataAtom.value.toString('ascii'));
          }
          break;

        case 1: // UTF-8: Without any count or NULL terminator
          this.addTag(tagKey, dataAtom.value.toString("utf-8"));
          break;

        case 13: // JPEG
          if (this.options.skipCovers)
            break;
          this.addTag(tagKey, {
              format: "image/jpeg",
              data: Buffer.from(dataAtom.value)
            });
          break;

        case 14: // PNG
          if (this.options.skipCovers)
            break;
          this.addTag(tagKey, {
              format: "image/png",
              data: Buffer.from(dataAtom.value)
            });
          break;

        case 21: // BE Signed Integer
          this.addTag(tagKey, MP4Parser.read_BE_Signed_Integer(dataAtom.value));
          break;

        case 22: // BE Unsigned Integer
          this.addTag(tagKey, MP4Parser.read_BE_Unsigned_Integer(dataAtom.value));
          break;

        case 65: // An 8-bit signed integer
          this.addTag(tagKey, dataAtom.value.readInt8(0));
          break;

        case 66: // A big-endian 16-bit signed integer
          this.addTag(tagKey, dataAtom.value.readInt16BE(0));
          break;

        case 67: // A big-endian 32-bit signed integer
          this.addTag(tagKey, dataAtom.value.readInt32BE(0));
          break;

        default:
          throw new Error("Unsupported well-known-type: " + dataAtom.type.type);
      }

      return header.length;
    });
  }

}
