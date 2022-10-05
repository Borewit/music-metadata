import { isNumberBitSet } from "../../common/Util";
import { map } from "../combinate/map";
import { sequenceToObject } from "../combinate/sequence-to-object";
import { u32le, u64le } from "../primitive/integer";
import { pad } from "../primitive/skip";

import { guid, GUID } from "./guid";

import type { Unit } from "../type/unit";

/**
 * 3.2: File Properties Object (mandatory, one only)
 *
 * The File Properties Object defines the global characteristics of the combined digital media streams found within the Data Object.
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_2
 */
export interface FilePropertiesObject {
  /**
   * Specifies the unique identifier for this file.
   * The value of this field shall be regenerated every time the file is modified in any way.
   * The value of this field shall be identical to the value of the File ID field of the Data Object.
   */
  fileId: GUID;

  /**
   * Specifies the size, in bytes, of the entire file.
   * The value of this field is invalid if the Broadcast Flag bit in the Flags field is set to 1.
   */
  fileSize: bigint;
  /**
   * Specifies the date and time of the initial creation of the file. The value is given as the number of 100-nanosecond
   * intervals since January 1, 1601, according to Coordinated Universal Time (Greenwich Mean Time). The value of this
   * field may be invalid if the Broadcast Flag bit in the Flags field is set to 1.
   */
  creationDate: bigint;
  /**
   * Specifies the number of Data Packet entries that exist within the Data Object. The value of this field is invalid
   * if the Broadcast Flag bit in the Flags field is set to 1.
   */
  dataPacketsCount: bigint;
  /**
   * Specifies the time needed to play the file in 100-nanosecond units.
   * This value should include the duration (estimated, if an exact value is unavailable) of the the last media object
   * in the presentation. The value of this field is invalid if the Broadcast Flag bit in the Flags field is set to 1.
   */
  playDuration: bigint;
  /**
   * Specifies the time needed to send the file in 100-nanosecond units.
   * This value should include the duration of the last packet in the content.
   * The value of this field is invalid if the Broadcast Flag bit in the Flags field is set to 1.
   * Players can ignore this value.
   */
  sendDuration: bigint;
  /**
   * Specifies the amount of time to buffer data before starting to play the file, in millisecond units.
   * If this value is nonzero, the Play Duration field and all of the payload Presentation Time fields have been offset
   * by this amount. Therefore, player software must subtract the value in the preroll field from the play duration and
   * presentation times to calculate their actual values. It follows that all payload Presentation Time fields need to
   * be at least this value.
   */
  preroll: bigint;
  /**
   * The flags
   */
  flags: {
    /**
     * Specifies, if set, that a file is in the process of being created (for example, for recording applications),
     * and thus that various values stored in the header objects are invalid. It is highly recommended that
     * post-processing be performed to remove this condition at the earliest opportunity.
     */
    broadcast: boolean;
    /**
     * Specifies, if set, that a file is seekable.
     * Note that for files containing a single audio stream and a Minimum Data Packet Size field equal to the Maximum
     * Data Packet Size field, this flag shall always be set to 1.
     * For files containing a single audio stream and a video stream or mutually exclusive video streams,
     * this flag is only set to 1 if the file contains a matching Simple Index Object for each regular video stream
     * (that is, video streams that are not hidden according to the method described in section 8.2.2).
     */
    seekable: boolean;
  };
  /**
   * Specifies the minimum Data Packet size in bytes. In general, the value of this field is invalid if the Broadcast
   * Flag bit in the Flags field is set to 1.
   * However, for the purposes of this specification, the values for the Minimum Data Packet Size and Maximum Data
   * Packet Size fields shall be set to the same value, and this value should be set to the packet size, even when the
   * Broadcast Flag in the Flags field is set to 1.
   */
  minimumDataPacketSize: number;
  /**
   * Specifies the maximum Data Packet size in bytes.
   * In general, the value of this field is invalid if the Broadcast Flag bit in the Flags field is set to 1.
   * However, for the purposes of this specification, the values of the Minimum Data Packet Size and Maximum Data Packet
   * Size fields shall be set to the same value,
   * and this value should be set to the packet size, even when the Broadcast Flag field is set to 1.
   */
  maximumDataPacketSize: number;
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
  maximumBitrate: number;
}

export const filePropertiesObject = (size: number): Unit<FilePropertiesObject, RangeError> =>
  pad(
    sequenceToObject(
      {
        fileId: 0,
        fileSize: 1,
        creationDate: 2,
        dataPacketsCount: 3,
        playDuration: 4,
        sendDuration: 5,
        preroll: 6,
        flags: 7,
        minimumDataPacketSize: 8,
        maximumDataPacketSize: 9,
        maximumBitrate: 10,
      },
      guid,
      u64le,
      u64le,
      u64le,
      u64le,
      u64le,
      u64le,
      map(u32le, (value) => {
        return {
          broadcast: isNumberBitSet(value, 24),
          seekable: isNumberBitSet(value, 25),
        };
      }),
      u32le,
      u32le,
      u32le
    ),
    size
  );
