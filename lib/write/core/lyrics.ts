import { InvalidPatchError } from './errors.js';
import type { LyricsEntry, LyricsPatch, SynchronizedLyricsText } from './types.js';

/** Validated lyrics entry used by the format writers. */
export interface NormalizedLyricsEntry {
  text?: string | undefined;
  language?: string | undefined;
  descriptor?: string | undefined;
  contentType?: number | undefined;
  timeStampFormat?: number | undefined;
  syncText: readonly SynchronizedLyricsText[];
}

/**
 * Normalize every supported lyrics shape to the same entry list.
 *
 * A bare empty string, an empty array and `null` all mean "remove lyrics".
 * Explicit entries keep empty text, which allows round-tripping an empty
 * `USLT`/`LYRICS` value that carries a language or descriptor.
 */
export function normalizeLyrics(value: LyricsPatch | undefined): NormalizedLyricsEntry[] | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value.length === 0 ? null : [{ text: value, syncText: [] }];
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? null : value.map((entry, index) => normalizeEntry(entry, index));
  }
  if (typeof value === 'object') {
    return [normalizeEntry(value as LyricsEntry, 0)];
  }
  throw new InvalidPatchError('lyrics must be a string, a lyrics entry, an array of lyrics entries, or null');
}

/** Text representation for formats that store only un-synchronized lyrics. */
export function lyricsText(entry: NormalizedLyricsEntry): string {
  if (entry.text !== undefined) {
    return entry.text;
  }
  return entry.syncText.map(line => line.text).join('\n');
}

/** Serialize synchronized lyrics as LRC with millisecond timestamps. */
export function lyricsToLrc(entry: NormalizedLyricsEntry): string {
  if (entry.timeStampFormat !== 2) {
    throw new InvalidPatchError('Vorbis synchronized lyrics require millisecond timestamps');
  }
  return entry.syncText
    .map(line => {
      if (line.timestamp === undefined) {
        throw new InvalidPatchError('Vorbis synchronized lyrics require millisecond timestamps');
      }
      if (/[\r\n]/.test(line.text)) {
        throw new InvalidPatchError('Vorbis synchronized lyrics line text must not contain CR or LF');
      }
      const ms = line.timestamp;
      const seconds = ((ms % 60000) / 1000).toFixed(3).padStart(6, '0');
      return `[${String(Math.floor(ms / 60000)).padStart(2, '0')}:${seconds}]${line.text}`;
    })
    .join('\n');
}

function normalizeEntry(entry: string | LyricsEntry, index: number): NormalizedLyricsEntry {
  if (typeof entry === 'string') {
    return { text: entry, syncText: [] };
  }
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    throw new InvalidPatchError(`lyrics[${index}] must be a string or a lyrics entry`);
  }
  const text = optionalString(entry.text, `lyrics[${index}].text`);
  const language = optionalString(entry.language, `lyrics[${index}].language`);
  const descriptor = optionalString(entry.descriptor, `lyrics[${index}].descriptor`);
  if (entry.contentType !== undefined && !Number.isInteger(entry.contentType)) {
    throw new InvalidPatchError(`lyrics[${index}].contentType must be an integer`);
  }
  if (entry.timeStampFormat !== undefined && !Number.isInteger(entry.timeStampFormat)) {
    throw new InvalidPatchError(`lyrics[${index}].timeStampFormat must be an integer`);
  }
  return {
    text,
    language,
    descriptor,
    contentType: entry.contentType,
    timeStampFormat: entry.timeStampFormat,
    syncText: normalizeSyncText(entry.syncText, index)
  };
}

function normalizeSyncText(
  value: readonly SynchronizedLyricsText[] | undefined,
  index: number
): readonly SynchronizedLyricsText[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new InvalidPatchError(`lyrics[${index}].syncText must be an array`);
  }
  return value.map((line, lineIndex) => {
    if (typeof line !== 'object' || line === null || Array.isArray(line) || typeof line.text !== 'string') {
      throw new InvalidPatchError(`lyrics[${index}].syncText[${lineIndex}] must have a text property`);
    }
    if (line.timestamp !== undefined && (!Number.isInteger(line.timestamp) || line.timestamp < 0)) {
      throw new InvalidPatchError(`lyrics[${index}].syncText[${lineIndex}].timestamp must be a non-negative integer`);
    }
    return { text: line.text, timestamp: line.timestamp ?? undefined };
  });
}

function optionalString(value: unknown, label: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new InvalidPatchError(`${label} must be a string`);
  }
  return value;
}
