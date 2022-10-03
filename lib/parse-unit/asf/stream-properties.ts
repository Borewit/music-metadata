import { map } from "../combinate/map";
import { sequenceToObject } from "../combinate/sequence-to-object";
import { pad } from "../primitive/skip";

import {
  AudioMedia,
  BinaryMedia,
  CommandMedia,
  Degradable_JPEG_Media,
  FileTransferMedia,
  guid,
  GUID,
  VideoMedia,
} from "./guid";

import type { Unit } from "../type/unit";

/**
 * 3.3 Stream Properties Object (mandatory, one per stream)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_3
 */
export interface StreamPropertiesObject {
  /**
   * Stream Type
   */
  streamType: string | undefined;

  /**
   * Error Correction Type
   */
  errorCorrectionType: GUID;
}

export const streamPropertiesObject = (size: number): Unit<StreamPropertiesObject, RangeError> =>
  pad(
    sequenceToObject(
      {
        streamType: 0,
        errorCorrectionType: 1,
      },
      map(guid, (value) => decodeMediaType(value)),
      guid
    ),
    size
  );

/**
 * Decode stream type
 * @param mediaType Media type GUID
 * @returns Media type
 */
const decodeMediaType = (
  mediaType: GUID
): "audio" | "video" | "command" | "degradable-jpeg" | "file-transfer" | "binary" | undefined => {
  switch (mediaType.str) {
    case AudioMedia.str:
      return "audio";
    case VideoMedia.str:
      return "video";
    case CommandMedia.str:
      return "command";
    case Degradable_JPEG_Media.str:
      return "degradable-jpeg";
    case FileTransferMedia.str:
      return "file-transfer";
    case BinaryMedia.str:
      return "binary";
  }
};
