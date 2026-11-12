import { TokenWriter } from 'strtok3';
import { UINT8 } from 'token-types';
import { AdtsFrameHeader } from '../../mpeg/AdtsFrameHeader.js';
import { UINT32SYNCSAFE } from '../../tokens/id3v2.js';
import {
  InvalidFileError,
  InvalidPatchError,
  UnsupportedFeatureError,
  UnsupportedFormatError
} from '../core/errors.js';
import type { ByteSource } from '../core/source.js';
import type { TagPatch, WriteOptions } from '../core/types.js';
import { applyId3Patch } from '../mapping/id3v2.js';
import { decodeText, encodeFrame, type Frame, makeFrames, syncSafe } from './frames.js';

const MAX_TAG_SIZE = 64 * 1024 * 1024;

/** Validate the first audio header without interpreting or rewriting the payload. */
function validateAudioHeader(audio: Uint8Array, audioLength: number): 'mp3' | 'aac' {
  if (audio.length >= 2 && audio[0] === 255 && (audio[1] & 0xf6) === 0xf0) {
    if (audio.length < 7) {
      throw new InvalidFileError('Truncated ADTS header');
    }
    const header = new AdtsFrameHeader(audio);
    if (header.samplingRate === null) {
      throw new InvalidFileError('Invalid ADTS sampling-frequency index');
    }
    const frameLength = header.frameLength | (audio[4] << 3) | (audio[5] >> 5);
    if (frameLength <= header.headerLength) {
      throw new InvalidFileError('Invalid ADTS frame length');
    }
    if (frameLength > audioLength) {
      throw new InvalidFileError('ADTS frame exceeds file size');
    }
    return 'aac';
  }
  if (
    audio.length < 4 ||
    audio[0] !== 255 ||
    (audio[1] & 0xe0) !== 0xe0 ||
    (audio[1] & 0x18) === 0x08 ||
    (audio[1] & 0x06) === 0 ||
    (audio[2] & 0xf0) === 0xf0 ||
    (audio[2] & 0x0c) === 0x0c
  ) {
    throw new UnsupportedFormatError('ID3 tag is not followed by MPEG audio or ADTS AAC');
  }
  return 'mp3';
}

