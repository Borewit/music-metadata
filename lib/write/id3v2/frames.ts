import { textDecode, textEncode } from '@borewit/text-codec';
import { TokenWriter } from 'strtok3';
import { UINT16_BE, UINT32_BE } from 'token-types';
import { normalizePictureMimeType, pictureTypeToNumber } from '../../tokens/flac.js';
import { UINT32SYNCSAFE } from '../../tokens/id3v2.js';
import { InvalidFileError, InvalidPatchError, UnsupportedFeatureError } from '../core/errors.js';

export interface Frame {
  id: string;
  flags: number;
  data: Uint8Array;
}

export function syncSafe(data: Uint8Array, offset: number): number {
  if (offset + 4 > data.length || data.subarray(offset, offset + 4).some(byte => byte > 127)) {
    throw new InvalidFileError('Invalid ID3 sync-safe integer');
  }
  return UINT32SYNCSAFE.get(data, offset);
}

export function encodeFrame(frame: Frame): Uint8Array {
  const writer = new TokenWriter(10 + frame.data.length);
  writer.writeBuffer(textEncode(frame.id, 'latin1'));
  writer.writeToken(UINT32SYNCSAFE, frame.data.length);
  writer.writeToken(UINT16_BE, frame.flags);
  writer.writeBuffer(frame.data);
  return writer.toUint8Array();
}

