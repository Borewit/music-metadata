import { textEncode } from '@borewit/text-codec';
import { TokenWriter } from 'strtok3';
import { UINT32_BE } from 'token-types';

import { normalizePictureMimeType, pictureTypeToNumber } from '../../tokens/flac.js';

/**
 * Writable picture shape accepted by `encodePicture` from `/flac/write`.
 *
 * `typeId` wins over `type`; the camelCase colour fields win over the legacy
 * snake_case names.
 */
export interface PictureWriteInfo {
  type?: string;
  typeId?: number;
  format: string;
  description?: string;
  width?: number;
  height?: number;
  colourDepth?: number;
  colours?: number;
  colour_depth?: number;
  indexed_color?: number;
  data: Uint8Array;
}

const MAX_UINT32 = 0xffffffff;

function assertLength(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_UINT32) {
    throw new RangeError(`${label} length must be between 0 and ${MAX_UINT32}, got ${value}`);
  }
}

function pictureValue(value: number | undefined, label: string): number {
  const result = value ?? 0;
  assertLength(result, label);
  return result;
}

/**
 * Encode a FLAC PICTURE block body.
 *
 * The MIME type is normalized (`jpg`/`jpeg` and `png` become their `image/*`
 * forms) and every length is checked before allocation.
 */
export function encodePicture(picture: PictureWriteInfo): Uint8Array {
  const format = textEncode(normalizePictureMimeType(picture.format), 'utf-8');
  const description = textEncode(picture.description ?? '', 'utf-8');
  const typeId = picture.typeId ?? pictureTypeToNumber(picture.type);
  const width = pictureValue(picture.width, 'Picture width');
  const height = pictureValue(picture.height, 'Picture height');
  const colourDepth = pictureValue(picture.colourDepth ?? picture.colour_depth, 'Picture colour depth');
  const colours = pictureValue(picture.colours ?? picture.indexed_color, 'Picture colour count');

  assertLength(typeId, 'Picture type');
  assertLength(format.length, 'Picture MIME type');
  assertLength(description.length, 'Picture description');
  assertLength(picture.data.length, 'Picture data');

  const size = 32 + format.length + description.length + picture.data.length;
  const writer = new TokenWriter(size);

  writer.writeToken(UINT32_BE, typeId);
  writer.writeToken(UINT32_BE, format.length);
  writer.writeBuffer(format);

  writer.writeToken(UINT32_BE, description.length);
  writer.writeBuffer(description);

  writer.writeToken(UINT32_BE, width);
  writer.writeToken(UINT32_BE, height);
  writer.writeToken(UINT32_BE, colourDepth);
  writer.writeToken(UINT32_BE, colours);
  writer.writeToken(UINT32_BE, picture.data.length);
  writer.writeBuffer(picture.data);

  return writer.toUint8Array();
}
