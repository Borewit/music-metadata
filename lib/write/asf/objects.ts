import { textDecode, textEncode } from '@borewit/text-codec';
import { UINT16_LE, UINT32_LE, UINT64_LE } from 'token-types';
import AsfGuid from '../../asf/AsfGuid.js';
import { concatBytes, ensureAvailable } from '../core/bytes.js';
import { InvalidFileError, InvalidPatchError, UnsupportedFeatureError } from '../core/errors.js';

export const MAX_HEADER_BYTES = 64 * 1024 * 1024;
export const MAX_OBJECTS = 10_000;
export const CONTENT_NAMES = ['Title', 'Author', 'Copyright', 'Description', 'Rating'];
export const EXTENSION_RESERVED = new AsfGuid('ABD3D211-A9BA-11CF-8EE6-00C00C205365');

export interface Attribute {
  key: string;
  type: number;
  language: number;
  stream: number;
  length: number;
  value: Uint8Array | (() => Uint8Array);
  raw?: Uint8Array;
}

export interface AsfObject {
  guid: string;
  raw: Uint8Array;
  children?: AsfObject[];
  attributes?: Attribute[];
  content?: Uint8Array[];
  dirty?: boolean;
}

const protectedObjects = new Set([
  AsfGuid.ContentEncryptionObject.str,
  AsfGuid.ExtendedContentEncryptionObject.str,
  AsfGuid.AdvancedContentEncryptionObject.str,
  AsfGuid.DigitalSignatureObject.str,
  AsfGuid.MarkerObject.str,
  AsfGuid.IndexObject.str,
  AsfGuid.MediaObjectIndexObject.str,
  AsfGuid.TimecodeIndexObject.str
]);

/** Bound all object/record traversal, including opaque objects, before rewriting the header. */
export function parseObjects(bytes: Uint8Array, start: number, count?: number): AsfObject[] {
  const budget = { objects: 0, records: 0 };
  const parse = (data: Uint8Array, offset: number, expected?: number, nested = false): AsfObject[] => {
    const objects: AsfObject[] = [];
    while (offset < data.length && (expected === undefined || objects.length < expected)) {
      if (++budget.objects > MAX_OBJECTS) {
        throw new UnsupportedFeatureError('ASF header exceeds 10000 objects');
      }
      ensureAvailable(data, offset, 24);
      const size = safeSize(data, offset + 16);
      if (size < 24) {
        throw new InvalidFileError('Invalid ASF object size');
      }
      ensureAvailable(data, offset, size);
      const raw = data.subarray(offset, offset + size);
      const guid = AsfGuid.decode(raw);
      if (protectedObjects.has(guid)) {
        throw new UnsupportedFeatureError(
          'ASF encryption, signatures, markers and complex indexes cannot be rewritten'
        );
      }
      const object: AsfObject = { guid, raw };
      const body = raw.subarray(24);
      if (guid === AsfGuid.ASF_Index_Placeholder_Object.str && body.some(byte => byte !== 0)) {
        throw new UnsupportedFeatureError('ASF populated index placeholders cannot be rewritten');
      }
      if (guid === AsfGuid.HeaderExtensionObject.str) {
        if (nested) {
          throw new InvalidFileError('Nested ASF Header Extension Object');
        }
        ensureAvailable(body, 0, 22);
        if (
          AsfGuid.decode(body) !== EXTENSION_RESERVED.str ||
          UINT16_LE.get(body, 16) !== 6 ||
          UINT32_LE.get(body, 18) !== body.length - 22
        ) {
          throw new InvalidFileError('Invalid ASF Header Extension Object');
        }
        object.children = parse(body, 22, undefined, true);
      } else if (guid === AsfGuid.ContentDescriptionObject.str) {
        if (nested) {
          throw new InvalidFileError('ASF Content Description Object must be in the main header');
        }
        ensureAvailable(body, 0, 10);
        let position = 10;
        object.content = CONTENT_NAMES.map((_, index) => {
          const length = UINT16_LE.get(body, index * 2);
          ensureAvailable(body, position, length);
          const value = body.subarray(position, position + length);
          unicode(value);
          position += length;
          return value;
        });
        if (position !== body.length) {
          throw new InvalidFileError('ASF content lengths do not consume the object');
        }
      } else if (
        guid === AsfGuid.ExtendedContentDescriptionObject.str ||
        guid === AsfGuid.MetadataObject.str ||
        guid === AsfGuid.MetadataLibraryObject.str
      ) {
        const extended = guid === AsfGuid.ExtendedContentDescriptionObject.str;
        if (extended === nested) {
          throw new InvalidFileError('ASF metadata object is in the wrong header');
        }
        object.attributes = parseAttributes(body, extended);
        budget.records += object.attributes.length;
        if (budget.records > 100_000) {
          throw new UnsupportedFeatureError('ASF header exceeds 100000 metadata records');
        }
      } else if (nested && (guid === AsfGuid.FilePropertiesObject.str || guid === AsfGuid.StreamPropertiesObject.str)) {
        throw new UnsupportedFeatureError('ASF nested file/stream properties cannot be rewritten');
      }
      objects.push(object);
      offset += size;
    }
    if (offset !== data.length || (expected !== undefined && objects.length !== expected)) {
      throw new InvalidFileError('ASF object count does not consume the header');
    }
    return objects;
  };
  return parse(bytes, start, count);
}

