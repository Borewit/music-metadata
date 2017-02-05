import ReadableStream = NodeJS.ReadableStream;
import * as strtok from 'strtok2';
import {isArray} from 'util';
import common from './common';
import id3v2_frames from './id3v2_frames';
import {MpegParser} from './mpeg';
import {IStreamParser} from './parser';
import {HeaderType} from './tagmap';

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

enum State {
  header,
  extendedHeader,
  extendedHeaderData,
  id3_data,
  MP3
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
  public static Header = {
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

  public static ExtendedHeader = {
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

class Id3v2Parser implements IStreamParser {

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

  private static getFrameHeaderLength(majorVer, done): number {
    switch (majorVer) {
      case 2:
        return 6;
      case 3:
      case 4:
        return 10;
      default:
        return done(new Error('header versionIndex is incorrect'));
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

  private state: State = State.header;
  private mpegParser: MpegParser;

  public parse(stream, callback, done, readDuration, fileSize) {
    const self: Id3v2Parser = this;

    let id3Header: IID3v2header;
    let extendedHeader: IExtendedHeader;
    let headerType: HeaderType;

    strtok.parse(stream, (v, cb) => {
      if (v === undefined) {
        self.state = State.header;
        return ID3v2.Header;
      }

      switch (self.state) {
        case State.header: // ID3v2 header
          id3Header = v as IID3v2header;
          if (id3Header.fileIdentifier !== 'ID3') {
            return done(new Error('expected file identifier \'ID3\' not found'));
          }
          headerType = ('id3v2.' + id3Header.version.major) as HeaderType;
          if (id3Header.flags.isExtendedHeader) {
            self.state = State.extendedHeader;
            return ID3v2.ExtendedHeader;
          } else {
            self.state = State.id3_data;
            return new strtok.BufferType(id3Header.size);
          }

        case State.extendedHeader:
          extendedHeader = v as IExtendedHeader;
          const dataRemaining = extendedHeader.size - ID3v2.ExtendedHeader.len;
          if (dataRemaining > 0) {
            self.state = State.extendedHeaderData;
            return new strtok.BufferType(dataRemaining);
          } else {
            self.state = State.id3_data;
            return new strtok.BufferType(id3Header.size - extendedHeader.size);
          }

        case State.extendedHeaderData:
          self.state = State.id3_data;
          return new strtok.BufferType(id3Header.size - extendedHeader.size);

        case State.id3_data: // mm data
          for (const tag of this.parseMetadata(v, id3Header, done)){
          if (tag.id === 'TXXX') {
            for (const text of tag.value.text) {
              callback(headerType, tag.id + ':' + tag.value.description, text);
            }
          } else if (isArray(tag.value)) {
              for (const value of tag.value) {
                callback(headerType, tag.id, value);
              }
            } else {
              callback(headerType, tag.id, tag.value);
            }
          }
          callback('format', 'headerType', headerType);
          this.mpegParser = new MpegParser(id3Header.size);
          this.mpegParser.parse(stream, callback, done, readDuration, fileSize);
          return strtok.DONE;

        default:
          done(new Error('Undefined state: ' + self.state));
      }
    });
  }

  public end(callback, done) {
    this.mpegParser.end(callback, done);
  }

  private parseMetadata(data: Buffer, header: IID3v2header, done): Array<{id: string, value: any}> {
    let offset = 0;
    const tags: Array<{id: string, value: any}> = [];

    while (true) {
      if (offset === data.length) break;
      const frameHeaderBytes = data.slice(offset, offset += Id3v2Parser.getFrameHeaderLength(header.version.major, done));
      const frameHeader = Id3v2Parser.readFrameHeader(frameHeaderBytes, header.version.major);

      // Last frame. Check first char is a letter, bit of defensive programming
      if (frameHeader.id === '' || frameHeader.id === '\u0000\u0000\u0000\u0000' ||
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(frameHeader.id[0]) === -1) {
        // ToDo: generate warning
        break;
      }

      const frameDataBytes = data.slice(offset, offset += frameHeader.length);
      const values = this.readFrameData(frameDataBytes, frameHeader, header.version.major);
      tags.push({id: frameHeader.id, value: values});
    }
    return tags;
  }

  private readFrameData(v, frameHeader, majorVer) {
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
}

module.exports = Id3v2Parser.getInstance();
