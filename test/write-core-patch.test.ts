import { assert } from 'vitest';
import { InvalidPatchError } from '../lib/write/core/errors.js';
import {
  normalizeComments,
  normalizeNumberPair,
  numberValue,
  requireNonNegativeIntegerOrNull,
  textValues,
  validatePictures
} from '../lib/write/core/patch.js';
import type { Comment } from '../lib/write/core/types.js';

const t = assert;

describe('write/core/patch', () => {
  describe('textValues', () => {
    it('returns undefined for undefined', () => {
      t.strictEqual(textValues(undefined), undefined);
    });

    it('returns null for null', () => {
      t.strictEqual(textValues(null), null);
    });

    it('wraps string in array', () => {
      t.deepEqual(textValues('hello'), ['hello']);
    });

    it('returns array as-is', () => {
      t.deepEqual(textValues(['a', 'b']), ['a', 'b']);
    });

    it('throws for invalid type', () => {
      t.throws(() => textValues(123 as any), InvalidPatchError);
    });

    it('throws for array with non-string', () => {
      t.throws(() => textValues(['a', 123 as any]), InvalidPatchError);
    });
  });

  describe('numberValue', () => {
    it('returns undefined for undefined', () => {
      t.strictEqual(numberValue(undefined), undefined);
    });

    it('returns null for null', () => {
      t.strictEqual(numberValue(null), null);
    });

    it('returns number as-is', () => {
      t.strictEqual(numberValue(42), 42);
    });

    it('parses numeric string', () => {
      t.strictEqual(numberValue('42'), 42);
    });

    it('throws for non-finite number', () => {
      t.throws(() => numberValue(Number.NaN), InvalidPatchError);
      t.throws(() => numberValue(Number.POSITIVE_INFINITY), InvalidPatchError);
    });

    it('throws for non-numeric string', () => {
      t.throws(() => numberValue('abc'), InvalidPatchError);
    });
  });

  describe('normalizeComments', () => {
    it('returns undefined for undefined', () => {
      t.strictEqual(normalizeComments(undefined), undefined);
    });

    it('returns null for null', () => {
      t.strictEqual(normalizeComments(null), null);
    });

    it('wraps string in comment object', () => {
      t.deepEqual(normalizeComments('hello'), [{ text: 'hello' }]);
    });

    it('normalizes single comment object', () => {
      t.deepEqual(normalizeComments({ text: 'hello', language: 'eng' }), [{ text: 'hello', language: 'eng' }]);
    });

    it('normalizes array of strings', () => {
      t.deepEqual(normalizeComments(['a', 'b'] as unknown as readonly Comment[]), [{ text: 'a' }, { text: 'b' }]);
    });

    it('normalizes array of comment objects', () => {
      t.deepEqual(normalizeComments([{ text: 'a' }, { text: 'b', language: 'eng' }]), [
        { text: 'a' },
        { text: 'b', language: 'eng' }
      ]);
    });

    it('defaults text to empty string', () => {
      t.deepEqual(normalizeComments([{}]), [{ text: '' }]);
    });

    it('throws for invalid comment', () => {
      t.throws(() => normalizeComments(123 as any), InvalidPatchError);
    });
  });

  describe('validatePictures', () => {
    it('returns undefined for undefined', () => {
      t.strictEqual(validatePictures(undefined), undefined);
    });

    it('returns null for null', () => {
      t.strictEqual(validatePictures(null), null);
    });

    it('validates picture array', () => {
      const pics = [{ format: 'image/jpeg', data: new Uint8Array([1, 2, 3]) }];
      t.deepEqual(validatePictures(pics), pics);
    });

    it('throws for non-array', () => {
      t.throws(() => validatePictures({} as any), InvalidPatchError);
    });

    it('throws for missing format', () => {
      t.throws(() => validatePictures([{ data: new Uint8Array(), format: '' } as any]), InvalidPatchError);
    });

    it('throws for empty format', () => {
      t.throws(() => validatePictures([{ format: '', data: new Uint8Array() } as any]), InvalidPatchError);
    });

    it('throws for non-Uint8Array data', () => {
      t.throws(() => validatePictures([{ format: 'image/jpeg', data: 'abc' } as any]), InvalidPatchError);
    });
  });

  describe('normalizeNumberPair', () => {
    it('returns undefined for undefined', () => {
      t.strictEqual(normalizeNumberPair(undefined, 'test'), undefined);
    });

    it('returns null for null', () => {
      t.strictEqual(normalizeNumberPair(null, 'test'), null);
    });

    it('normalizes valid object', () => {
      t.deepEqual(normalizeNumberPair({ no: 5, of: 10 }, 'test'), { no: 5, of: 10 });
    });

    it('handles null no', () => {
      t.deepEqual(normalizeNumberPair({ no: null, of: 10 }, 'test'), { no: null, of: 10 });
    });

    it('handles null of', () => {
      t.deepEqual(normalizeNumberPair({ no: 5, of: null }, 'test'), { no: 5, of: null });
    });

    it('throws for non-object', () => {
      t.throws(() => normalizeNumberPair('abc' as any, 'test'), InvalidPatchError);
    });
  });

  describe('requireNonNegativeIntegerOrNull', () => {
    it('returns null for null', () => {
      t.strictEqual(requireNonNegativeIntegerOrNull(null, 'test'), null);
    });

    it('returns number for valid integer', () => {
      t.strictEqual(requireNonNegativeIntegerOrNull(0, 'test'), 0);
      t.strictEqual(requireNonNegativeIntegerOrNull(42, 'test'), 42);
    });

    it('throws for negative number', () => {
      t.throws(() => requireNonNegativeIntegerOrNull(-1, 'test'), InvalidPatchError);
    });

    it('throws for non-integer', () => {
      t.throws(() => requireNonNegativeIntegerOrNull(1.5, 'test'), InvalidPatchError);
    });

    it('throws for non-number', () => {
      t.throws(() => requireNonNegativeIntegerOrNull('abc' as any, 'test'), InvalidPatchError);
    });
  });
});