function parseAttributes(bytes: Uint8Array, extended: boolean): Attribute[] {
  ensureAvailable(bytes, 0, 2);
  const count = UINT16_LE.get(bytes, 0);
  const attributes: Attribute[] = [];
  let offset = 2;
  for (let index = 0; index < count; index++) {
    const start = offset;
    ensureAvailable(bytes, offset, extended ? 2 : 12);
    const language = extended ? 0 : UINT16_LE.get(bytes, offset);
    const stream = extended ? 0 : UINT16_LE.get(bytes, offset + 2);
    const nameLength = UINT16_LE.get(bytes, offset + (extended ? 0 : 4));
    let type: number;
    let length: number;
    let key: string;
    if (extended) {
      offset += 2;
      ensureAvailable(bytes, offset, nameLength + 4);
      key = unicode(bytes.subarray(offset, offset + nameLength));
      offset += nameLength;
      type = UINT16_LE.get(bytes, offset);
      length = UINT16_LE.get(bytes, offset + 2);
      offset += 4;
    } else {
      type = UINT16_LE.get(bytes, offset + 6);
      length = UINT32_LE.get(bytes, offset + 8);
      offset += 12;
      ensureAvailable(bytes, offset, nameLength);
      key = unicode(bytes.subarray(offset, offset + nameLength));
      offset += nameLength;
    }
    ensureAvailable(bytes, offset, length);
    const value = bytes.subarray(offset, offset + length);
    // Unknown types retain their bytes; known types must be readable without an out-of-bounds access.
    if (
      (type === 0 && length % 2 !== 0) ||
      (type === 2 && length !== 2 && length !== 4) ||
      (type === 3 && length !== 4) ||
      (type === 4 && length !== 8) ||
      (type === 5 && length !== 2) ||
      (type === 6 && length !== 16)
    ) {
      throw new InvalidFileError('Invalid ASF attribute value length');
    }
    offset += length;
    attributes.push({ key, type, language, stream, length, value, raw: bytes.subarray(start, offset) });
  }
  if (offset !== bytes.length) {
    throw new InvalidFileError('ASF attribute count does not consume the object');
  }
  return attributes;
}

export function safeSize(bytes: Uint8Array, offset: number): number {
  ensureAvailable(bytes, offset, 8);
  const value = UINT64_LE.get(bytes, offset);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new InvalidFileError('ASF size exceeds the safe integer range');
  }
  return Number(value);
}

export function unicode(bytes: Uint8Array): string {
  if (bytes.length % 2 !== 0) {
    throw new InvalidFileError('ASF Unicode text has an odd byte length');
  }
  return textDecode(bytes, 'utf-16le').replace(/^\0+|\0+$/g, '');
}

