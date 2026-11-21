// lib/id3v2/FrameHeader.ts

import { textDecode } from '@borewit/text-codec';
import * as Token from 'token-types';
import type { IWarningCollector } from '../common/MetadataCollector.js';
import * as util from '../common/Util.js';
import { Id3v2ContentError } from './FrameParser.js';
import { type ID3v2MajorVersion, UINT32SYNCSAFE } from './ID3v2Token.js';

export interface IFrameFlags {
  status: {
    tag_alter_preservation: boolean;
    file_alter_preservation: boolean;
    read_only: boolean;
  };
  format: {
    grouping_identity: boolean;
    compression: boolean;
    encryption: boolean;
    unsynchronisation: boolean;
    data_length_indicator: boolean;
  };
}

export interface IFrameHeader {
  id: string;
  length: number;
  flags?: IFrameFlags;
}

/**
 * Frame header length (bytes) depending on ID3v2 major version.
 */
export function getFrameHeaderLength(majorVer: number): 6 | 10 {
  switch (majorVer) {
    case 2:
      return 6;
    case 3:
    case 4:
      return 10;
    default:
      throw makeUnexpectedMajorVersionError(majorVer);
  }
}

function readFrameFlags(b: Uint8Array, majorVer: 3 | 4): IFrameFlags {
  // ID3v2.3 and ID3v2.4 use different bit layouts for the frame status and format flags.
  if (majorVer === 3) {
    // ID3v2.3: status `%abc00000`, format `%ijk00000` (https://id3.org/id3v2.3.0)
    return {
      status: {
        tag_alter_preservation: util.getBit(b, 0, 7),
        file_alter_preservation: util.getBit(b, 0, 6),
        read_only: util.getBit(b, 0, 5)
      },
      format: {
        compression: util.getBit(b, 1, 7),
        encryption: util.getBit(b, 1, 6),
        grouping_identity: util.getBit(b, 1, 5),
        // Unsynchronisation and data-length-indicator do not exist as per-frame flags in ID3v2.3.
        unsynchronisation: false,
        data_length_indicator: false
      }
    };
  }
  // ID3v2.4: status `%0abc0000`, format `%0h00kmnp` (https://id3.org/id3v2.4.0-structure)
  return {
    status: {
      tag_alter_preservation: util.getBit(b, 0, 6),
      file_alter_preservation: util.getBit(b, 0, 5),
      read_only: util.getBit(b, 0, 4)
    },
    format: {
      grouping_identity: util.getBit(b, 1, 6),
      compression: util.getBit(b, 1, 3),
      encryption: util.getBit(b, 1, 2),
      unsynchronisation: util.getBit(b, 1, 1),
      data_length_indicator: util.getBit(b, 1, 0)
    }
  };
}

/**
 * Get the payload length of an ID3v2.4 frame.
 *
 * ID3v2.4 section 4 requires a synchsafe frame size, but iTunes and other writers store it as a plain
 * 32-bit integer, like ID3v2.3. Both encodings give the same value below 128.
 * Use the plain size when the synchsafe reading cannot be right: a size byte has its most significant bit set,
 * or only the plain size ends where the next frame, the padding or the tag ends.
 *
 * @param data - Frame data of the tag
 * @param offset - Offset of the frame payload in `data`, directly after the frame header
 * @param header - The 10 frame header bytes
 * @param syncSafeLength - Frame size decoded as a synchsafe integer
 */
export function getId3v24FrameLength(
  data: Uint8Array,
  offset: number,
  header: Uint8Array,
  syncSafeLength: number
): number {
  const plainLength = Token.UINT32_BE.get(header, 4);
  if (plainLength === syncSafeLength) {
    return syncSafeLength;
  }
  if (header.subarray(4, 8).some(byte => byte & 0x80)) {
    return plainLength;
  }
  if (!isFrameBoundary(data, offset + syncSafeLength) && isFrameBoundary(data, offset + plainLength)) {
    return plainLength;
  }
  return syncSafeLength;
}

function isFrameBoundary(data: Uint8Array, offset: number): boolean {
  if (offset >= data.length) {
    return offset === data.length;
  }
  if (data[offset] === 0) {
    return true; // padding
  }
  return offset + 4 <= data.length && /^[A-Z0-9]{4}$/.test(textDecode(data.subarray(offset, offset + 4), 'ascii'));
}

/**
 * Factory: parse a frame header from its header bytes (6 for v2.2, 10 for v2.3/v2.4).
 *
 * Note: It only *parses* and does light validation. It does not read payload bytes.
 */
export function readFrameHeader(
  uint8Array: Uint8Array,
  majorVer: ID3v2MajorVersion,
  warningCollector: IWarningCollector
): IFrameHeader {
  switch (majorVer) {
    case 2:
      return parseFrameHeaderV22(uint8Array, majorVer, warningCollector);

    case 3:
    case 4:
      return parseFrameHeaderV23V24(uint8Array, majorVer, warningCollector);

    default:
      throw makeUnexpectedMajorVersionError(majorVer);
  }
}

function parseFrameHeaderV22(uint8Array: Uint8Array, majorVer: 2, warningCollector: IWarningCollector): IFrameHeader {
  const header: IFrameHeader = {
    id: textDecode(uint8Array.subarray(0, 3), 'ascii'),
    length: Token.UINT24_BE.get(uint8Array, 3)
  };

  if (!header.id.match(/^[A-Z0-9]{3}$/)) {
    warningCollector.addWarning(`Invalid ID3v2.${majorVer} frame-header-ID: ${header.id}`);
  }

  return header;
}

function parseFrameHeaderV23V24(
  uint8Array: Uint8Array,
  majorVer: 3 | 4,
  warningCollector: IWarningCollector
): IFrameHeader {
  const header: IFrameHeader = {
    id: textDecode(uint8Array.subarray(0, 4), 'ascii'),
    length: (majorVer === 4 ? UINT32SYNCSAFE : Token.UINT32_BE).get(uint8Array, 4),
    flags: readFrameFlags(uint8Array.subarray(8, 10), majorVer)
  };

  if (!header.id.match(/^[A-Z0-9]{4}$/)) {
    warningCollector.addWarning(`Invalid ID3v2.${majorVer} frame-header-ID: ${header.id}`);
  }

  return header;
}

function makeUnexpectedMajorVersionError(majorVer: number): never {
  throw new Id3v2ContentError(`Unexpected majorVer: ${majorVer}`);
}
