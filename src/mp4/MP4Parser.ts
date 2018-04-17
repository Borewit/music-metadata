import {ITokenParser} from "../ParserFactory";
import {INativeAudioMetadata, ITag, IFormat, IOptions} from "../";
import {ITokenizer} from "strtok3";
import {Promise} from "es6-promise";
import * as Token from "token-types";
import {Genres} from "../id3v1/ID3v1Parser";
import {FourCcToken} from "../common/FourCC";

import * as _debug from "debug";

const debug = _debug("music-metadata:parser:MP4");

interface IAtomHeader {
  length: number,
  name: string
}

interface IAtomFtyp {
  type: string
}

/**
 * Common interface for the mvhd (Movie Header) & mdhd (Media) atom
 */
interface IAtomMxhd {

  /**
   * A 1-byte specification of the version of this movie header atom.
   */
  version: number,

  /**
   * Three bytes of space for future movie header flags.
   */
  flags: number,

  /**
   * A 32-bit integer that specifies (in seconds since midnight, January 1, 1904) when the media atom was created.
   * It is strongly recommended that this value should be specified using coordinated universal time (UTC).
   */
  creationTime: number,

  /**
   * A 32-bit integer that specifies (in seconds since midnight, January 1, 1904) when the media atom was changed.
   * It is strongly recommended that this value should be specified using coordinated universal time (UTC).
   */
  modificationTime: number,

  /**
   * A time value that indicates the time scale for this media—that is, the number of time units that pass per second in its time coordinate system.
   */
  timeScale: number,

  /**
   * Duration: the duration of this media in units of its time scale.
   */
  duration: number,
}

interface IAtomMdhd extends IAtomMxhd {
  /**
   * A 16-bit integer that specifies the language code for this media.
   * See Language Code Values for valid language codes.
   * Also see Extended Language Tag Atom for the preferred code to use here if an extended language tag is also included in the media atom.
   * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/QTFFChap4/qtff4.html#//apple_ref/doc/uid/TP40000939-CH206-34353
   */
  language: number,

  quality: number
}

/**
 * Interface for the parsed Movie Header Atom (mvhd)
 */
interface IAtomMvhd extends IAtomMxhd {

  /**
   * Preferred rate: a 32-bit fixed-point number that specifies the rate at which to play this movie.
   * A value of 1.0 indicates normal rate.
   */
  preferredRate: number,

  /**
   * Preferred volume: A 16-bit fixed-point number that specifies how loud to play this movie’s sound.
   * A value of 1.0 indicates full volume.
   */
  preferredVolume: number,

  /**
   * Reserved: Ten bytes reserved for use by Apple. Set to 0.
   */
  // reserved: number,

  /**
   *  Matrix structure: The matrix structure associated with this movie.
   *  A matrix shows how to map points from one coordinate space into another.
   *  See Matrices for a discussion of how display matrices are used in QuickTime.
   */
  // matrixStructure: ???;

  /**
   * Preview time: The time value in the movie at which the preview begins.
   */
  previewTime: number,

  /**
   * Preview duration: The duration of the movie preview in movie time scale units.
   */
  previewDuration: number;

  /**
   * Poster time: The time value of the time of the movie poster.
   */
  posterTime: number,

  /**
   * selection time: The time value for the start time of the current selection.
   */
  selectionTime: number,

  /**
   * Selection duration:  The duration of the current selection in movie time scale units.
   */
  selectionDuration: number,

  /**
   * Current time:  The time value for current time position within the movie.
   */
  currentTime: number

  /**
   * Next track ID:  A 32-bit integer that indicates a value to use for the track ID number of the next track added to this movie. Note that 0 is not a valid track ID value.
   */
  nextTrackID: number
}

/**
 * Interface for the metadata header atom: 'mhdr'
 * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW13
 */
interface IMovieHeaderAtom {

  /**
   * One byte that is set to 0.
   */
  version: number,

  /**
   * Three bytes that are set to 0.
   */
  flags: number,
  /**
   * A 32-bit unsigned integer indicating the value to use for the item ID of the next item created or assigned an item ID.
   * If the value is all ones, it indicates that future additions will require a search for an unused item ID.
   */
  nextItemID: number
}

/**
 * Interface for the parsed Media Atom (mdhd)
 */
class Atom {

  public static Header: Token.IGetToken<IAtomHeader> = {
    len: 8,

    get: (buf: Buffer, off: number): IAtomHeader => {
      const length = Token.UINT32_BE.get(buf, 0);
      if (length < 0)
        throw new Error("Invalid atom header length");

      return {
        length,
        name: FourCcToken.get(buf, off + 4)
      };
    }
  };