/** UTF-16 byte lengths include the terminator, not code points (surrogate pairs take four bytes). */
export function textLength(value: string): number {
  if (typeof value !== 'string') {
    throw new InvalidPatchError('ASF text must be a string');
  }
  if (value.includes('\0') || /[\uD800-\uDFFF]/u.test(value)) {
    throw new InvalidPatchError('ASF text must not contain NUL or unpaired UTF-16 surrogates');
  }
  const length = (value.length + 1) * 2;
  if (length > MAX_HEADER_BYTES) {
    throw new UnsupportedFeatureError('ASF text exceeds 64 MiB');
  }
  return length;
}

export function encodeUnicode(value: string): Uint8Array {
  return textEncode(`${value}\0`, 'utf-16le');
}

export function objectBytes(guid: string, body: Uint8Array): Uint8Array {
  const head = new Uint8Array(24);
  head.set(AsfGuid.encode(guid));
  UINT64_LE.put(head, 16, BigInt(24 + body.length));
  return concatBytes(head, body);
}

export function attributeBytes(attribute: Attribute): Uint8Array {
  return typeof attribute.value === 'function' ? attribute.value() : attribute.value;
}

export function objectSize(object: AsfObject): number {
  if (object.children) {
    return 46 + object.children.reduce((sum, child) => sum + objectSize(child), 0);
  }
  if (!object.dirty) {
    return object.raw.length;
  }
  if (object.content) {
    return 34 + object.content.reduce((sum, value) => sum + value.length, 0);
  }
  const extended = object.guid === AsfGuid.ExtendedContentDescriptionObject.str;
  if ((object.attributes?.length ?? 0) > 0xffff) {
    throw new UnsupportedFeatureError('ASF metadata object exceeds 65535 attributes');
  }
  return 26 + (object.attributes ?? []).reduce((sum, attr) => sum + attributeSize(attr, extended), 0);
}

function attributeSize(attribute: Attribute, extended: boolean): number {
  if (attribute.raw) {
    return attribute.raw.length;
  }
  return (
    (extended ? 6 : 12) + textLength(attribute.key) + attribute.length + (extended && attribute.type === 2 ? 2 : 0)
  );
}

export function renderObject(object: AsfObject): Uint8Array {
  if (object.children) {
    const children = object.children.map(renderObject);
    const head = new Uint8Array(22);
    head.set(EXTENSION_RESERVED.toBin());
    UINT16_LE.put(head, 16, 6);
    UINT32_LE.put(
      head,
      18,
      children.reduce((sum, child) => sum + child.length, 0)
    );
    return objectBytes(object.guid, concatBytes(head, ...children));
  }
  if (!object.dirty) {
    return object.raw;
  }
  if (object.content) {
    const lengths = new Uint8Array(10);
    object.content.forEach((value, index) => {
      UINT16_LE.put(lengths, index * 2, value.length);
    });
    return objectBytes(object.guid, concatBytes(lengths, ...object.content));
  }
  const extended = object.guid === AsfGuid.ExtendedContentDescriptionObject.str;
  const attributes = object.attributes ?? [];
  const body = new Uint8Array(objectSize(object) - 24);
  UINT16_LE.put(body, 0, attributes.length);
  let offset = 2;
  for (const attribute of attributes) {
    if (attribute.raw) {
      body.set(attribute.raw, offset);
      offset += attribute.raw.length;
      continue;
    }
    const name = encodeUnicode(attribute.key);
    let value = attributeBytes(attribute);
    if (extended && attribute.type === 2) {
      value = concatBytes(value, new Uint8Array(2));
    }
    if (extended) {
      UINT16_LE.put(body, offset, name.length);
      body.set(name, offset + 2);
      offset += 2 + name.length;
      UINT16_LE.put(body, offset, attribute.type);
      UINT16_LE.put(body, offset + 2, value.length);
      offset += 4;
    } else {
      UINT16_LE.put(body, offset, attribute.language);
      UINT16_LE.put(body, offset + 2, attribute.stream);
      UINT16_LE.put(body, offset + 4, name.length);
      UINT16_LE.put(body, offset + 6, attribute.type);
      UINT32_LE.put(body, offset + 8, value.length);
      offset += 12;
      body.set(name, offset);
      offset += name.length;
    }
    body.set(value, offset);
    offset += value.length;
  }
  return objectBytes(object.guid, body);
}
