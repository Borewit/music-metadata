// ASF Objects

import * as Token from 'token-types';
import type { IGetToken, ITokenizer } from 'strtok3';

import * as util from '../common/Util.js';
import { IPicture, ITag } from '../type.js';
import GUID from './GUID.js';
import { AsfUtil } from './AsfUtil.js';
import { AttachedPictureType } from '../id3v2/ID3v2Token.js';
import { base64ToUint8Array } from 'uint8array-extras';

/**
 * Data Type: Specifies the type of information being stored. The following values are recognized.
 */
export enum DataType {
  /**
   * Unicode string. The data consists of a sequence of Unicode characters.
   */
  UnicodeString,
  /**
   * BYTE array. The type of data is implementation-specific.
   */
  ByteArray,
  /**
   * BOOL. The data is 2 bytes long and should be interpreted as a 16-bit unsigned integer. Only 0x0000 or 0x0001 are permitted values.
   */
  Bool,
  /**
   * DWORD. The data is 4 bytes long and should be interpreted as a 32-bit unsigned integer.
   */
  DWord,
  /**
   * QWORD. The data is 8 bytes long and should be interpreted as a 64-bit unsigned integer.
   */
  QWord,
  /**
   * WORD. The data is 2 bytes long and should be interpreted as a 16-bit unsigned integer.
   */
  Word
}

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
export const TopLevelHeaderObjectToken: IGetToken<IAsfTopLevelObjectHeader, Uint8Array> = {

  len: 30,

  get: (buf, off): IAsfTopLevelObjectHeader => {
    return {
      objectId: GUID.fromBin(buf, off),
      objectSize: Number(Token.UINT64_LE.get(buf, off + 16)),
      numberOfHeaderObjects: Token.UINT32_LE.get(buf, off + 24)
      // Reserved: 2 bytes
    };
  }
};

/**
 * Token for: 3.1 Header Object (mandatory, one only)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_1
 */
export const HeaderObjectToken: IGetToken<IAsfObjectHeader, Uint8Array> = {

  len: 24,

  get: (buf, off): IAsfObjectHeader => {
    return {
      objectId: GUID.fromBin(buf, off),
      objectSize: Number(Token.UINT64_LE.get(buf, off + 16))
    };
  }
};

export abstract class State<T> implements IGetToken<T> {

  public len: number;

  constructor(header: IAsfObjectHeader) {
    this.len = Number(header.objectSize) - HeaderObjectToken.len;
  }

  public abstract get(buf: Uint8Array, off: number): T;

  protected postProcessTag(tags: ITag[], name: string, valueType: number, data: any) {
    if (name === 'WM/Picture') {
      tags.push({id: name, value: WmPictureToken.fromBuffer(data)});
    } else {
      const parseAttr = AsfUtil.getParserForAttr(valueType);
      if (!parseAttr) {
        throw new Error('unexpected value headerType: ' + valueType);
      }
      tags.push({id: name, value: parseAttr(data)});
    }
  }
}

// ToDo: use ignore type
export class IgnoreObjectState extends State<any> {

  constructor(header: IAsfObjectHeader) {
    super(header);
  }

  public get(buf: Uint8Array, off: number): null {
    return null;
  }
}

/**
 * Interface for: 3.2: File Properties Object (mandatory, one only)
 *
 * The File Properties Object defines the global characteristics of the combined digital media streams found within the Data Object.
 */
export interface IFilePropertiesObject {

  /**
   * Specifies the unique identifier for this file.
   * The value of this field shall be regenerated every time the file is modified in any way.
   * The value of this field shall be identical to the value of the File ID field of the Data Object.
   */
  fileId: GUID,

