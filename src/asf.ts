'use strict';
import * as equal from 'deep-equal';
import common from './common';
import ReadableStream = NodeJS.ReadableStream;
import {INativeAudioMetadata, ITag, IFormat, IOptions} from "./index";
import {ITokenizer} from "strtok3";
import {BufferType, IGetToken} from "token-types";
import * as Token from "token-types";
import {ITokenParser} from "./ParserFactory";

/**
 * Ref: https://tools.ietf.org/html/draft-fleischman-asf-01
 * Ref: https://hwiegman.home.xs4all.nl/fileformats/asf/ASF_Specification.pdf
 */
export class AsfParser implements ITokenParser {

  public static headerType = 'asf';

  public static getInstance(): AsfParser {
    return new AsfParser();
  }

  private tokenizer: ITokenizer;

  private numberOfObjectHeaders: number;

  private tags: ITag[] = [];

  private format: IFormat = {
    dataformat: 'asf'
  };

  public parse(tokenizer: ITokenizer, options: IOptions): Promise<INativeAudioMetadata> {

    this.tokenizer = tokenizer;

    return this.paresTopLevelHeaderObject();
  }

  private paresTopLevelHeaderObject(): Promise<INativeAudioMetadata> {
    return this.tokenizer.readToken<IAsfTopLevelObjectHeader>(AsfObject.TopLevelHeaderObjectToken).then((header) => {
      if (!equal(header.objectId, AsfObject.GUID.Header)) {
        throw new Error('expected asf header; but was not found');
      }
      this.numberOfObjectHeaders = header.numberOfHeaderObjects;
      return this.parseObjectHeader();
    });
  }

  private parseObjectHeader(): Promise<INativeAudioMetadata> {
    // Parse common header of the ASF Object
    return this.tokenizer.readToken<IAsfObjectHeader>(AsfObject.ObjectHeaderToken).then((header) => {
      // Parse data part of the ASF Object
      if (equal(header.objectId, FilePropertiesObject.guid)) {
        return this.parseFilePropertiesObject(header);
      } else if (equal(header.objectId, ContentDescriptionObjectState.guid)) {
        return this.parseContentDescription(header);
      } else if (equal(header.objectId, ExtendedContentDescriptionObjectState.guid)) {
        return this.parseExtendedContentDescriptionObject(header);
      } else {
        console.log("Ignore ASF-Object-GUID: %s", AsfParser.guidToString(header.objectId));
        return this.tokenizer.readToken<ITag[]>(new IgnoreObjectState(header));
        //throw new Error('Unexpected GUID: ' + AsfParser.guidToString(header.objectId) );
      }
    }).then(() => {
      if(--this.numberOfObjectHeaders > 0) {
        return this.parseObjectHeader();
      } else {
        // done
        return {
          format: this.format,
          native: {
            asf: this.tags
          }
        }
      }
    });
  }

  /**
   * Print GUID in format like "B503BF5F-2EA9-CF11-8EE3-00C00C205365"
   * @param objectId Binary GUID
   * @returns {string} GUID as dashed hexadecimal representation
   */
  private static guidToString(objectId: Buffer): string {
    return objectId.slice(0, 4).toString('hex').toUpperCase() + "-"
      + objectId.slice(4, 6).toString('hex').toUpperCase() + "-"
      + objectId.slice(6, 8).toString('hex').toUpperCase() + "-"
      + objectId.slice(8, 10).toString('hex').toUpperCase() + "-"
      + objectId.slice(10, 16).toString('hex').toUpperCase()
  }

  private parseContentDescription(header: IAsfObjectHeader): Promise<ITag[]> {
    return this.tokenizer.readToken<ITag[]>(new ContentDescriptionObjectState(header)).then((tags) => {
      this.tags = this.tags.concat(tags);
      return tags;
    });
  }

  private parseFilePropertiesObject(header: IAsfObjectHeader): Promise<void> {
    return this.tokenizer.readToken<IFilePropertiesObject>(new FilePropertiesObject(header)).then((fpo) => {
      this.format.duration = fpo.playDuration / 10000000;
      this.format.bitrate = fpo.maximumBitrate;
    });
  }

