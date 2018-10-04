import * as initDebug from 'debug';
import * as Token from 'token-types';

import {BasicParser} from '../common/BasicParser';
import {Atom} from './Atom';
import * as AtomToken from './AtomToken';
import {Genres} from '../id3v1/ID3v1Parser';
import util from '../common/Util';

const debug = initDebug('music-metadata:parser:MP4');
const tagFormat = 'iTunes';

/*
 * Parser for: MPEG-4 Audio / Part 3 (.m4a)& MPEG 4 Video (m4v, mp4) extension.
 * Support for Apple iTunes tags as found in a M4A/M4V files.
 * Ref:
 *   https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/Metadata/Metadata.html
 *   http://atomicparsley.sourceforge.net/mpeg-4files.html
 *   https://github.com/sergiomb2/libmp4v2/wiki/iTunesMetadata
 */
export class MP4Parser extends BasicParser {

  private static read_BE_Signed_Integer(value: Buffer): number {
    return Token.readIntBE(value, 0, value.length);
  }

  private static read_BE_Unsigned_Integer(value: Buffer): number {
    return Token.readUIntBE(value, 0, value.length);
  }

  public parse(): Promise<void> {

    this.metadata.setFormat('dataformat', 'MPEG-4');

    const rootAtom = new Atom({name: 'mp4', length: this.tokenizer.fileSize}, false, null);
    return rootAtom.readAtoms(this.tokenizer, atom => {

      if (atom.parent) {
        switch (atom.parent.header.name) {
          case 'ilst':
          case '<id>':
            return this.parseMetadataItemData(atom).then(null);
        }
      }

      switch (atom.header.name) {

        case "ftyp":
          return this.parseAtom_ftyp(atom.dataLen).then(types => {
            debug('ftyp: ' + types.join('/'));
          });

        case 'mdhd': // Media header atom
          return this.parseAtom_mdhd(atom);

        case 'mvhd': // 'movie' => 'mvhd': movie header atom; child of Movie Atom
          return this.parseAtom_mvhd(atom);
      }

      return this.tokenizer.readToken<Buffer>(new Token.IgnoreType(atom.dataLen))
        .then(() => {
          debug("Ignore atom data: path=%s, payload-len=%s", atom.atomPath, atom.dataLen);
        });

    }, this.tokenizer.fileSize);
  }

  private addTag(id: string, value: any) {
    this.metadata.addTag(tagFormat, id, value);
  }

  private addWarning(message: string) {
    debug('Warning:' + message);
    this.warnings.push(message);
  }

  /**
   * Parse data of Meta-item-list-atom (item of 'ilst' atom)
   * @param metaAtom
   * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW8
   */
  private parseMetadataItemData(metaAtom: Atom): Promise<void> {

    let tagKey = metaAtom.header.name;

    return metaAtom.readAtoms(this.tokenizer, child => {
      switch (child.header.name) {
        case "data": // value atom
          return this.parseValueAtom(tagKey, child);
        case "name": // name atom (optional)
          return this.tokenizer.readToken<AtomToken.INameAtom>(new AtomToken.NameAtom(child.dataLen)).then(name => {
            tagKey += ":" + name.name;
          });
        case "mean": // name atom (optional)
          return this.tokenizer.readToken<AtomToken.INameAtom>(new AtomToken.NameAtom(child.dataLen)).then(mean => {
            // console.log("  %s[%s] = %s", tagKey, header.name, mean.name);
            tagKey += ":" + mean.name;
          });
        default:
          return this.tokenizer.readToken<Buffer>(new Token.BufferType(child.dataLen)).then(dataAtom => {
            this.addWarning("Unsupported meta-item: " + tagKey + "[" + child.header.name + "] => value=" + dataAtom.toString("hex") + " ascii=" + dataAtom.toString("ascii"));
          });
      }

    }, metaAtom.dataLen);
  }

  private parseValueAtom(tagKey: string, metaAtom: Atom): Promise<void> {
    return this.tokenizer.readToken(new AtomToken.DataAtom(metaAtom.header.length - AtomToken.Header.len)).then(dataAtom => {

      if (dataAtom.type.set !== 0) {
        throw new Error("Unsupported type-set != 0: " + dataAtom.type.set);
      }

      // Use well-known-type table
      // Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW35
      switch (dataAtom.type.type) {

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
        case 18: // Unknown: Found in m4b in combination with a '©gen' tag
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
          this.addWarning(`atom key=${tagKey}, has unknown well-known-type (data-type): ${dataAtom.type.type}`);
      }
    });
  }

  /**
   * Parse movie header (mvhd) atom
   * @param mvhd mvhd atom
   */
  private parseAtom_mvhd(mvhd: Atom): Promise<void> {
    return this.tokenizer.readToken<AtomToken.IAtomMvhd>(new AtomToken.MvhdAtom(mvhd.dataLen)).then(mvhd_data => {
      this.parse_mxhd(mvhd_data);
    });
  }

  /**
   * Parse media header (mdhd) atom
   * @param mdhd mdhd atom
   */
  private parseAtom_mdhd(mdhd: Atom): Promise<void> {
    return this.tokenizer.readToken<AtomToken.IAtomMdhd>(new AtomToken.MdhdAtom(mdhd.dataLen))
      .then(mdhd_data => {
        this.parse_mxhd(mdhd_data);
      });
  }

  private parse_mxhd(mxhd: AtomToken.IAtomMxhd) {
    this.metadata.setFormat('sampleRate', mxhd.timeScale);
    this.metadata.setFormat('duration', mxhd.duration / mxhd.timeScale); // calculate duration in seconds
  }

  private parseAtom_ftyp(len: number): Promise<string[]> {
    return this.tokenizer.readToken<AtomToken.IAtomFtyp>(AtomToken.ftyp).then(ftype => {
      len -= AtomToken.ftyp.len;
      if (len > 0) {
        return this.parseAtom_ftyp(len).then(types => {
          const value = util.stripNulls(ftype.type).trim();
          if (value.length > 0) {
            types.push(value);
          }
          return types;
        });
      }
      return [];
    });
  }
}