  public static ftyp: Token.IGetToken<IAtomFtyp> = {
    len: 4,

    get: (buf: Buffer, off: number): IAtomFtyp => {
      return {
        type: new Token.StringType(4, "ascii").get(buf, off)
      };
    }
  };

  /**
   * Token: Media Header Atom
   */
  public static mdhd: Token.IGetToken<IAtomMdhd> = {
    len: 24,

    get: (buf: Buffer, off: number): IAtomMdhd => {
      return {
        version: Token.UINT8.get(buf, off + 0),
        flags: Token.UINT24_BE.get(buf, off + 1),
        creationTime: Token.UINT32_BE.get(buf, off + 4),
        modificationTime: Token.UINT32_BE.get(buf, off + 8),
        timeScale: Token.UINT32_BE.get(buf, off + 12),
        duration: Token.UINT32_BE.get(buf, off + 16),
        language: Token.UINT16_BE.get(buf, off + 20),
        quality: Token.UINT16_BE.get(buf, off + 22)
      };
    }
  };

  /**
   * Token: Movie Header Atom
   */
  public static mvhd: Token.IGetToken<IAtomMvhd> = {
    len: 100,

    get: (buf: Buffer, off: number): IAtomMvhd => {
      return {
        version: Token.UINT8.get(buf, off + 0),
        flags: Token.UINT24_BE.get(buf, off + 1),
        creationTime: Token.UINT32_BE.get(buf, off + 4),
        modificationTime: Token.UINT32_BE.get(buf, off + 8),
        timeScale: Token.UINT32_BE.get(buf, off + 12),
        duration: Token.UINT32_BE.get(buf, off + 16),
        preferredRate: Token.UINT32_BE.get(buf, off + 20),
        preferredVolume: Token.UINT16_BE.get(buf, off + 24),
        // ignore reserver: 10 bytes
        // ignore matrix structure: 36 bytes
        previewTime: Token.UINT32_BE.get(buf, off + 72),
        previewDuration: Token.UINT32_BE.get(buf, off + 76),
        posterTime: Token.UINT32_BE.get(buf, off + 80),
        selectionTime: Token.UINT32_BE.get(buf, off + 84),
        selectionDuration: Token.UINT32_BE.get(buf, off + 88),
        currentTime: Token.UINT32_BE.get(buf, off + 92),
        nextTrackID: Token.UINT32_BE.get(buf, off + 96)
      };
    }
  };

  /**
   * Token: Movie Header Atom
   */
  public static mhdr: Token.IGetToken<IMovieHeaderAtom> = {
    len: 8,

    get: (buf: Buffer, off: number): IMovieHeaderAtom => {
      return {
        version: Token.UINT8.get(buf, off + 0),
        flags: Token.UINT24_BE.get(buf, off + 1),
        nextItemID: Token.UINT32_BE.get(buf, off + 4)
      };
    }
  };

}

/**
 * Data Atom Structure ('data')
 * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW32
 */
interface IDataAtom {
  /**
   * Type Indicator
   * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW28
   */
  type: {
    /**
     * The set of types from which the type is drawn
     * If 0, type is drawn from the well-known set of types.
     */
    set: number, // ToDo: enum?
    type: number
  },
  /**
   * Locale Indicator
   */
  locale: number,
  /**
   * An array of bytes containing the value of the metadata.
   */
  value: Buffer;
}

/**
 * Data Atom Structure
 */
class DataAtom implements Token.IGetToken<IDataAtom> {

  public constructor(public len: number) {
  }

  public get(buf: Buffer, off: number): IDataAtom {
    return {
      type: {
        set: Token.UINT8.get(buf, off + 0),
        type: Token.UINT24_BE.get(buf, off + 1)
      },
      locale: Token.UINT24_BE.get(buf, off + 4),
      value: new Token.BufferType(this.len - 8).get(buf, off + 8)
    };
  }
}

/**
 * Data Atom Structure ('data')
 * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW32
 */
interface INameAtom {

  /**
   * One byte that is set to 0.
   */
  version: number,

  /**
   * Three bytes that are set to 0.
   */
  flags: number,

  /**
   * An array of bytes containing the value of the metadata.
   */
  name: string;
}

/**
 * Data Atom Structure
 * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW31
 */
class NameAtom implements Token.IGetToken<INameAtom> {

  public constructor(public len: number) {
  }

  public get(buf: Buffer, off: number): INameAtom {
    return {
      version: Token.UINT8.get(buf, off),
      flags: Token.UINT24_BE.get(buf, off + 1),
      name: new Token.StringType(this.len - 4, "utf-8").get(buf, off + 4)
    };
  }
}

/*
 * Support for Apple iTunes MP4 tags as found in a M4A/MP4 file
 * Ref:
 *   http://developer.apple.com/mac/library/documentation/QuickTime/QTFF/Metadata/Metadata.html
 *   http://atomicparsley.sourceforge.net/mpeg-4files.html
 */
