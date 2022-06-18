import * as util from "../common/Util";
import * as Token from "../token-types";
import { ExtendedStreamPropertiesObject } from "./GUID";
import { State } from "./State";

export interface IStreamName {
  streamLanguageId: number;
  streamName: string;
}

/**
 * 4.1 Extended Stream Properties Object (optional, 1 per media stream)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/04_objects_in_the_asf_header_extension_object.html#4_1
 */
export interface IExtendedStreamPropertiesObject {
  startTime: bigint;
  endTime: bigint;
  dataBitrate: number;
  bufferSize: number;
  initialBufferFullness: number;
  alternateDataBitrate: number;
  alternateBufferSize: number;
  alternateInitialBufferFullness: number;
  maximumObjectSize: number;
  flags: {
    reliableFlag: boolean;
    seekableFlag: boolean;
    resendLiveCleanpointsFlag: boolean;
  };
  // flagsNumeric: Token.UINT32_LE.get(buf, off + 64),
  streamNumber: number;
  streamLanguageId: number;
  averageTimePerFrame: number;
  streamNameCount: number;
  payloadExtensionSystems: number;
  streamNames: IStreamName[];
  streamPropertiesObject: number;
}

/**
 * 4.1 Extended Stream Properties Object (optional, 1 per media stream)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/04_objects_in_the_asf_header_extension_object.html#4_1
 */
export class ExtendedStreamPropertiesObjectState extends State<IExtendedStreamPropertiesObject> {
  public static guid = ExtendedStreamPropertiesObject;



  public get(buf: Buffer, off: number): IExtendedStreamPropertiesObject {
    return {
      startTime: Token.UINT64_LE.get(buf, off),
      endTime: Token.UINT64_LE.get(buf, off + 8),
      dataBitrate: buf.readInt32LE(off + 12),
      bufferSize: buf.readInt32LE(off + 16),
      initialBufferFullness: buf.readInt32LE(off + 20),
      alternateDataBitrate: buf.readInt32LE(off + 24),
      alternateBufferSize: buf.readInt32LE(off + 28),
      alternateInitialBufferFullness: buf.readInt32LE(off + 32),
      maximumObjectSize: buf.readInt32LE(off + 36),
      flags: {
        // ToDo, check flag positions
        reliableFlag: util.getBit(buf, off + 40, 0),
        seekableFlag: util.getBit(buf, off + 40, 1),
        resendLiveCleanpointsFlag: util.getBit(buf, off + 40, 2),
      },
      // flagsNumeric: Token.UINT32_LE.get(buf, off + 64),
      streamNumber: buf.readInt16LE(off + 42),
      streamLanguageId: buf.readInt16LE(off + 44),
      averageTimePerFrame: buf.readInt32LE(off + 52),
      streamNameCount: buf.readInt32LE(off + 54),
      payloadExtensionSystems: buf.readInt32LE(off + 56),
      streamNames: [], // ToDo
      streamPropertiesObject: null,
    };
  }
}
