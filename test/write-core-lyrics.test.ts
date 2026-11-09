import { assert } from 'vitest';
import { InvalidPatchError } from '../lib/write/core/errors.js';
import { lyricsText, lyricsToLrc, normalizeLyrics } from '../lib/write/core/lyrics.js';

const t = assert;

describe('write/core/lyrics', () => {
  describe('normalizeLyrics', () => {
    it('returns undefined for undefined', () => {
      t.strictEqual(normalizeLyrics(undefined), undefined);
    });

    it('returns null for null', () => {
      t.strictEqual(normalizeLyrics(null), null);
    });

    it('returns null for empty string', () => {
      t.strictEqual(normalizeLyrics(''), null);
    });

    it('returns entry for non-empty string', () => {
      const result = normalizeLyrics('Hello world');
      t.deepEqual(result, [{ text: 'Hello world', syncText: [] }]);
    });

    it('returns null for empty array', () => {
      t.strictEqual(normalizeLyrics([]), null);
    });

    it('normalizes array of strings', () => {
      const result = normalizeLyrics(['line1', 'line2']);
      t.deepEqual(result, [
        { text: 'line1', syncText: [] },
        { text: 'line2', syncText: [] }
      ]);
    });

    it('normalizes single entry object', () => {
      const result = normalizeLyrics({ text: 'Hello', language: 'eng' });
      t.deepEqual(result, [
        {
          text: 'Hello',
          language: 'eng',
          descriptor: undefined,
          contentType: undefined,
          timeStampFormat: undefined,
          syncText: []
        }
      ]);
    });

    it('normalizes array of entry objects', () => {
      const result = normalizeLyrics([
        { text: 'line1', language: 'eng' },
        { text: 'line2', language: 'fra' }
      ]);
      t.deepEqual(result, [
        {
          text: 'line1',
          language: 'eng',
          descriptor: undefined,
          contentType: undefined,
          timeStampFormat: undefined,
          syncText: []
        },
        {
          text: 'line2',
          language: 'fra',
          descriptor: undefined,
          contentType: undefined,
          timeStampFormat: undefined,
          syncText: []
        }
      ]);
    });

    it('handles entry with syncText', () => {
      const result = normalizeLyrics({
        text: 'full text',
        syncText: [
          { text: 'line1', timestamp: 1000 },
          { text: 'line2', timestamp: 2000 }
        ]
      });
      t.deepEqual(result, [
        {
          text: 'full text',
          language: undefined,
          descriptor: undefined,
          contentType: undefined,
          timeStampFormat: undefined,
          syncText: [
            { text: 'line1', timestamp: 1000 },
            { text: 'line2', timestamp: 2000 }
          ]
        }
      ]);
    });

    it('throws for invalid type', () => {
      t.throws(() => normalizeLyrics(123 as any), InvalidPatchError);
    });

    it('throws for invalid entry', () => {
      t.throws(() => normalizeLyrics([123 as any]), InvalidPatchError);
    });

    it('allows empty entry object (results in entry with no text)', () => {
      const result = normalizeLyrics([{}]);
      t.deepEqual(result, [
        {
          text: undefined,
          language: undefined,
          descriptor: undefined,
          contentType: undefined,
          timeStampFormat: undefined,
          syncText: []
        }
      ]);
    });

    it('throws for non-integer contentType', () => {
      t.throws(() => normalizeLyrics([{ contentType: 1.5 }]), InvalidPatchError);
    });

    it('throws for non-integer timeStampFormat', () => {
      t.throws(() => normalizeLyrics([{ timeStampFormat: 1.5 }]), InvalidPatchError);
    });

    it('throws for invalid syncText', () => {
      t.throws(() => normalizeLyrics([{ syncText: 'not an array' } as any]), InvalidPatchError);
    });

    it('throws for syncText line without text', () => {
      t.throws(() => normalizeLyrics([{ syncText: [{ timestamp: 1000 }] } as any]), InvalidPatchError);
    });

    it('throws for negative timestamp', () => {
      t.throws(() => normalizeLyrics([{ syncText: [{ text: 'line', timestamp: -1 }] }]), InvalidPatchError);
    });

    it('throws for non-integer timestamp', () => {
      t.throws(() => normalizeLyrics([{ syncText: [{ text: 'line', timestamp: 1.5 }] }]), InvalidPatchError);
    });
  });

  describe('lyricsText', () => {
    it('returns text when present', () => {
      t.strictEqual(lyricsText({ text: 'Hello', syncText: [] }), 'Hello');
    });

    it('joins syncText when text is absent', () => {
      t.strictEqual(lyricsText({ syncText: [{ text: 'line1' }, { text: 'line2' }] }), 'line1\nline2');
    });

    it('returns empty string for empty syncText', () => {
      t.strictEqual(lyricsText({ syncText: [] }), '');
    });
  });

  describe('lyricsToLrc', () => {
    it('formats LRC with millisecond timestamps', () => {
      const entry = {
        timeStampFormat: 2,
        syncText: [
          { text: 'First line', timestamp: 61234 },
          { text: 'Second line', timestamp: 123456 }
        ]
      };
      const result = lyricsToLrc(entry);
      t.strictEqual(result, '[01:01.234]First line\n[02:03.456]Second line');
    });

    it('throws for non-millisecond format', () => {
      t.throws(() => lyricsToLrc({ timeStampFormat: 1, syncText: [] }), InvalidPatchError);
    });

    it('throws for missing timestamp', () => {
      t.throws(() => lyricsToLrc({ timeStampFormat: 2, syncText: [{ text: 'line' }] }), InvalidPatchError);
    });

    it('throws for CR in line text', () => {
      t.throws(
        () => lyricsToLrc({ timeStampFormat: 2, syncText: [{ text: 'line\r', timestamp: 1000 }] }),
        InvalidPatchError
      );
    });

    it('throws for LF in line text', () => {
      t.throws(
        () => lyricsToLrc({ timeStampFormat: 2, syncText: [{ text: 'line\n', timestamp: 1000 }] }),
        InvalidPatchError
      );
    });
  });
});