  private parseExtendedContentDescriptionObject(header: IAsfObjectHeader): Promise<ITag[]> {
    return this.tokenizer.readToken<ITag[]>(new ExtendedContentDescriptionObjectState(header)).then((tags) => {
      this.tags = this.tags.concat(tags);
      return tags;
    });
  }
}

type AttributeParser = (buf: Buffer) => boolean | string | number | Buffer;

class Util {

  public static getParserForAttr(i: number): AttributeParser {
    return Util.attributeParsers[i];
  }

  public static parseUnicodeAttr(buf): string {
    return common.stripNulls(common.decodeString(buf, 'utf16le'));
  }

  public static parseByteArrayAttr(buf: Buffer): Buffer {
    const newBuf = new Buffer(buf.length);
    buf.copy(newBuf);
    return newBuf;
  }

  public static parseBoolAttr(buf: Buffer): boolean {
    return Util.parseDWordAttr(buf) === 1;
  }

  public static parseDWordAttr(buf: Buffer): number {
    return buf.readUInt32LE(0);
  }

  public static parseQWordAttr(buf: Buffer): number {
    return Util.readUInt64LE(buf, 0);
  }

  public static parseWordAttr(buf: Buffer): number {
    return buf.readUInt16LE(0);
  }

  public static readUInt64LE(buffer, offset): number {
    const high = buffer.slice(offset, offset + 4).readUInt32LE(0);
    const low = buffer.slice(offset + 4, offset + 8).readUInt32LE(0);
    const maxuint32 = Math.pow(2, 32);
    return ((low * maxuint32) + (high >>> 0));
  }

  private static attributeParsers: AttributeParser[] = [
    Util.parseUnicodeAttr,
    Util.parseByteArrayAttr,
    Util.parseBoolAttr,
    Util.parseDWordAttr,
    Util.parseQWordAttr,
    Util.parseWordAttr,
    Util.parseByteArrayAttr
  ];
}

/**
 * Ref: https://msdn.microsoft.com/en-us/library/windows/desktop/ee663575
 */
interface IAsfObjectHeader {

  /**
   * A GUID that identifies the object. 128 bits
   */
  objectId: Buffer,

  /**
   * The size of the object (64-bits)
   */
  objectSize: number,
}

/**
 * ASF top-level Header Object
 */
interface IAsfTopLevelObjectHeader extends IAsfObjectHeader {
  numberOfHeaderObjects: number
}


/**
 * Ref: https://msdn.microsoft.com/en-us/library/windows/desktop/ee663575(v=vs.85).aspx
 */
class AsfObject {

  public static GUID = {

    /**
     * The ASF_Header_Object GUID
     * @type {Buffer}
     */
    Header: new Buffer([
      0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11,
      0xA6, 0xD9, 0x00, 0xAA, 0x00, 0x62, 0xCE, 0x6C
    ]),
  };


  public static TopLevelHeaderObjectToken: IGetToken<IAsfTopLevelObjectHeader> = {

    len: 30,

    get: (buf, off): IAsfTopLevelObjectHeader => {
      return {
        objectId: new BufferType(16).get(buf, off),
        objectSize: Util.readUInt64LE(buf, off + 16),
        numberOfHeaderObjects: Token.UINT32_LE.get(buf, off + 24),
        // Reserved: 2 bytes
      };
    }
  };

  public static ObjectHeaderToken: IGetToken<IAsfObjectHeader> = {

    len: 24,

    get: (buf, off): IAsfObjectHeader => {
      return {
        objectId: new BufferType(16).get(buf, off),
        objectSize: Util.readUInt64LE(buf, off + 16)
      };
    }
  };

}

abstract class State<T> implements IGetToken<T> {

  public len: number;

  constructor(header: IAsfObjectHeader) {
    this.len = header.objectSize - AsfObject.ObjectHeaderToken.len;
  }

  public abstract get(buf: Buffer, off: number): T
}

class IgnoreObjectState extends State<any> {

  constructor(header: IAsfObjectHeader) {
    super(header);
  }

  public get(buf: Buffer, off: number): null {
    return null;
  }
}

/**
 * 3.10 Content Description Object (optional, one only)
 */
class ContentDescriptionObjectState extends State<ITag[]> {

