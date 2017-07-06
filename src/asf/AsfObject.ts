// ASF Objects

'use strict';
import common from '../common';
import ReadableStream = NodeJS.ReadableStream;
import {ITag} from "../index";
import * as Token from "token-types";
import GUID from "./GUID";
import {Util} from "./Util";
import {IGetToken} from "token-types";

/**
 * Ref: https://msdn.microsoft.com/en-us/library/windows/desktop/ee663575
 */
export interface IAsfObjectHeader {

  /**
   * A GUID that identifies the object. 128 bits
   */
  objectId: GUID,

  /**
   * The size of the object (64-bits)
   */
  objectSize: number,
}

/**
 * Interface for: 3. ASF top-level Header Object
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3
 */
export interface IAsfTopLevelObjectHeader extends IAsfObjectHeader {
  numberOfHeaderObjects: number
}

/**
 * Token for: 3. ASF top-level Header Object
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3
 */
export const TopLevelHeaderObjectToken: Token.IGetToken<IAsfTopLevelObjectHeader> = {

  len: 30,

  get: (buf, off): IAsfTopLevelObjectHeader => {
    return {
      objectId: GUID.fromBin(new Token.BufferType(16).get(buf, off)),
      objectSize: Util.readUInt64LE(buf, off + 16),
      numberOfHeaderObjects: Token.UINT32_LE.get(buf, off + 24)
      // Reserved: 2 bytes
    };
  }
};

/**
 * Token for: 3.1 Header Object (mandatory, one only)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_1
 */
export const HeaderObjectToken: Token.IGetToken<IAsfObjectHeader> = {

  len: 24,

  get: (buf, off): IAsfObjectHeader => {
    return {
      objectId: GUID.fromBin(new Token.BufferType(16).get(buf, off)),
      objectSize: Util.readUInt64LE(buf, off + 16)
    };
  }
};

abstract class State<T> implements Token.IGetToken<T> {

  public len: number;

  constructor(header: IAsfObjectHeader) {
    this.len = header.objectSize - HeaderObjectToken.len;
  }

  public abstract get(buf: Buffer, off: number): T;
}

// ToDo: use ignore type
export class IgnoreObjectState extends State<any> {

  constructor(header: IAsfObjectHeader) {
    super(header);
  }

  public get(buf: Buffer, off: number): null {
    return null;
  }
}

/**
 * Interface for: 3.2: File Properties Object (mandatory, one only)
 */
export interface IFilePropertiesObject {
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

/**
 * Token for: 3.2: File Properties Object (mandatory, one only)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_2
 */
export class FilePropertiesObject extends State<IFilePropertiesObject> {

  public static guid = GUID.FilePropertiesObject;

  constructor(header: IAsfObjectHeader) {
    super(header);
  }

  public get(buf: Buffer, off: number): IFilePropertiesObject {

    return {
      fileId: new Token.BufferType(16).get(buf, off),
      fileSize: Util.readUInt64LE(buf, off + 16),
      creationDate: Util.readUInt64LE(buf, off + 24),
      dataPacketsCount: Util.readUInt64LE(buf, off + 32),
      playDuration: Util.readUInt64LE(buf, off + 40),
      sendDuration: Util.readUInt64LE(buf, off + 48),
      preroll: Util.readUInt64LE(buf, off + 56),
      flags: {
        broadcast: common.strtokBITSET.get(buf, off + 64, 0),
        seekable: common.strtokBITSET.get(buf, off + 64, 1)
      },
      // flagsNumeric: Token.UINT32_LE.get(buf, off + 64),
      minimumDataPacketSize: Token.UINT32_LE.get(buf, off + 68),
      maximumDataPacketSize: Token.UINT32_LE.get(buf, off + 72),
      maximumBitrate: Token.UINT32_LE.get(buf, off + 76)
    };
  }
}

/**
 * Interface for: 3.3 Stream Properties Object (mandatory, one per stream)
 */
export interface IStreamPropertiesObject {

  /**
   * Stream Type
   */
  streamType: GUID,

