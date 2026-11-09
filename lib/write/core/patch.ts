import { InvalidPatchError } from './errors.js';
import type { Comment, NumberPairPatch, Picture, TextPatch } from './types.js';

export function textValues(value: TextPatch | undefined): string[] | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return [value];
  }
  if (!Array.isArray(value)) {
    throw new InvalidPatchError(`Expected a string, an array of strings, or null; got ${typeof value}`);
  }
  for (const entry of value) {
    if (typeof entry !== 'string') {
      throw new InvalidPatchError(`Expected an array of strings; got ${typeof entry}`);
    }
  }
  return [...value];
}

export function numberValue(value: number | string | null | undefined): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new InvalidPatchError(`Expected a finite number; got '${String(value)}'`);
  }
  return parsed;
}

export function normalizeComments(
  value: Comment | readonly Comment[] | string | null | undefined
): Comment[] | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return [{ text: value }];
  }
  const entries = Array.isArray(value) ? value : [value];
  return entries.map(entry => {
    if (typeof entry === 'string') {
      return { text: entry };
    }
    if (typeof entry !== 'object' || entry === null || (entry.text !== undefined && typeof entry.text !== 'string')) {
      throw new InvalidPatchError('Each comment must be a string or an object with a text property');
    }
    return { ...entry, text: entry.text ?? '' };
  });
}

export function validatePictures(value: readonly Picture[] | null | undefined): Picture[] | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (!Array.isArray(value)) {
    throw new InvalidPatchError('picture must be an array of pictures or null');
  }
  return value.map((picture, index) => {
    if (typeof picture !== 'object' || picture === null) {
      throw new InvalidPatchError(`picture[${index}] must be an object`);
    }
    if (typeof picture.format !== 'string' || picture.format.length === 0) {
      throw new InvalidPatchError(`picture[${index}].format must be a non-empty string`);
    }
    if (!(picture.data instanceof Uint8Array)) {
      throw new InvalidPatchError(`picture[${index}].data must be a Uint8Array`);
    }
    return {
      ...picture,
      data: picture.data
    };
  });
}

export function normalizeNumberPair(
  value: NumberPairPatch | null | undefined,
  label: string
): NumberPairPatch | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }
  if (typeof value !== 'object') {
    throw new InvalidPatchError(`${label} must be an object with no/of properties, or null`);
  }
  const result: NumberPairPatch = {};
  if (value.no !== undefined) {
    result.no = requireNonNegativeIntegerOrNull(value.no, `${label}.no`);
  }
  if (value.of !== undefined) {
    result.of = requireNonNegativeIntegerOrNull(value.of, `${label}.of`);
  }
  return result;
}

export function requireNonNegativeIntegerOrNull(value: number | null, label: string): number | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new InvalidPatchError(`${label} must be a non-negative integer or null`);
  }
  return value;
}