export async function buildId3Update(source: ByteSource, patch: TagPatch, options: WriteOptions, embedded = false) {
  let audioOffset = 0;
  let oldLength = 0;
  const frames: Frame[] = [];
  let audioEnd = source.size;
  if (!embedded && options.replaceId3 && source.size >= 128) {
    const tail = await source.read(source.size - 128, 3);
    if (tail[0] === 84 && tail[1] === 65 && tail[2] === 71) {
      audioEnd -= 128;
    }
  }
  const header = await source.read(0, Math.min(10, source.size));
  if (header[0] === 73 && header[1] === 68 && header[2] === 51) {
    if (header.length < 10) {
      throw new InvalidFileError('Truncated ID3 header');
    }
    if (options.replaceId3) {
      if (![2, 3, 4].includes(header[3])) {
        throw new UnsupportedFeatureError('Unsupported ID3 version');
      }
      const allowedFlags = header[3] === 2 ? 0xc0 : header[3] === 3 ? 0xe0 : 0xf0;
      if (header[4] === 255 || (header[5] & ~allowedFlags) !== 0) {
        throw new InvalidFileError('Invalid ID3 header');
      }
      const length = syncSafe(header, 6);
      if (length > MAX_TAG_SIZE) {
        throw new InvalidFileError('ID3 tag exceeds 64 MiB');
      }
      const hasFooter = header[3] === 4 && (header[5] & 0x10) !== 0;
      audioOffset = 10 + length + (hasFooter ? 10 : 0);
      if (audioOffset > audioEnd) {
        throw new InvalidFileError('ID3 tag exceeds file size');
      }
      if (hasFooter) {
        const footer = await source.read(audioOffset - 10, 10);
        if (
          footer[0] !== 51 ||
          footer[1] !== 68 ||
          footer[2] !== 73 ||
          !footer.subarray(3).every((value, index) => value === header[index + 3])
        ) {
          throw new InvalidFileError('Invalid ID3 footer');
        }
      }
    } else {
      if (header[3] !== 4) {
        throw new UnsupportedFeatureError('Only ID3v2.4 tags are writable');
      }
      if (header[4] !== 0 || (header[5] & ~0x20) !== 0) {
        throw new UnsupportedFeatureError('ID3 tag flags, extended headers and footers are not supported');
      }
      oldLength = syncSafe(header, 6);
      if (oldLength > MAX_TAG_SIZE) {
        throw new InvalidFileError('ID3 tag exceeds 64 MiB');
      }
      audioOffset = 10 + oldLength;
      if (audioOffset > source.size) {
        throw new InvalidFileError('ID3 tag exceeds file size');
      }
      const data = await source.read(10, oldLength);
      let offset = 0;
      while (offset < data.length) {
        if (data[offset] === 0) {
          if (data.subarray(offset).some(byte => byte !== 0)) {
            throw new InvalidFileError('Nonzero ID3 padding');
          }
          break;
        }
        if (offset + 10 > data.length) {
          throw new InvalidFileError('Truncated ID3 frame header');
        }
        const id = String.fromCharCode(...data.subarray(offset, offset + 4));
        if (!/^[A-Z0-9]{4}$/.test(id)) {
          throw new InvalidFileError('Invalid ID3 frame ID');
        }
        const size = syncSafe(data, offset + 4);
        if (size === 0) {
          throw new InvalidFileError('Empty ID3 frame');
        }
        const flags = (data[offset + 8] << 8) | data[offset + 9];
        if ((flags & ~0x704f) !== 0) {
          throw new InvalidFileError('Reserved ID3 frame flags');
        }
        if (offset + 10 + size > data.length) {
          throw new InvalidFileError('ID3 frame exceeds tag size');
        }
        frames.push({ id, flags, data: data.slice(offset + 10, offset + 10 + size) });
        offset += 10 + size;
        if (frames.length > 100_000) {
          throw new InvalidFileError('Too many ID3 frames');
        }
      }
    }
  }
  const format: 'mp3' | 'aac' | 'wav' = embedded
    ? 'wav'
    : validateAudioHeader(await source.read(audioOffset, Math.min(7, audioEnd - audioOffset)), audioEnd - audioOffset);
  const replace = (key: string, value: unknown) => {
    const [id, ...description] = key.split(':');
    const matches = (frame: Frame) => {
      if (frame.id !== id) {
        return false;
      }
      if (description.length === 0) {
        return true;
      }
      if (frame.flags & 0x4f) {
        throw new UnsupportedFeatureError(`Cannot identify flagged ${id} frames safely`);
      }
      return decodeText(frame.data).split('\0')[0]?.toLowerCase() === description.join(':').toLowerCase();
    };
    const index = frames.findIndex(matches);
    const retained = frames.filter(frame => !matches(frame));
    retained.splice(index < 0 ? retained.length : Math.min(index, retained.length), 0, ...makeFrames(key, value));
    frames.splice(0, frames.length, ...retained);
  };
  applyId3Patch(frames, patch, replace);
  for (const [key, value] of Object.entries(patch.native ?? {})) {
    replace(key, value);
  }

  const encoded = frames.map(encodeFrame);
  const length = encoded.reduce((sum, frame) => sum + frame.length, 0);
  const padding = options.padding ?? 8192;
  if (!Number.isSafeInteger(padding) || padding < 0) {
    throw new InvalidPatchError('padding must be a non-negative integer');
  }
  const bodyLength = padding === 0 ? length : Math.max(oldLength, length + padding);
  if (bodyLength > MAX_TAG_SIZE) {
    throw new InvalidPatchError('ID3 tag exceeds 64 MiB');
  }
  const writer = new TokenWriter(bodyLength + 10);
  writer.writeBuffer(Uint8Array.of(73, 68, 51, 4, 0));
  writer.writeToken(UINT8, 0);
  writer.writeToken(UINT32SYNCSAFE, bodyLength);
  for (const frame of encoded) {
    writer.writeBuffer(frame);
  }
  writer.writeZeros(bodyLength - length);
  return {
    format,
    metadata: writer.toUint8Array(),
    audioOffset,
    audioLength: audioEnd - audioOffset,
    paddingBytes: bodyLength - length
  };
}