  /**
   * Specifies the size, in bytes, of the entire file.
   * The value of this field is invalid if the Broadcast Flag bit in the Flags field is set to 1.
   */
  fileSize: bigint,
  /**
   * Specifies the date and time of the initial creation of the file. The value is given as the number of 100-nanosecond
   * intervals since January 1, 1601, according to Coordinated Universal Time (Greenwich Mean Time). The value of this
   * field may be invalid if the Broadcast Flag bit in the Flags field is set to 1.
   */
  creationDate: bigint,
  /**
   * Specifies the number of Data Packet entries that exist within the Data Object. The value of this field is invalid
   * if the Broadcast Flag bit in the Flags field is set to 1.
   */
  dataPacketsCount: bigint,
  /**
   * Specifies the time needed to play the file in 100-nanosecond units.
   * This value should include the duration (estimated, if an exact value is unavailable) of the the last media object
   * in the presentation. The value of this field is invalid if the Broadcast Flag bit in the Flags field is set to 1.
   */
  playDuration: bigint,
  /**
   * Specifies the time needed to send the file in 100-nanosecond units.
   * This value should include the duration of the last packet in the content.
   * The value of this field is invalid if the Broadcast Flag bit in the Flags field is set to 1.
   * Players can ignore this value.
   */
  sendDuration: bigint,
  /**
   * Specifies the amount of time to buffer data before starting to play the file, in millisecond units.
   * If this value is nonzero, the Play Duration field and all of the payload Presentation Time fields have been offset
   * by this amount. Therefore, player software must subtract the value in the preroll field from the play duration and
   * presentation times to calculate their actual values. It follows that all payload Presentation Time fields need to
   * be at least this value.
   */
  preroll: bigint,
  /**
   * The flags
   */
  flags: {
    /**
     * Specifies, if set, that a file is in the process of being created (for example, for recording applications),
     * and thus that various values stored in the header objects are invalid. It is highly recommended that
     * post-processing be performed to remove this condition at the earliest opportunity.
     */
    broadcast: boolean,
    /**
     * Specifies, if set, that a file is seekable.
     * Note that for files containing a single audio stream and a Minimum Data Packet Size field equal to the Maximum
     * Data Packet Size field, this flag shall always be set to 1.
     * For files containing a single audio stream and a video stream or mutually exclusive video streams,
     * this flag is only set to 1 if the file contains a matching Simple Index Object for each regular video stream
     * (that is, video streams that are not hidden according to the method described in section 8.2.2).
     */
    seekable: boolean
  },
  /**
   * Specifies the minimum Data Packet size in bytes. In general, the value of this field is invalid if the Broadcast
   * Flag bit in the Flags field is set to 1.
   * However, for the purposes of this specification, the values for the Minimum Data Packet Size and Maximum Data
   * Packet Size fields shall be set to the same value, and this value should be set to the packet size, even when the
   * Broadcast Flag in the Flags field is set to 1.
   */
  minimumDataPacketSize: number,
  /**
   * Specifies the maximum Data Packet size in bytes.
   * In general, the value of this field is invalid if the Broadcast Flag bit in the Flags field is set to 1.
   * However, for the purposes of this specification, the values of the Minimum Data Packet Size and Maximum Data Packet
   * Size fields shall be set to the same value,
   * and this value should be set to the packet size, even when the Broadcast Flag field is set to 1.
   */
  maximumDataPacketSize: number,
  /**
   * Specifies the maximum instantaneous bit rate in bits per second for the entire file.
   * This shall equal the sum of the bit rates of the individual digital media streams.
   * It shall be noted that the digital media stream includes ASF data packetization overhead as well as digital media
   * data in payloads.
   * Only those streams that have a free-standing Stream Properties Object in the header shall have their bit rates
   * included in the sum;
   * streams whose Stream Properties Object exists as part of an Extended Stream Properties Object in the Header
   * Extension Object shall not have their bit rates included in this sum, except when this value would otherwise be 0.
   */
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

