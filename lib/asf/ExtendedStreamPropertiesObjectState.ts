import { getBit } from "../common/Util";
import { UINT64_LE, INT32_LE, INT16_LE } from "../token-types";

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
  streamPropertiesObject: number | null;
}

/**
 * 4.1 Extended Stream Properties Object (optional, 1 per media stream)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/04_objects_in_the_asf_header_extension_object.html#4_1
 */
export class ExtendedStreamPropertiesObjectState extends State<IExtendedStreamPropertiesObject> {
  public static guid = ExtendedStreamPropertiesObject;

  public get(buf: Uint8Array, off: number): IExtendedStreamPropertiesObject {
    return {
      startTime: UINT64_LE.get(buf, off),
      endTime: UINT64_LE.get(buf, off + 8),
      dataBitrate: INT32_LE.get(buf, off + 12),
      bufferSize: INT32_LE.get(buf, off + 16),
      initialBufferFullness: INT32_LE.get(buf, off + 20),
      alternateDataBitrate: INT32_LE.get(buf, off + 24),
      alternateBufferSize: INT32_LE.get(buf, off + 28),
      alternateInitialBufferFullness: INT32_LE.get(buf, off + 32),
      maximumObjectSize: INT32_LE.get(buf, off + 36),
      flags: {
        // ToDo, check flag positions
        reliableFlag: getBit(buf, off + 40, 0),
        seekableFlag: getBit(buf, off + 40, 1),
        resendLiveCleanpointsFlag: getBit(buf, off + 40, 2),
      },
      // flagsNumeric: Token.UINT32_LE.get(buf, off + 64),
      streamNumber: INT16_LE.get(buf, off + 42),
      streamLanguageId: INT16_LE.get(buf, off + 44),
      averageTimePerFrame: INT32_LE.get(buf, off + 52),
      streamNameCount: INT32_LE.get(buf, off + 54),
      payloadExtensionSystems: INT32_LE.get(buf, off + 56),
      streamNames: [], // ToDo
      streamPropertiesObject: null,
    };
  }
}