export class MP4Parser implements ITokenParser {

  private static Types: { [index: number]: string } = {
    0: "uint8",
    1: "text",
    13: "jpeg",
    14: "png",
    21: "uint8"
  };

  private static read_BE_Signed_Integer(value: Buffer): number {
    return value.readIntBE(0, value.length);
  }

  private static read_BE_Unsigned_Integer(value: Buffer): number {
    return value.readUIntBE(0, value.length);
  }

  private tokenizer: ITokenizer;
  private options: IOptions;

  private metaAtomsTotalLength = 0;

  private format: IFormat = {};
  private tags: ITag[] = [];
  private warnings: string[] = []; // ToDo: make this part of the parsing result

  public parse(tokenizer: ITokenizer, options: IOptions): Promise<INativeAudioMetadata> {
    this.tokenizer = tokenizer;
    this.options = options;

    return this.parseAtom([], this.tokenizer.fileSize).then(() => {
      return {
        format: this.format,
        native: {
          "iTunes MP4": this.tags
        }
      };
    });
  }

  public parseAtom(parent: string[], size: number): Promise<void> {

    // Parse atom header
    return this.tokenizer.readToken<IAtomHeader>(Atom.Header)
      .then(header => {
        debug("parse atom name=%s, len=%s on offset=%s", parent.concat([header.name]).join('/'), header.length, this.tokenizer.position); //  buf.toString('ascii')
        return this.parseAtomData(header, parent).then(() => {
          size -= header.length;
          if (size > 0) {
            return this.parseAtom(parent, size);
          } else {
            return;
          }
        });
      });
  }