export function decodeText(data: Uint8Array): string {
  const encoding = data[0];
  const bytes = data.subarray(1);
  switch (encoding) {
    case 0:
      return textDecode(bytes, 'latin1');
    case 1:
      // biome-ignore lint/style/noRestrictedGlobals: Standard UTF decoding is supported in Node 22 and browsers.
      return new TextDecoder(bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-16le').decode(bytes);
    case 2:
      // biome-ignore lint/style/noRestrictedGlobals: Standard UTF decoding is supported in Node 22 and browsers.
      return new TextDecoder('utf-16be').decode(bytes);
    case 3:
      return textDecode(bytes, 'utf-8');
    default:
      throw new InvalidFileError('Invalid ID3 text encoding');
  }
}

function utf8(value: unknown): Uint8Array {
  if (typeof value !== 'string' || value.includes('\0')) {
    throw new InvalidPatchError('ID3 text must be a string without NUL characters');
  }
  return textEncode(value, 'utf-8');
}

function latin(value: unknown): Uint8Array {
  if (typeof value !== 'string' || value.includes('\0') || [...value].some(c => c.charCodeAt(0) > 255)) {
    throw new InvalidPatchError('ID3 identifier must be Latin-1 without NUL characters');
  }
  return textEncode(value, 'latin1');
}

function join(...parts: Uint8Array[]): Uint8Array {
  const writer = new TokenWriter();
  for (const part of parts) {
    writer.writeBuffer(part);
  }
  return writer.toUint8Array();
}
const zero = Uint8Array.of(0);
const encoding = Uint8Array.of(3);

/** Encode supported native frame shapes, or accept an explicit raw frame body. */
export function makeFrames(key: string, value: unknown): Frame[] {
  const [id, ...descriptionParts] = key.split(':');
  if (!id || !/^[A-Z0-9]{4}$/.test(id)) {
    throw new InvalidPatchError(`Invalid ID3 frame ID: ${key}`);
  }
  if (descriptionParts.length && id !== 'TXXX' && id !== 'WXXX') {
    throw new InvalidPatchError('Only TXXX and WXXX accept a description in the frame key');
  }
  const description = descriptionParts.join(':');
  if (value === null) {
    return [];
  }
  if (value instanceof Uint8Array) {
    return [{ id, flags: 0, data: value }];
  }
  const values = Array.isArray(value) ? value : [value];
  if (id.startsWith('T') && id !== 'TIPL' && id !== 'TMCL') {
    const strings = values.map(utf8);
    const payload = join(...strings.flatMap((s, i) => (i ? [zero, s] : [s])));
    return [
      { id, flags: 0, data: id === 'TXXX' ? join(encoding, utf8(description), zero, payload) : join(encoding, payload) }
    ];
  }
  return values.map(value => {
    if (value instanceof Uint8Array) {
      return { id, flags: 0, data: value };
    }
    let data: Uint8Array;
    if (
      ['APIC', 'COMM', 'USLT', 'SYLT', 'UFID', 'POPM', 'TIPL', 'TMCL'].includes(id) &&
      (typeof value !== 'object' || value === null || Array.isArray(value))
    ) {
      throw new InvalidPatchError(`${id} requires a structured native value`);
    }
    const object = value as Record<string, unknown>;
    switch (id) {
      case 'APIC': {
        if (!object || !(object.data instanceof Uint8Array)) {
          throw new InvalidPatchError('APIC requires picture data');
        }
        const format = normalizePictureMimeType(String(object.format));
        const description = utf8(object.description ?? '');
        // Some Windows thumbnail readers reject UTF-8 APIC frames with an empty description.
        const pictureEncoding = description.length === 0 ? zero : encoding;
        data = join(
          pictureEncoding,
          latin(format),
          zero,
          Uint8Array.of(pictureTypeToNumber(object.type as string | undefined)),
          description,
          zero,
          object.data
        );
        break;
      }
      case 'COMM':
      case 'USLT': {
        if (!object) {
          throw new InvalidPatchError(`${id} requires text`);
        }
        const language = object.language ?? 'eng';
        if (typeof language !== 'string' || !/^[a-zA-Z]{3}$/.test(language)) {
          throw new InvalidPatchError('Invalid ID3 language');
        }
        data = join(encoding, latin(language), utf8(object.descriptor ?? ''), zero, utf8(object.text));
        break;
      }
      case 'SYLT': {
        const language = object.language ?? 'eng';
        const format = object.timeStampFormat;
        const contentType = object.contentType;
        if (
          typeof language !== 'string' ||
          !/^[a-zA-Z]{3}$/.test(language) ||
          ![1, 2].includes(Number(format)) ||
          !Number.isInteger(contentType) ||
          Number(contentType) < 0 ||
          Number(contentType) > 8 ||
          !Array.isArray(object.syncText)
        ) {
          throw new InvalidPatchError('Invalid synchronized lyrics');
        }
        const parts = [
          encoding,
          latin(language),
          Uint8Array.of(Number(format), Number(contentType)),
          utf8(object.descriptor ?? ''),
          zero
        ];
        for (const line of object.syncText) {
          if (!Number.isInteger(line.timestamp) || line.timestamp < 0 || line.timestamp > 0xffffffff) {
            throw new InvalidPatchError('Invalid lyric timestamp');
          }
          const timestamp = new Uint8Array(4);
          UINT32_BE.put(timestamp, 0, line.timestamp);
          parts.push(utf8(line.text), zero, timestamp);
        }
        data = join(...parts);
        break;
      }
      case 'PCNT': {
        const counter = Number(value);
        if (!Number.isSafeInteger(counter) || counter < 0) {
          throw new InvalidPatchError('Invalid play counter');
        }
        let n = BigInt(counter);
        const bytes: number[] = [];
        do {
          bytes.unshift(Number(n & 255n));
          n >>= 8n;
        } while (n || bytes.length < 4);
        data = Uint8Array.from(bytes);
        break;
      }
      case 'PCST':
        data = Uint8Array.of(0, ...(String(value) === '1' ? [] : [48]));
        break;
      case 'MVNM':
      case 'MVIN':
        data = join(encoding, utf8(value));
        break;
      case 'UFID': {
        if (!object || !(object.identifier instanceof Uint8Array) || object.identifier.length > 64) {
          throw new InvalidPatchError('UFID requires at most 64 identifier bytes');
        }
        data = join(latin(object.owner_identifier), zero, object.identifier);
        break;
      }
      case 'POPM': {
        if (!object || !Number.isInteger(object.rating) || Number(object.rating) < 0 || Number(object.rating) > 255) {
          throw new InvalidPatchError('POPM rating must be between 0 and 255');
        }
        const counter = object.counter ?? 0;
        if (!Number.isSafeInteger(counter) || Number(counter) < 0 || Number(counter) > 0xffffffff) {
          throw new InvalidPatchError('POPM counter must be an unsigned 32-bit integer');
        }
        const bytes = new Uint8Array(4);
        UINT32_BE.put(bytes, 0, Number(counter));
        data = join(latin(object.email ?? ''), zero, Uint8Array.of(Number(object.rating)), bytes);
        break;
      }
      case 'TIPL':
      case 'TMCL': {
        if (!object || typeof object !== 'object') {
          throw new InvalidPatchError(`${id} requires a role map`);
        }
        const pairs: Uint8Array[] = [];
        for (const [role, people] of Object.entries(object)) {
          if (!Array.isArray(people)) {
            throw new InvalidPatchError('ID3 role values must be arrays');
          }
          for (const person of people) {
            pairs.push(utf8(role), zero, utf8(person), zero);
          }
        }
        data = join(encoding, ...pairs);
        break;
      }
      default:
        if (!id.startsWith('W')) {
          throw new UnsupportedFeatureError(`Writing ${id} requires a raw Uint8Array body`);
        }
        data = id === 'WXXX' ? join(encoding, utf8(description), zero, latin(value)) : latin(value);
    }
    return { id, flags: 0, data };
  });
}