  /**
   * Error Correction Type
   */
  errorCorrectionType: GUID,

}

/**
 * Token for: 3.3 Stream Properties Object (mandatory, one per stream)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_3
 */
export class StreamPropertiesObject extends State<IStreamPropertiesObject> {

  public static guid = GUID.StreamPropertiesObject;

  public constructor(header: IAsfObjectHeader) {
    super(header);
  }

  public get(buf: Buffer, off: number): IStreamPropertiesObject {

    return {
      streamType: GUID.fromBin(buf, off),
      errorCorrectionType: GUID.fromBin(buf, off + 16)
      // ToDo
    };
  }
}

export interface IHeaderExtensionObject {
  reserved1: GUID,
  reserved2: number,
  extensionData: Buffer
}

/**
 * 3.4: Header Extension Object (mandatory, one only)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_4
 */
export class HeaderExtensionObject implements IGetToken<IHeaderExtensionObject> {

  public static guid = GUID.HeaderExtensionObject;

  public len: number;

  public constructor(header: IAsfObjectHeader) {
    this.len = 22;
  }

  public get(buf: Buffer, off: number): IHeaderExtensionObject {
    const dataSize = buf.readUInt32LE(off + 18);
    return {
      reserved1: GUID.fromBin(buf, off),
      reserved2: buf.readUInt16LE(off + 16),
      extensionData: new Token.BufferType(dataSize).get(buf, off + 20)
    // ToDo
    };
  }
}

/**
 * 3.10 Content Description Object (optional, one only)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_10
 */
export class ContentDescriptionObjectState extends State<ITag[]> {

  public static guid = GUID.ContentDescriptionObject;

  private static contentDescTags = ['Title', 'Author', 'Copyright', 'Description', 'Rating'];

  constructor(header: IAsfObjectHeader) {
    super(header);
  }

  public get(buf: Buffer, off: number): ITag[] {

    const tags: ITag[] = [];

    let pos = off + 10;
    for (let i = 0; i < ContentDescriptionObjectState.contentDescTags.length; ++i) {
      const length = buf.readUInt16LE(off + i * 2);
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

/**
 * 3.11 Extended Content Description Object (optional, one only)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_11
 */
export class ExtendedContentDescriptionObjectState extends State<ITag[]> {

  public static guid = GUID.ExtendedContentDescriptionObject;

  constructor(header: IAsfObjectHeader) {
    super(header);
  }

  public get(buf: Buffer, off: number): ITag[] {
    const tags: ITag[] = [];
    const attrCount = buf.readUInt16LE(off);
    let pos = off + 2;
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

// 4.7	Metadata Object (optional, 0 or 1)
export class MetadataObjectState extends State<ITag[]> {

  public static guid = GUID.MetadataObject;

  constructor(header: IAsfObjectHeader) {
    super(header);
  }

  public get(buf: Buffer, off: number): ITag[] {
    const tags: ITag[] = [];
    const descriptionRecordsCount = buf.readUInt16LE(off);
    let pos = off + 2;
    for (let i = 0; i < descriptionRecordsCount; i += 1) {
      pos += 4;
      const nameLen = buf.readUInt16LE(pos);
      pos += 2;
      const dataType = buf.readUInt16LE(pos);
      pos += 2;
      const dataLen = buf.readUInt32LE(pos);
      pos += 4;
      const name = Util.parseUnicodeAttr(buf.slice(pos, pos + nameLen));
      pos += nameLen;
      const data = buf.slice(pos, pos + dataLen);
      pos += dataLen;
      const parseAttr = Util.getParserForAttr(dataType);
      if (!parseAttr) {
        throw new Error('unexpected value headerType: ' + dataType);
      }
      tags.push({id: name, value: parseAttr(data)});
    }
    return tags;
  }
}

// 4.8	Metadata Library Object (optional, 0 or 1)
export class MetadataLibraryObjectState extends MetadataObjectState {

  public static guid = GUID.MetadataLibraryObject;

  constructor(header: IAsfObjectHeader) {
    super(header);
  }
}
