import ReadableStream = NodeJS.ReadableStream;
import * as strtok from 'strtok2';
import {isArray} from 'util';
import common from './common';
import id3v2_frames from './id3v2_frames';
import {MpegParser} from './mpeg';
import {HeaderType} from './tagmap';
import {IFileParser} from "./FileParser";
import {FileTokenizer, IGetToken, IToken} from "./FileTokenizer";
import {IAudioMetadata, ICommonTagsResult, IFormat, MusicMetadataParser} from "./index";
import {IOptions} from "../lib/src/index";
import TagMap from "../lib/tagmap";


interface IFrameFlags {
  status: {
    tag_alter_preservation: boolean,
    file_alter_preservation: boolean,
    read_only: boolean
  },
  format: {
    grouping_identity: boolean,
    compression: boolean,
    encryption: boolean,
    unsynchronisation: boolean,
    data_length_indicator: boolean
  };
}
interface IFrameHeader {
  id: string,
  length?: number;
  flags?: IFrameFlags;
}

/**
 * ID3v2 tag header
 */
interface IID3v2header {
// ID3v2/file identifier   "ID3"
  fileIdentifier: string,
  // ID3v2 versionIndex
  version: {
    major: number,
    revision: number
  },
  // ID3v2 flags
  flags: {
    // Raw flags value
    raw: number,
    // Unsynchronisation
    unsynchronisation: boolean,
    // Extended header
    isExtendedHeader: boolean
    // Experimental indicator
    expIndicator: boolean,
    footer: boolean
  };
  size: number;
}

interface IExtendedHeader {
  // Extended header size
  size: number,
  extendedFlags: number,
  // Size of padding
  sizeOfPadding: number,
  // CRC data present
  crcDataPresent: boolean;
}

class ID3v2 {

  /**
   * 28 bits (representing up to 256MB) integer, the msb is 0 to avoid 'false syncsignals'.
   * 4 * %0xxxxxxx
   */
  public static UINT32SYNCSAFE = {
    get: (buf: Buffer, off: number): number => {
      return buf[off + 3] & 0x7f | ((buf[off + 2]) << 7) |
        ((buf[off + 1]) << 14) | ((buf[off]) << 21);
    },
    len: 4
  };

  /**
   * ID3v2 header
   * Ref: http://id3.org/id3v2.3.0#ID3v2_header
   * ToDo
   */
  public static Header: IGetToken<IID3v2header> = {
    len: 10,

    get: (buf, off): IID3v2header => {
      return {
        // ID3v2/file identifier   "ID3"
        fileIdentifier: new strtok.StringType(3, 'ascii').get(buf, off),
        // ID3v2 versionIndex
        version: {
          major: strtok.INT8.get(buf, off + 3),
          revision: strtok.INT8.get(buf, off + 4)
        },
        // ID3v2 flags
        flags: {
          // Raw flags value
          raw: strtok.INT8.get(buf, off + 4),
          // Unsynchronisation
          unsynchronisation: common.strtokBITSET.get(buf, off + 5, 7),
          // Extended header
          isExtendedHeader: common.strtokBITSET.get(buf, off + 5, 6),
          // Experimental indicator
          expIndicator: common.strtokBITSET.get(buf, off + 5, 5),
          footer: common.strtokBITSET.get(buf, off + 5, 4)
        },
        size: ID3v2.UINT32SYNCSAFE.get(buf, off + 6)
      };
    }
  };

  public static ExtendedHeader: IGetToken<IExtendedHeader> = {
    len: 10,

    get: (buf, off): IExtendedHeader => {
      return {
        // Extended header size
        size: strtok.UINT32_BE.get(buf, off),
        // Extended Flags
        extendedFlags: strtok.UINT16_BE.get(buf, off + 4),
        // Size of padding
        sizeOfPadding: strtok.UINT32_BE.get(buf, off + 6),
        // CRC data present
        crcDataPresent: common.strtokBITSET.get(buf, off + 4, 31)
      };
    }
  };
}

class Id3v2Parser implements IFileParser {

  public static getInstance(): Id3v2Parser {
    return new Id3v2Parser();
  }