  public static guid = new Buffer([
    0x33, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11,
    0xA6, 0xD9, 0x00, 0xAA, 0x00, 0x62, 0xCE, 0x6C
  ]);

  private static contentDescTags = ['Title', 'Author', 'Copyright', 'Description', 'Rating'];

  constructor(header: IAsfObjectHeader) {
    super(header);
  }

  public get(buf: Buffer, off: number): ITag[] {

    const tags: ITag[] = [];

    let pos = 10;
    for (let i = 0; i < ContentDescriptionObjectState.contentDescTags.length; ++i) {
      const length = buf.readUInt16LE(i * 2);
      if (length > 0) {
        const tagName = ContentDescriptionObjectState.contentDescTags[i];
        const end = pos + length;
        tags.push({id: tagName, value: Util.parseUnicodeAttr(buf.slice(pos, end))});
        pos = end;
      }
    }
    return tags;
  }
}

class ExtendedContentDescriptionObjectState extends State<ITag[]> {

  public static guid = new Buffer([
    0x40, 0xA4, 0xD0, 0xD2, 0x07, 0xE3, 0xD2, 0x11,
    0x97, 0xF0, 0x00, 0xA0, 0xC9, 0x5E, 0xA8, 0x50
  ]);

  constructor(header: IAsfObjectHeader) {
    super(header);
  }

  public get(buf: Buffer, off: number): ITag[] {
    const tags: ITag[] = [];
    const attrCount = buf.readUInt16LE(0);
    let pos = 2;
    for (let i = 0; i < attrCount; i += 1) {
      const nameLen = buf.readUInt16LE(pos);
      pos += 2;
      const name = Util.parseUnicodeAttr(buf.slice(pos, pos + nameLen));
      pos += nameLen;
      const valueType = buf.readUInt16LE(pos);
      pos += 2;
      const valueLen = buf.readUInt16LE(pos);
      pos += 2;
      const value = buf.slice(pos, pos + valueLen);
      pos += valueLen;
      const parseAttr = Util.getParserForAttr(valueType);
      if (!parseAttr) {
        throw new Error('unexpected value headerType: ' + valueType);
      }
      tags.push({id: name, value: parseAttr(value)});
    }
    return tags;
  }
}

/**
 * File Properties Object (mandatory, one only)
 */
interface IFilePropertiesObject {
  fileId: Buffer,
  fileSize: number,
  creationDate: number,
  dataPacketsCount: number,
  /**
   * Duration in  100-nanosecond units
   */
  playDuration: number,
  sendDuration: number,
  preroll: number,
  flags: {
    broadcast: boolean,
    seekable: boolean
  },
  minimumDataPacketSize: number,
  maximumDataPacketSize: number,
  maximumBitrate: number,
}

class FilePropertiesObject extends State<IFilePropertiesObject> {

  public static guid = new Buffer([
    0xA1, 0xDC, 0xAB, 0x8C, 0x47, 0xA9, 0xCF, 0x11,
    0x8E, 0xE4, 0x00, 0xC0, 0x0C, 0x20, 0x53, 0x65
  ]);

  constructor(header: IAsfObjectHeader) {
    super(header);
  }

  public get(buf: Buffer, off: number): IFilePropertiesObject {


    return {
      fileId: new BufferType(16).get(buf, off),
      fileSize: Util.readUInt64LE(buf, off + 16),
      creationDate: Util.readUInt64LE(buf, off + 24),
      dataPacketsCount: Util.readUInt64LE(buf, off + 32),
      playDuration: Util.readUInt64LE(buf, off + 40),
      sendDuration: Util.readUInt64LE(buf, off + 48),
      preroll: Util.readUInt64LE(buf, off + 56),
      flags: {
        broadcast: common.strtokBITSET.get(buf, off + 64, 0),
        seekable: common.strtokBITSET.get(buf, off + 64, 1),
      },
      // flagsNumeric: Token.UINT32_LE.get(buf, off + 64),
      minimumDataPacketSize: Token.UINT32_LE.get(buf, off + 68),
      maximumDataPacketSize: Token.UINT32_LE.get(buf, off + 72),
      maximumBitrate: Token.UINT32_LE.get(buf, off + 76)
    };
  }
}

