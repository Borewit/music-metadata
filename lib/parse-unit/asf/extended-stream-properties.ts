import { isNumberBitSet } from "../../common/Util";
import { map } from "../combinate/map";
import { sequenceToObject } from "../combinate/sequence-to-object";
import { u16le, u32be, u32le, u64le } from "../primitive/integer";
import { val } from "../primitive/value";

import type { Unit } from "../type/unit";

export interface StreamName {
  streamLanguageId: number;
  streamName: string;
}

/**
 * 4.1 Extended Stream Properties Object (optional, 1 per media stream)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/04_objects_in_the_asf_header_extension_object.html#4_1
 */
export interface ExtendedStreamPropertiesObject {
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
    reliable: boolean;
    seekable: boolean;
    noCleanpoints: boolean;
    resendLiveCleanpoints: boolean;
  };
  // flagsNumeric: Token.UINT32_LE.get(buf, off + 64),
  streamNumber: number;
  streamLanguageId: number;
  averageTimePerFrame: bigint;
  streamNameCount: number;
  payloadExtensionSystems: number;
  streamNames: StreamName[];
  streamPropertiesObject: number | null;
}

export const extendedStreamPropertiesObject: Unit<ExtendedStreamPropertiesObject, RangeError> = sequenceToObject(
  {
    startTime: 0,
    endTime: 1,
    dataBitrate: 2,
    bufferSize: 3,
    initialBufferFullness: 4,
    alternateDataBitrate: 5,
    alternateBufferSize: 6,
    alternateInitialBufferFullness: 7,
    maximumObjectSize: 8,
    flags: 9,
    streamNumber: 10,
    streamLanguageId: 11,
    averageTimePerFrame: 12,
    streamNameCount: 13,
    payloadExtensionSystems: 14,
    streamNames: 15, // ToDo
    streamPropertiesObject: 16,
  },
  u64le,
  u64le,
  u32le,
  u32le,
  u32le,
  u32le,
  u32le,
  u32le,
  u32le,
  map(u32be, (value) => {
    return {
      // ToDo, check flag positions
      reliable: isNumberBitSet(value, 31),
      seekable: isNumberBitSet(value, 30),
      noCleanpoints: isNumberBitSet(value, 29),
      resendLiveCleanpoints: isNumberBitSet(value, 28),
    };
  }),
  u16le,
  u16le,
  u64le,
  u16le,
  u16le,
  val([]), // ToDo
  val(null)
);
