import { codePageTables } from './CodePageTables.js';
import type { CodePageTable } from './CodePageTables.js';

/**
 * The code page a RIFF CSET chunk declares to mean ISO 8859-1.
 *
 * The RIFF specification says a CSET chunk of zero, or none at all, means Latin-1
 * and not Windows-1252, so the zero is an alias for the 28591 table rather than a
 * code page of its own.
 */
const latin1CodePage = 28591;

/** The code page of UTF-8, which is the one multi byte encoding a CSET chunk may declare. */
export const utf8CodePage = 65001;

/** What a code page the tables do not hold would need: a decoder of more than one byte per character. */
export function isSupportedCodePage(codePage: number): boolean {
  return codePage === utf8CodePage || getCodePageTable(codePage) !== undefined;
}

/**
 * The table of a single byte code page, or undefined for a code page that has none.
 *
 * @param codePage Microsoft code page identifier, as a RIFF CSET chunk declares it.
 */
export function getCodePageTable(codePage: number): CodePageTable | undefined {
  const wanted = codePage === 0 ? latin1CodePage : codePage;
  return codePageTables.find(table => table.codePage === wanted);
}

/**
 * Decodes single byte text in the given code page, up to the first NUL.
 *
 * The text of a RIFF INFO field is NUL terminated, so a NUL ends the string rather
 * than becoming a character, and the padding byte after a field of an odd number of
 * bytes is a NUL like any other.
 *
 * @param bytes The field, including its terminating NUL and any padding.
 * @param codePage Microsoft code page identifier, as a RIFF CSET chunk declares it.
 * @returns The text, or undefined if the code page has no byte table.
 */
export function decodeCodePage(bytes: Uint8Array, codePage: number): string | undefined {
  const table = getCodePageTable(codePage);
  if (!table) {
    return undefined;
  }
  let text = '';
  for (const byte of bytes) {
    if (byte === 0) {
      break;
    }
    // Every table maps to a code point inside the basic multilingual plane, so no
    // value here can be half of a surrogate pair, and the character it names is
    // the one the code page means rather than a replacement.
    text += String.fromCharCode(table.toUnicode[byte]!);
  }
  return text;
}