  private static readFrameHeader(v, majorVer): IFrameHeader {
    let header: IFrameHeader;
    switch (majorVer) {

      case 2:
        header = {
          id: v.toString('ascii', 0, 3),
          length: common.strtokUINT24_BE.get(v, 3)
        };
        break;

      case 3:
        header = {
          id: v.toString('ascii', 0, 4),
          length: strtok.UINT32_BE.get(v, 4),
          flags: Id3v2Parser.readFrameFlags(v.slice(8, 10))
        };
        break;

      case 4:
        header = {
          id: v.toString('ascii', 0, 4),
          length: ID3v2.UINT32SYNCSAFE.get(v, 4),
          flags: Id3v2Parser.readFrameFlags(v.slice(8, 10))
        };
        break;

      default:
        throw new Error('Unexpected majorVer: ' + majorVer);
    }
    return header;
  }

  private static getFrameHeaderLength(majorVer: number): number {
    switch (majorVer) {
      case 2:
        return 6;
      case 3:
      case 4:
        return 10;
      default:
        throw new Error('header versionIndex is incorrect');
    }
  }

  private static readFrameFlags(b: Buffer): IFrameFlags {
    return {
      status: {
        tag_alter_preservation: common.strtokBITSET.get(b, 0, 6),
        file_alter_preservation: common.strtokBITSET.get(b, 0, 5),
        read_only: common.strtokBITSET.get(b, 0, 4)
      },
      format: {
        grouping_identity: common.strtokBITSET.get(b, 1, 7),
        compression: common.strtokBITSET.get(b, 1, 3),
        encryption: common.strtokBITSET.get(b, 1, 2),
        unsynchronisation: common.strtokBITSET.get(b, 1, 1),
        data_length_indicator: common.strtokBITSET.get(b, 1, 0)
      }
    };
  }

  private fileTokenizer: FileTokenizer;
  private id3Header: IID3v2header;

  private tags: { id: string, value: any }[] = [];
  private headerType: HeaderType;
  private options: IOptions;

  public parse(fileTokenizer: FileTokenizer, options: IOptions): Promise<IAudioMetadata> {

    this.fileTokenizer = fileTokenizer;
    this.options = options;

    return this.fileTokenizer.readToken(ID3v2.Header).then((id3Header) => {

      if (id3Header.fileIdentifier !== 'ID3') {
        throw new Error("expected file identifier 'ID3' not found");
      }

      this.id3Header = id3Header;

      this.headerType = ('id3v2.' + id3Header.version.major) as HeaderType;

      if (id3Header.flags.isExtendedHeader) {
        return this.parseExtendedHeader();
      } else {
        return this.parseId3Data(id3Header.size);
      }
    })
  }

  public parseExtendedHeader(): Promise<IAudioMetadata> {
    return this.fileTokenizer.readToken(ID3v2.ExtendedHeader).then((extendedHeader) => {
      const dataRemaining = extendedHeader.size - ID3v2.ExtendedHeader.len;
      if (dataRemaining > 0) {
        return this.parseExtendedHeaderData(dataRemaining, extendedHeader.size);
      } else {
        return this.parseId3Data(this.id3Header.size - extendedHeader.size);
      }
    })
  }

  public parseExtendedHeaderData(dataRemaining: number, extendedHeaderSize: number): Promise<IAudioMetadata> {
    const buffer = new Buffer(dataRemaining);
    return this.fileTokenizer.readBuffer(buffer, 0, dataRemaining).then(() => {
      return this.parseId3Data(this.id3Header.size - extendedHeaderSize);
    })
  }

  public parseId3Data(dataLen: number): Promise<IAudioMetadata> {
    const buffer = new Buffer(dataLen);
    return this.fileTokenizer.readBuffer(buffer, 0, dataLen).then(() => {
      for (const tag of this.parseMetadata(buffer)) {
        if (tag.id === 'TXXX') {
          for (const text of tag.value.text) {
            this.tags.push({id: tag.id + ':' + tag.value.description, value: text});
          }
        } else if (isArray(tag.value)) {
          for (const value of tag.value) {
            this.tags.push({id: tag.id, value: value});
          }
        } else {
          this.tags.push({id: tag.id, value: tag.value});
        }
      }

      return new MpegParser(this.fileTokenizer, this.id3Header.size, this.options && this.options.duration).parse().then((format) => {

        const res: IAudioMetadata = {
          common: {
            artists: [],
            track: {no: null, of: null},
            disk: {no: null, of: null}
          },
          format,
          native: this.tags
        };

        res.format.headerType = this.headerType;

        for (const tag of this.tags) {
          this.getCommonTags(res.common, this.headerType, tag.id, tag.value);
        }

        return res;
      })
    })
  }