  public get(buf: Uint8Array, off: number): IFilePropertiesObject {

    return {
      fileId: GUID.fromBin(buf, off),
      fileSize: Token.UINT64_LE.get(buf, off + 16),
      creationDate: Token.UINT64_LE.get(buf, off + 24),
      dataPacketsCount: Token.UINT64_LE.get(buf, off + 32),
      playDuration: Token.UINT64_LE.get(buf, off + 40),
      sendDuration: Token.UINT64_LE.get(buf, off + 48),
      preroll: Token.UINT64_LE.get(buf, off + 56),
      flags: {
        broadcast: util.getBit(buf, off + 64, 24),
        seekable: util.getBit(buf, off + 64, 25)
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
  streamType: string,

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

  public get(buf: Uint8Array, off: number): IStreamPropertiesObject {

    return {
      streamType: GUID.decodeMediaType(GUID.fromBin(buf, off)),
      errorCorrectionType: GUID.fromBin(buf, off + 8)
      // ToDo
    };
  }
}

export interface IHeaderExtensionObject {
  reserved1: GUID,
  reserved2: number,
  extensionDataSize: number
}

/**
 * 3.4: Header Extension Object (mandatory, one only)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_4
 */
export class HeaderExtensionObject implements IGetToken<IHeaderExtensionObject> {

  public static guid = GUID.HeaderExtensionObject;

  public len: number;

  public constructor() {
    this.len = 22;
  }

  public get(buf: Uint8Array, off: number): IHeaderExtensionObject {
    const view = new DataView(buf.buffer, off);
    return {
      reserved1: GUID.fromBin(buf, off),
      reserved2: view.getUint16(16, true),
      extensionDataSize: view.getUint16(18, true)
    };
  }
}

/**
 * 3.5: The Codec-List-Object interface.
 */
interface ICodecListObjectHeader {
  entryCount: number
}

/**
 * 3.5: The Codec List Object provides user-friendly information about the codecs and formats used to encode the content found in the ASF file.
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_5
 */
const CodecListObjectHeader: IGetToken<ICodecListObjectHeader> = {
  len: 20,
  get: (buf: Uint8Array, off: number): ICodecListObjectHeader => {
    const view = new DataView(buf.buffer, off);
    return {
      entryCount: view.getUint16(16, true)
    };
  }
};

export interface ICodecEntry {
  type: {
    videoCodec: boolean,
    audioCodec: boolean
  },
  codecName: string,
  description: string,
  information: Uint8Array
}

async function readString(tokenizer: ITokenizer): Promise<string> {
  const length = await tokenizer.readNumber(Token.UINT16_LE);
  return (await tokenizer.readToken(new Token.StringType(length * 2, 'utf-16le'))).replace('\0', '');
}

/**
 * 3.5: Read the Codec-List-Object, which provides user-friendly information about the codecs and formats used to encode the content found in the ASF file.
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_5
 */
export async function readCodecEntries(tokenizer: ITokenizer): Promise<ICodecEntry[]> {
  const codecHeader = await tokenizer.readToken(CodecListObjectHeader);
  const entries: ICodecEntry[] = [];
  for (let i = 0; i < codecHeader.entryCount; ++i) {
    entries.push(await readCodecEntry(tokenizer));
  }
  return entries;
}

async function readInformation(tokenizer: ITokenizer): Promise<Uint8Array> {
  const length = await tokenizer.readNumber(Token.UINT16_LE);
  const buf = new Uint8Array(length);
  await tokenizer.readBuffer(buf);
  return buf;
}

/**
 * Read Codec-Entries
 * @param tokenizer
 */
async function readCodecEntry(tokenizer: ITokenizer): Promise<ICodecEntry> {
  const type = await tokenizer.readNumber(Token.UINT16_LE);
  return {
    type: {
      videoCodec: (type & 0x0001) === 0x0001,
      audioCodec: (type & 0x0002) === 0x0002
    },
    codecName: await readString(tokenizer),
    description: await readString(tokenizer),
    information: await readInformation(tokenizer)
  };
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

  public get(buf: Uint8Array, off: number): ITag[] {
    const tags: ITag[] = [];

    const view = new DataView(buf.buffer, off);
    let pos = 10;
    for (let i = 0; i < ContentDescriptionObjectState.contentDescTags.length; ++i) {
      const length = view.getUint16(i * 2, true);
      if (length > 0) {
        const tagName = ContentDescriptionObjectState.contentDescTags[i];
        const end = pos + length;
        tags.push({id: tagName, value: AsfUtil.parseUnicodeAttr(buf.slice(off + pos, off + end))});
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

  public get(buf: Uint8Array, off: number): ITag[] {
    const tags: ITag[] = [];
    const view = new DataView(buf.buffer, off);
    const attrCount = view.getUint16(0, true);
    let pos = 2;
    for (let i = 0; i < attrCount; i += 1) {
      const nameLen = view.getUint16(pos, true);
      pos += 2;
      const name = AsfUtil.parseUnicodeAttr(buf.slice(off + pos, off + pos + nameLen));
      pos += nameLen;
      const valueType = view.getUint16(pos, true);
      pos += 2;
      const valueLen = view.getUint16(pos, true);
      pos += 2;
      const value = buf.slice(off + pos, off + pos + valueLen);
      pos += valueLen;
      this.postProcessTag(tags, name, valueType, value);
    }
    return tags;
  }
}

export interface IStreamName {
  streamLanguageId: number,
  streamName: string
}

/**
 * 4.1 Extended Stream Properties Object (optional, 1 per media stream)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/04_objects_in_the_asf_header_extension_object.html#4_1
 */
export interface IExtendedStreamPropertiesObject {
  startTime: bigint,
  endTime: bigint,
  dataBitrate: number,
  bufferSize: number,
  initialBufferFullness: number,
  alternateDataBitrate: number,
  alternateBufferSize: number,
  alternateInitialBufferFullness: number,
  maximumObjectSize: number,
  flags: {
    reliableFlag: boolean,
    seekableFlag: boolean,
    resendLiveCleanpointsFlag: boolean
  },
  // flagsNumeric: Token.UINT32_LE.get(buf, off + 64),
  streamNumber: number,
  streamLanguageId: number,
  averageTimePerFrame: number,
  streamNameCount: number,
  payloadExtensionSystems: number,
  streamNames: IStreamName[],
  streamPropertiesObject: number
}

/**
 * 4.1 Extended Stream Properties Object (optional, 1 per media stream)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/04_objects_in_the_asf_header_extension_object.html#4_1
 */
export class ExtendedStreamPropertiesObjectState extends State<IExtendedStreamPropertiesObject> {

  public static guid = GUID.ExtendedStreamPropertiesObject;

  constructor(header: IAsfObjectHeader) {
    super(header);
  }

  public get(buf: Uint8Array, off: number): IExtendedStreamPropertiesObject {
    const view = new DataView(buf.buffer, off);
    return {
      startTime: Token.UINT64_LE.get(buf, off),
      endTime: Token.UINT64_LE.get(buf, off + 8),
      dataBitrate: view.getInt32(12, true),
      bufferSize: view.getInt32(16, true),
      initialBufferFullness: view.getInt32(20, true),
      alternateDataBitrate: view.getInt32(24, true),
      alternateBufferSize: view.getInt32(28, true),
      alternateInitialBufferFullness: view.getInt32(32, true),
      maximumObjectSize: view.getInt32(36, true),
      flags: { // ToDo, check flag positions
        reliableFlag: util.getBit(buf, off + 40, 0),
        seekableFlag: util.getBit(buf, off + 40, 1),
        resendLiveCleanpointsFlag: util.getBit(buf, off + 40, 2)
      },
      // flagsNumeric: Token.UINT32_LE.get(buf, off + 64),
      streamNumber: view.getInt16(42, true),
      streamLanguageId: view.getInt16(44, true),
      averageTimePerFrame: view.getInt32(52, true),
      streamNameCount: view.getInt32(54, true),
      payloadExtensionSystems: view.getInt32(56, true),
      streamNames: [], // ToDo
      streamPropertiesObject: null
    };
  }
}

/**
 * 4.7  Metadata Object (optional, 0 or 1)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/04_objects_in_the_asf_header_extension_object.html#4_7
 */
export class MetadataObjectState extends State<ITag[]> {

  public static guid = GUID.MetadataObject;

  constructor(header: IAsfObjectHeader) {
    super(header);
  }

  public get(uint8Array: Uint8Array, off: number): ITag[] {
    const tags: ITag[] = [];

    const view = new DataView(uint8Array.buffer, off);
    const descriptionRecordsCount = view.getUint16(0, true);
    let pos =2;
    for (let i = 0; i < descriptionRecordsCount; i += 1) {
      pos += 4;
      const nameLen = view.getUint16(pos, true);
      pos += 2;
      const dataType = view.getUint16(pos, true);
      pos += 2;
      const dataLen = view.getUint32(pos, true);
      pos += 4;
      const name = AsfUtil.parseUnicodeAttr(uint8Array.slice(off + pos, off + pos + nameLen));
      pos += nameLen;
      const data = uint8Array.slice(off + pos, off + pos + dataLen);
      pos += dataLen;
      this.postProcessTag(tags, name, dataType, data);
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

export interface IWmPicture extends IPicture {
  type: string,
  format: string,
  description: string,
  size: number
  data: Uint8Array;
}

/**
 * Ref: https://msdn.microsoft.com/en-us/library/windows/desktop/dd757977(v=vs.85).aspx
 */
export class WmPictureToken implements IGetToken<IWmPicture> {

  public static fromBase64(base64str: string): IPicture {
    return this.fromBuffer(base64ToUint8Array(base64str));
  }

  public static fromBuffer(buffer: Uint8Array): IWmPicture {
    const pic = new WmPictureToken(buffer.length);
    return pic.get(buffer, 0);
  }

  constructor(public len) {
  }

  public get(buffer: Uint8Array, offset: number): IWmPicture {
    const view = new DataView(buffer.buffer, offset);

    const typeId = view.getUint8(0);
    const size = view.getInt32(1, true);
    let index = 5;

    while (view.getUint16(index) !== 0) {
      index += 2;
    }
    const format = new Token.StringType(index - 5, 'utf-16le').get(buffer, 5);

    while (view.getUint16(index) !== 0) {
      index += 2;
    }
    const description = new Token.StringType(index - 5, 'utf-16le').get(buffer, 5);

    return {
      type: AttachedPictureType[typeId],
      format,
      description,
      size,
      data: buffer.slice(index + 4)
    };
  }
}