  private parseAtomData(header: IAtomHeader, parent: string[]): Promise<void> {
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
            return this.parseAtom(parent.concat([header.name]), dataLen - 4);
          }); // meta has 4 bytes of padding, ignore

      case "ilst": // 'meta' => 'ilst': Metadata Item List Atom
        // Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW24
        return this.parseMetadataItem(dataLen);

      case "mdhd": // Media header atom
        return this.parseAtom_mdhd(dataLen);

      case "mvhd": // 'movie' => 'mvhd': movie header atom; child of Movie Atom
        return this.parseAtom_mvhd(dataLen);

      case "<id>": // 'meta' => 'ilst' => '<id>': metadata item atom
        return this.parseMetadataItem(dataLen);

      case "cmov": // compressed movie atom; child of Movie Atom
      case "rmra": // reference movie atom; child of Movie Atom

      case "©cmt":
        return this.parseMetadataItemData(header.name, dataLen);

      default:
        if (dataLen === 0) {
          return Promise.resolve(); // Avoid 0 bytes are read
        }
        return this.tokenizer.readToken<Buffer>(new Token.BufferType(dataLen))
          .then(buf => {
            debug("Ignore: name=%s, len=%s", header.name, header.length); //  buf.toString('ascii')
          });
    }
  }

  private ignoreAtomData(len: number): Promise<void> {
    return this.tokenizer.readToken<void>(new Token.IgnoreType(len));
  }

  private parseAtom_ftyp(len: number): Promise<string[]> {
    return this.tokenizer.readToken<IAtomFtyp>(Atom.ftyp).then(ftype => {
      len -= Atom.ftyp.len;
      if (len > 0) {
        return this.parseAtom_ftyp(len).then(types => {
          types.push(ftype.type);
          return types;
        });
      } else {
        return [];
      }
    });
  }

  /**
   * Parse movie header (mvhd) atom
   * @param len
   */
  private parseAtom_mvhd(len: number): Promise<void> {
    return this.tokenizer.readToken<IAtomMvhd>(Atom.mvhd).then(mvhd => {
      this.parse_mxhd(mvhd);
    });
  }

  /**
   * Parse media header (mdhd) atom
   * @param len
   */
  private parseAtom_mdhd(len: number): Promise<void> {
    return this.tokenizer.readToken<IAtomMdhd>(Atom.mdhd).then(mdhd => {
      this.parse_mxhd(mdhd);
    });
  }

  private parse_mxhd(mxhd: IAtomMxhd) {
    this.format.sampleRate = mxhd.timeScale;
    this.format.duration = mxhd.duration / mxhd.timeScale; // calculate duration in seconds
  }

  /**
   * Parse media header (ilst) atom
   * @param len
   * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW8
   */

  /*
   private parseMetadataItem(len: number): Promise<void>{
   // Parse atom header
   return this.tokenizer.readToken<IAtomHeader>(Atom.Header).then((header) => {

   return this.parseAtomData(header);
   });
   }*/

  /**
   * Parse Meta-item-list-atom (item of 'ilst' atom)
   * @param len
   * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW8
   */
  private parseMetadataItem(len: number): Promise<void> {
    // Parse atom header
    return this.tokenizer.readToken<IAtomHeader>(Atom.Header).then(header => {
      // console.log("metadata-item: name=%s, len=%s", header.name, header.length);
      return this.parseMetadataItemData(header.name, header.length - Atom.Header.len).then(() => {
        const remaining = len - Atom.Header.len - header.length;
        if (remaining > 0) {
          return this.parseMetadataItem(remaining);
        } else
          return;
      });
    });
  }

  private parseMetadataItemData(tagKey: string, remLen: number): Promise<void> {
    // Parse Meta Item List Atom
    return this.tokenizer.readToken<IAtomHeader>(Atom.Header).then(header => {
      const dataLen = header.length - Atom.Header.len;
      switch (header.name) {
        case "data": // value atom
          return this.parseValueAtom(tagKey, header);
        case "itif": // item information atom (optional)
          return this.tokenizer.readToken<Buffer>(new Token.BufferType(dataLen)).then(dataAtom => {
            // console.log("  WARNING unsupported meta-item: %s[%s] => value=%s ascii=%s", tagKey, header.name, dataAtom.toString("hex"), dataAtom.toString("ascii"));
            return header.length;
          });
        case "name": // name atom (optional)
          return this.tokenizer.readToken<INameAtom>(new NameAtom(dataLen)).then(name => {
            tagKey += ":" + name.name;
            return header.length;
          });
        case "mean": // name atom (optional)
          return this.tokenizer.readToken<INameAtom>(new NameAtom(dataLen)).then(mean => {
            // console.log("  %s[%s] = %s", tagKey, header.name, mean.name);
            tagKey += ":" + mean.name;
            return header.length;
          });
        default:
          return this.tokenizer.readToken<Buffer>(new Token.BufferType(dataLen)).then(dataAtom => {
            // console.log("  WARNING unsupported meta-item: %s[%s] => value=%s ascii=%s", tagKey, header.name, dataAtom.toString("hex"), dataAtom.toString("ascii"));
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

  private parseValueAtom(tagKey: string, header: IAtomHeader): Promise<number> {
    return this.tokenizer.readToken(new DataAtom(header.length - Atom.Header.len)).then(dataAtom => {

      if (dataAtom.type.set === 0) {
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
                this.tags.push({id: tagKey, value: num + "/" + of});
                break;

              case "gnre":
                const genreInt = Token.UINT8.get(dataAtom.value, 1);
                const genreStr = Genres[genreInt - 1];
                // console.log("  %s[data] = %s", tagKey, genreStr);
                this.tags.push({id: tagKey, value: genreStr});
                break;

              default:
              // console.log("  reserved-data: name=%s, len=%s, set=%s, type=%s, locale=%s, value{ hex=%s, ascii=%s }",
              // header.name, header.length, dataAtom.type.set, dataAtom.type.type, dataAtom.locale, dataAtom.value.toString('hex'), dataAtom.value.toString('ascii'));
            }
            break;

          case 1: // UTF-8: Without any count or NULL terminator
            this.tags.push({id: tagKey, value: dataAtom.value.toString("utf-8")});
            break;

          case 13: // JPEG
            if (this.options.skipCovers)
              break;
            this.tags.push({
              id: tagKey, value: {
                format: "image/jpeg",
                data: new Buffer(dataAtom.value)
              }
            });
            break;

          case 14: // PNG
            if (this.options.skipCovers)
              break;
            this.tags.push({
              id: tagKey, value: {
                format: "image/png",
                data: new Buffer(dataAtom.value)
              }
            });
            break;

          case 21: // BE Signed Integer
            this.tags.push({id: tagKey, value: MP4Parser.read_BE_Signed_Integer(dataAtom.value)});
            break;

          case 22: // BE Unsigned Integer
            this.tags.push({id: tagKey, value: MP4Parser.read_BE_Unsigned_Integer(dataAtom.value)});
            break;

          case 65: // An 8-bit signed integer
            this.tags.push({id: tagKey, value: dataAtom.value.readInt8(0)});
            break;

          case 66: // A big-endian 16-bit signed integer
            this.tags.push({id: tagKey, value: dataAtom.value.readInt16BE(0)});
            break;

          case 67: // A big-endian 32-bit signed integer
            this.tags.push({id: tagKey, value: dataAtom.value.readInt32BE(0)});
            break;

          default:
            throw new Error("Unsupported well-known-type: " + dataAtom.type.type);
        }
      } else {
        throw new Error("Unsupported type-set != 0: " + dataAtom.type.set);
      }

      return header.length;
    });
  }

}