  private parseMetadata(data: Buffer): { id: string, value: any }[] {
    let offset = 0;
    const tags: { id: string, value: any }[] = [];

    while (true) {
      if (offset === data.length) break;
      const frameHeaderBytes = data.slice(offset, offset += Id3v2Parser.getFrameHeaderLength(this.id3Header.version.major));
      const frameHeader = Id3v2Parser.readFrameHeader(frameHeaderBytes, this.id3Header.version.major);

      // Last frame. Check first char is a letter, bit of defensive programming
      if (frameHeader.id === '' || frameHeader.id === '\u0000\u0000\u0000\u0000' ||
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(frameHeader.id[0]) === -1) {
        // ToDo: generate warning
        break;
      }

      const frameDataBytes = data.slice(offset, offset += frameHeader.length);
      const values = this.readFrameData(frameDataBytes, frameHeader, this.id3Header.version.major);
      tags.push({id: frameHeader.id, value: values});
    }
    return tags;
  }

  private readFrameData(v, frameHeader, majorVer: number) {
    switch (majorVer) {
      case 2:
        return id3v2_frames.readData(v, frameHeader.id, null, majorVer);
      case 3:
      case 4:
        if (frameHeader.flags.format.unsynchronisation) {
          v = common.removeUnsyncBytes(v);
        }
        if (frameHeader.flags.format.data_length_indicator) {
          v = v.slice(4, v.length);
        }
        return id3v2_frames.readData(v, frameHeader.id, frameHeader.flags, majorVer);
      default:
        throw new Error('Unexpected majorVer: ' + majorVer);
    }
  }

  private tagMap = new TagMap(); // ToDo: split tagmap amongst parsers

  private getCommonTags(comTags: ICommonTagsResult, type: HeaderType, tag: string, value: any) {

    switch (tag) {

      case 'UFID': // decode MusicBrainz Recording Id
        if (value.owner_identifier === 'http://musicbrainz.org') {
          tag += ':' + value.owner_identifier;
          value = common.decodeString(value.identifier, 'iso-8859-1');
        }
        break;

      case 'PRIV':
        switch (value.owner_identifier) {
          // decode Windows Media Player
          case 'AverageLevel':
          case 'PeakValue':
            tag += ':' + value.owner_identifier;
            value = common.strtokUINT32_LE.get(value.data, 0);
            break;
          default:
          // Unknown PRIV owner-identifier
        }
        break;

      default:
      // nothing to do
    }

    // Convert native tag event to common (aliased) event
    const alias = this.tagMap.getCommonName(type, tag);

    if (alias) {
      // Common tag (alias) found

      // check if we need to do something special with common tag
      // if the event has been aliased then we need to clean it before
      // it is emitted to the user. e.g. genre (20) -> Electronic
      switch (alias) {
        case 'genre':
          value = common.parseGenre(value);
          break;

        case 'barcode':
          value = typeof value === 'string' ? parseInt(value, 10) : value;
          break;

        case 'picture':
          value = MusicMetadataParser.cleanupPicture(value);
          break;

        case 'totaltracks':
          comTags.track.of = MusicMetadataParser.toIntOrNull(value);
          return;

        case 'totaldiscs':
          comTags.disk.of = MusicMetadataParser.toIntOrNull(value);
          return;

        case 'track':
        case 'disk':
          const of = comTags[alias].of; // store of value, maybe maybe overwritten
          comTags[alias] = MusicMetadataParser.cleanupTrack(value);
          comTags[alias].of = of != null ? of : comTags[alias].of;
          return;

        case 'year':
        case 'originalyear':
          value = parseInt(value, 10);
          break;

        case 'date':
          // ToDo: be more strict on 'YYYY...'
          // if (/^\d{4}\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01])$/.test(value)) {
          comTags.year = parseInt(value.substr(0, 4), 10);
          break;

        default:
        // nothing to do
      }

      if (alias !== 'artist' && TagMap.isSingleton(alias)) {
        comTags[alias] = value;
      } else {
        if (comTags.hasOwnProperty(alias)) {
          comTags[alias].push(value);
        } else {
          // if we haven't previously seen this tag then
          // initialize it to an array, ready for values to be entered
          comTags[alias] = [value];
        }
      }
    }
  }
}

module.exports = Id3v2Parser.getInstance();
