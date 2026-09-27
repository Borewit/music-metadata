/**
 * Code page table generator. Run it like
 *    node tools/CodePageTables-Generator.ts
 *
 * It writes `lib/common/CodePageTables.ts`: one table of 256 code points per
 * single byte code page.
 *
 * It also writes one WAV test fixture per code page into `test/samples/wav`,
 * each declaring that page in its CSET chunk and holding every byte value in its
 * INFO text fields, so that parsing a fixture exercises the whole page.
 *
 * Every table comes from iconv,except for the few pages iconv(1) gets wrong or
 * does not know: those are hardcoded in this file.
 *
 * See also:
 * * Microsoft Code Pages
 *   https://learn.microsoft.com/en-us/windows/win32/intl/code-page-identifiers
 * * RIFF specification for code pages
 *   https://www.robotplanet.dk/audio/wav_meta_data/riff_mci.pdf#page=25
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** U+FFFD, a decoder returns this for input it cannot read. */
const replacementChar = 0xfffd;

/** U+0000 delimiter */
const delimiter = 0x0000;

/** Euro sign (Unicode) */
const euroSign = 0x20ac;

/** Euro sign (EBCDIC byte) */
const euroByte = 0x9f;

/** How a code page's table is obtained. */
type PageSource =
  /** A page iconv(1) knows under this name. */
  | { readonly kind: 'iconv'; readonly name: string }
  /** A page that is the iconv(1) table of `of` with the euro sign at 0x9f. */
  | { readonly kind: 'euro'; readonly of: string }
  /** A page that is written out in this file, under this key. */
  | { readonly kind: 'table'; readonly key: keyof typeof hardCodedTables };

/** One single byte code page. */
interface CodePage {
  /** The Microsoft code page identifier, what a WAV file declares in its CSET chunk. */
  readonly codePage: number;
  /** A short ASCII label for the page, which its table is named after. */
  readonly id: string;
  /** What the page is called, e.g. 'ISO 8859-1'. */
  readonly name: string;
  /** Where the table comes from. */
  readonly source: PageSource;
}

/**
 * Every single byte code page, as the code page identifier table of Microsoft
 * documents it, plus the iconv(1) name the page is read under. The multi byte
 * code pages (932, 936, 949, 950, ...) are not in here: a byte table cannot
 * describe them, and a file that declares one is reported as unreadable.
 */
const codePages: readonly CodePage[] = [
  { codePage:    37, id: 'ibm037',      name: 'IBM EBCDIC US-Canada', source: { kind: 'iconv', name: 'IBM037' } },
  { codePage:   437, id: 'oem437',      name: 'IBM437 OEM US', source: { kind: 'iconv', name: 'CP437' } },
  { codePage:   500, id: 'ebcdic500',   name: 'IBM EBCDIC International', source: { kind: 'iconv', name: 'CP500' } },
  { codePage:   708, id: 'oem708',      name: 'ASMO-708 Arabic', source: { kind: 'iconv', name: 'ASMO-708' } },
  { codePage:   720, id: 'oem720',      name: 'DOS-720 Arabic', source: { kind: 'table', key: 'CP00720' } },
  { codePage:   737, id: 'oem737',      name: 'IBM737 OEM Greek', source: { kind: 'iconv', name: 'CP737' } },
  { codePage:   775, id: 'oem775',      name: 'IBM775 OEM Baltic', source: { kind: 'iconv', name: 'CP775' } },
  { codePage:   850, id: 'oem850',      name: 'IBM850 OEM Latin 1', source: { kind: 'iconv', name: 'CP850' } },
  { codePage:   852, id: 'oem852',      name: 'IBM852 OEM Latin 2', source: { kind: 'iconv', name: 'CP852' } },
  { codePage:   855, id: 'oem855',      name: 'IBM855 OEM Cyrillic', source: { kind: 'iconv', name: 'CP855' } },
  { codePage:   857, id: 'oem857',      name: 'IBM857 OEM Turkish', source: { kind: 'iconv', name: 'CP857' } },
  { codePage:   858, id: 'oem858',      name: 'IBM858 OEM Latin 1 with Euro', source: { kind: 'iconv', name: 'CP858' } },
  { codePage:   860, id: 'oem860',      name: 'IBM860 OEM Portuguese', source: { kind: 'iconv', name: 'CP860' } },
  { codePage:   861, id: 'oem861',      name: 'IBM861 OEM Icelandic', source: { kind: 'iconv', name: 'CP861' } },
  { codePage:   862, id: 'oem862',      name: 'DOS-862 OEM Hebrew', source: { kind: 'iconv', name: 'CP862' } },
  { codePage:   863, id: 'oem863',      name: 'IBM863 OEM French Canadian', source: { kind: 'iconv', name: 'CP863' } },
  { codePage:   864, id: 'oem864',      name: 'IBM864 OEM Arabic', source: { kind: 'iconv', name: 'CP864' } },
  { codePage:   865, id: 'oem865',      name: 'IBM865 OEM Nordic', source: { kind: 'iconv', name: 'CP865' } },
  { codePage:   866, id: 'oem866',      name: 'IBM866 OEM Russian', source: { kind: 'iconv', name: 'CP866' } },
  { codePage:   869, id: 'oem869',      name: 'IBM869 OEM Modern Greek', source: { kind: 'iconv', name: 'CP869' } },
  { codePage:   874, id: 'thai874',     name: 'Thai (Windows-874)', source: { kind: 'iconv', name: 'CP874' } },
  { codePage:   875, id: 'oem875',      name: 'IBM875 IBM EBCDIC Greek', source: { kind: 'table', key: 'CP00875' } },
  { codePage:  1026, id: 'ebcdic1026',  name: 'IBM1026 EBCDIC Turkish', source: { kind: 'table', key: 'CP01026' } },
  { codePage:  1047, id: 'ebcdic1047',  name: 'IBM1047 EBCDIC Latin 1/Open System', source: { kind: 'iconv', name: 'IBM1047' } },
  { codePage:  1250, id: 'windows1250', name: 'Windows-1250 Central European', source: { kind: 'iconv', name: 'CP1250' } },
  { codePage:  1251, id: 'windows1251', name: 'Windows-1251 Cyrillic', source: { kind: 'iconv', name: 'CP1251' } },
  { codePage:  1252, id: 'windows1252', name: 'Windows-1252 Western European', source: { kind: 'iconv', name: 'CP1252' } },
  { codePage:  1253, id: 'windows1253', name: 'Windows-1253 Greek', source: { kind: 'iconv', name: 'CP1253' } },
  { codePage:  1254, id: 'windows1254', name: 'Windows-1254 Turkish', source: { kind: 'iconv', name: 'CP1254' } },
  { codePage:  1255, id: 'windows1255', name: 'Windows-1255 Hebrew', source: { kind: 'iconv', name: 'CP1255' } },
  { codePage:  1256, id: 'windows1256', name: 'Windows-1256 Arabic', source: { kind: 'iconv', name: 'CP1256' } },
  { codePage:  1257, id: 'windows1257', name: 'Windows-1257 Baltic', source: { kind: 'iconv', name: 'CP1257' } },
  { codePage:  1258, id: 'windows1258', name: 'Windows-1258 Vietnamese', source: { kind: 'iconv', name: 'CP1258' } },
  { codePage: 10000, id: 'macRoman',    name: 'Macintosh Roman', source: { kind: 'table', key: 'CP10000' } },
  { codePage: 10007, id: 'macCyrillic', name: 'Macintosh Cyrillic', source: { kind: 'table', key: 'CP10007' } },
  { codePage: 20127, id: 'ascii',       name: 'US-ASCII', source: { kind: 'iconv', name: 'ASCII' } },
  { codePage: 20273, id: 'ebcdic273',   name: 'IBM273 EBCDIC Germany', source: { kind: 'iconv', name: 'IBM273' } },
  { codePage: 20277, id: 'ebcdic277',   name: 'IBM277 EBCDIC Denmark-Norway', source: { kind: 'iconv', name: 'IBM277' } },
  { codePage: 20278, id: 'ebcdic278',   name: 'IBM278 EBCDIC Finland-Sweden', source: { kind: 'iconv', name: 'IBM278' } },
  { codePage: 20280, id: 'ebcdic280',   name: 'IBM280 EBCDIC Italy', source: { kind: 'iconv', name: 'IBM280' } },
  { codePage: 20284, id: 'ebcdic284',   name: 'IBM284 EBCDIC Latin America-Spain', source: { kind: 'iconv', name: 'IBM284' } },
  { codePage: 20285, id: 'ebcdic285',   name: 'IBM285 EBCDIC United Kingdom', source: { kind: 'iconv', name: 'IBM285' } },
  { codePage: 20290, id: 'ebcdic290',   name: 'IBM290 EBCDIC Japanese Katakana Extended', source: { kind: 'iconv', name: 'IBM290' } },
  { codePage: 20297, id: 'ebcdic297',   name: 'IBM297 EBCDIC France', source: { kind: 'iconv', name: 'IBM297' } },
  { codePage: 20420, id: 'ebcdic420',   name: 'IBM420 EBCDIC Arabic', source: { kind: 'iconv', name: 'IBM420' } },
  { codePage: 20423, id: 'ebcdic423',   name: 'IBM423 EBCDIC Greek', source: { kind: 'iconv', name: 'IBM423' } },
  { codePage: 20424, id: 'ebcdic424',   name: 'IBM424 EBCDIC Hebrew', source: { kind: 'table', key: 'CP00424' } },
  { codePage: 20866, id: 'koi8r',       name: 'KOI8-R', source: { kind: 'iconv', name: 'KOI8-R' } },
  { codePage: 20871, id: 'ebcdic871',   name: 'IBM871 EBCDIC Icelandic', source: { kind: 'iconv', name: 'IBM871' } },
  { codePage: 20924, id: 'ebcdic20924', name: 'IBM924 EBCDIC Latin 9 (1047 with Euro)', source: { kind: 'table', key: 'CP00924' } },
  { codePage: 21025, id: 'ebcdic1025',  name: 'IBM1025 EBCDIC Cyrillic Serbian-Bulgarian', source: { kind: 'iconv', name: 'CP1025' } },
  { codePage: 21866, id: 'koi8u',       name: 'KOI8-U', source: { kind: 'iconv', name: 'KOI8-U' } },
  { codePage: 28591, id: 'latin1',      name: 'ISO 8859-1', source: { kind: 'iconv', name: 'ISO-8859-1' } },
  { codePage: 28592, id: 'latin2',      name: 'ISO 8859-2', source: { kind: 'iconv', name: 'ISO-8859-2' } },
  { codePage: 28593, id: 'latin3',      name: 'ISO 8859-3', source: { kind: 'iconv', name: 'ISO-8859-3' } },
  { codePage: 28594, id: 'latin4',      name: 'ISO 8859-4', source: { kind: 'iconv', name: 'ISO-8859-4' } },
  { codePage: 28595, id: 'latin5',      name: 'ISO 8859-5', source: { kind: 'iconv', name: 'ISO-8859-5' } },
  { codePage: 28596, id: 'latin6',      name: 'ISO 8859-6', source: { kind: 'iconv', name: 'ISO-8859-6' } },
  { codePage: 28597, id: 'latin7',      name: 'ISO 8859-7', source: { kind: 'iconv', name: 'ISO-8859-7' } },
  { codePage: 28598, id: 'latin8',      name: 'ISO 8859-8 Hebrew (logical)', source: { kind: 'iconv', name: 'ISO-8859-8' } },
  { codePage: 28599, id: 'latin9',      name: 'ISO 8859-9', source: { kind: 'iconv', name: 'ISO-8859-9' } },
  { codePage: 28603, id: 'latin13',     name: 'ISO 8859-13', source: { kind: 'iconv', name: 'ISO-8859-13' } },
  { codePage: 28605, id: 'latin15',     name: 'ISO 8859-15', source: { kind: 'iconv', name: 'ISO-8859-15' } },

  // The "Euro" EBCDIC pages are their base page with U+20AC at 0x9f.
  { codePage: 1140, id: 'ebcdic1140',   name: 'IBM037 EBCDIC US-Canada with Euro', source: { kind: 'euro', of: 'IBM037' } },
  { codePage: 1141, id: 'ebcdic1141',   name: 'IBM273 EBCDIC Germany with Euro', source: { kind: 'euro', of: 'IBM273' } },
  { codePage: 1142, id: 'ebcdic1142',   name: 'IBM277 EBCDIC Denmark-Norway with Euro', source: { kind: 'euro', of: 'IBM277' } },
  { codePage: 1143, id: 'ebcdic1143',   name: 'IBM278 EBCDIC Finland-Sweden with Euro', source: { kind: 'euro', of: 'IBM278' } },
  { codePage: 1144, id: 'ebcdic1144',   name: 'IBM280 EBCDIC Italy with Euro', source: { kind: 'euro', of: 'IBM280' } },
  { codePage: 1145, id: 'ebcdic1145',   name: 'IBM284 EBCDIC Latin America-Spain with Euro', source: { kind: 'euro', of: 'IBM284' } },
  { codePage: 1146, id: 'ebcdic1146',   name: 'IBM285 EBCDIC United Kingdom with Euro', source: { kind: 'euro', of: 'IBM285' } },
  { codePage: 1147, id: 'ebcdic1147',   name: 'IBM297 EBCDIC France with Euro', source: { kind: 'euro', of: 'IBM297' } },
  { codePage: 1148, id: 'ebcdic1148',   name: 'IBM500 EBCDIC International with Euro', source: { kind: 'euro', of: 'CP500' } },
  { codePage: 1149, id: 'ebcdic1149',   name: 'IBM871 EBCDIC Icelandic with Euro', source: { kind: 'euro', of: 'IBM871' } }
];

/**
 * Hardcoded code pages where iconv does not work
 */
const hardCodedTables = {
  /**
   * 720, DOS-720 Arabic: IBM 720 Arabic, a transparent ASMO-708 DOS page.
   * https://public.dhe.ibm.com/software/globalization/gcoc/attachments/CP00720.txt
   * IBM gives the GCGID and GCS name of 215 positions rather than a code point, so
   * the GCGIDs were resolved through IBM's own CP437 table joined with the Unicode
   * Consortium's CP437.TXT, and the 47 CP437 has no use for, the Arabic letters and
   * diacritics among them, from their names. The 41 positions the file leaves
   * without a GCGID are the C0 controls and 0x7f, plus 0x80, 0x81, 0x84, 0x86 and
   * 0x8d..0x90, which the page does not define. There is no euro anywhere on it,
   * and 0xf0, "Identity Symbol" next to "Nearly Equals Symbol" and "Product Dot",
   * is U+2261 IDENTICAL TO, not a soft hyphen.
   * * iconv has no name for the page, not CP720 nor any alias around it
   * * Perl Encode has no mapping for it either
   * * Python cp720 has it, and agrees with the 256 values below at every byte
   */
  CP00720: [
    0x0000, 0x0001, 0x0002, 0x0003, 0x0004, 0x0005, 0x0006, 0x0007, 0x0008, 0x0009, 0x000A, 0x000B, 0x000C, 0x000D, 0x000E, 0x000F,
    0x0010, 0x0011, 0x0012, 0x0013, 0x0014, 0x0015, 0x0016, 0x0017, 0x0018, 0x0019, 0x001A, 0x001B, 0x001C, 0x001D, 0x001E, 0x001F,
    0x0020, 0x0021, 0x0022, 0x0023, 0x0024, 0x0025, 0x0026, 0x0027, 0x0028, 0x0029, 0x002A, 0x002B, 0x002C, 0x002D, 0x002E, 0x002F,
    0x0030, 0x0031, 0x0032, 0x0033, 0x0034, 0x0035, 0x0036, 0x0037, 0x0038, 0x0039, 0x003A, 0x003B, 0x003C, 0x003D, 0x003E, 0x003F,
    0x0040, 0x0041, 0x0042, 0x0043, 0x0044, 0x0045, 0x0046, 0x0047, 0x0048, 0x0049, 0x004A, 0x004B, 0x004C, 0x004D, 0x004E, 0x004F,
    0x0050, 0x0051, 0x0052, 0x0053, 0x0054, 0x0055, 0x0056, 0x0057, 0x0058, 0x0059, 0x005A, 0x005B, 0x005C, 0x005D, 0x005E, 0x005F,
    0x0060, 0x0061, 0x0062, 0x0063, 0x0064, 0x0065, 0x0066, 0x0067, 0x0068, 0x0069, 0x006A, 0x006B, 0x006C, 0x006D, 0x006E, 0x006F,
    0x0070, 0x0071, 0x0072, 0x0073, 0x0074, 0x0075, 0x0076, 0x0077, 0x0078, 0x0079, 0x007A, 0x007B, 0x007C, 0x007D, 0x007E, 0x007F,
    0x0080, 0x0081, 0x00E9, 0x00E2, 0x0084, 0x00E0, 0x0086, 0x00E7, 0x00EA, 0x00EB, 0x00E8, 0x00EF, 0x00EE, 0x008D, 0x008E, 0x008F,
    0x0090, 0x0651, 0x0652, 0x00F4, 0x00A4, 0x0640, 0x00FB, 0x00F9, 0x0621, 0x0622, 0x0623, 0x0624, 0x00A3, 0x0625, 0x0626, 0x0627,
    0x0628, 0x0629, 0x062A, 0x062B, 0x062C, 0x062D, 0x062E, 0x062F, 0x0630, 0x0631, 0x0632, 0x0633, 0x0634, 0x0635, 0x00AB, 0x00BB,
    0x2591, 0x2592, 0x2593, 0x2502, 0x2524, 0x2561, 0x2562, 0x2556, 0x2555, 0x2563, 0x2551, 0x2557, 0x255D, 0x255C, 0x255B, 0x2510,
    0x2514, 0x2534, 0x252C, 0x251C, 0x2500, 0x253C, 0x255E, 0x255F, 0x255A, 0x2554, 0x2569, 0x2566, 0x2560, 0x2550, 0x256C, 0x2567,
    0x2568, 0x2564, 0x2565, 0x2559, 0x2558, 0x2552, 0x2553, 0x256B, 0x256A, 0x2518, 0x250C, 0x2588, 0x2584, 0x258C, 0x2590, 0x2580,
    0x0636, 0x0637, 0x0638, 0x0639, 0x063A, 0x0641, 0x00B5, 0x0642, 0x0643, 0x0644, 0x0645, 0x0646, 0x0647, 0x0648, 0x0649, 0x064A,
    0x2261, 0x064B, 0x064C, 0x064D, 0x064E, 0x064F, 0x0650, 0x2248, 0x00B0, 0x2219, 0x00B7, 0x221A, 0x207F, 0x00B2, 0x25A0, 0x00A0
  ],

  /**
   * 875, IBM875 IBM EBCDIC Greek.
   * https://www.unicode.org/Public/MAPPINGS/VENDORS/MICSFT/EBCDIC/CP875.TXT
   * The file gives a code point and the name of the character at each of the 256
   * positions, so every value in our table below is the one which the file names.
   * | byte | this table              | iconv CP875 | Python cp875 | Perl cp875  |
   * |------|-------------------------|-------------|--------------|-------------|
   * | 0x3f | U+001A SUBSTITUTE       | U+001A      | U+001A       | undefined   |
   * | 0x6a | U+007C VERTICAL LINE    | undefined   | U+007C       | U+007C      |
   * | 0x74 | U+00A0 NO-BREAK SPACE   | U+2207      | U+00A0       | U+00A0      |
   * | 0xdc | U+001A SUBSTITUTE       | undefined   | U+001A       | undefined   |
   * | 0xdd | U+0387 GREEK ANO TELEIA | U+00B7      | U+0387       | U+0387      |
   * | 0xe1 | U+001A SUBSTITUTE       | undefined   | U+001A       | undefined   |
   * | 0xec | U+001A SUBSTITUTE       | undefined   | U+001A       | undefined   |
   * | 0xed | U+001A SUBSTITUTE       | undefined   | U+001A       | undefined   |
   * | 0xfc | U+001A SUBSTITUTE       | undefined   | U+001A       | undefined   |
   * | 0xfd | U+001A SUBSTITUTE       | undefined   | U+001A       | U+001A      |
   */
  CP00875: [
    0x0000, 0x0001, 0x0002, 0x0003, 0x009C, 0x0009, 0x0086, 0x007F, 0x0097, 0x008D, 0x008E, 0x000B, 0x000C, 0x000D, 0x000E, 0x000F,
    0x0010, 0x0011, 0x0012, 0x0013, 0x009D, 0x0085, 0x0008, 0x0087, 0x0018, 0x0019, 0x0092, 0x008F, 0x001C, 0x001D, 0x001E, 0x001F,
    0x0080, 0x0081, 0x0082, 0x0083, 0x0084, 0x000A, 0x0017, 0x001B, 0x0088, 0x0089, 0x008A, 0x008B, 0x008C, 0x0005, 0x0006, 0x0007,
    0x0090, 0x0091, 0x0016, 0x0093, 0x0094, 0x0095, 0x0096, 0x0004, 0x0098, 0x0099, 0x009A, 0x009B, 0x0014, 0x0015, 0x009E, 0x001A,
    0x0020, 0x0391, 0x0392, 0x0393, 0x0394, 0x0395, 0x0396, 0x0397, 0x0398, 0x0399, 0x005B, 0x002E, 0x003C, 0x0028, 0x002B, 0x0021,
    0x0026, 0x039A, 0x039B, 0x039C, 0x039D, 0x039E, 0x039F, 0x03A0, 0x03A1, 0x03A3, 0x005D, 0x0024, 0x002A, 0x0029, 0x003B, 0x005E,
    0x002D, 0x002F, 0x03A4, 0x03A5, 0x03A6, 0x03A7, 0x03A8, 0x03A9, 0x03AA, 0x03AB, 0x007C, 0x002C, 0x0025, 0x005F, 0x003E, 0x003F,
    0x00A8, 0x0386, 0x0388, 0x0389, 0x00A0, 0x038A, 0x038C, 0x038E, 0x038F, 0x0060, 0x003A, 0x0023, 0x0040, 0x0027, 0x003D, 0x0022,
    0x0385, 0x0061, 0x0062, 0x0063, 0x0064, 0x0065, 0x0066, 0x0067, 0x0068, 0x0069, 0x03B1, 0x03B2, 0x03B3, 0x03B4, 0x03B5, 0x03B6,
    0x00B0, 0x006A, 0x006B, 0x006C, 0x006D, 0x006E, 0x006F, 0x0070, 0x0071, 0x0072, 0x03B7, 0x03B8, 0x03B9, 0x03BA, 0x03BB, 0x03BC,
    0x00B4, 0x007E, 0x0073, 0x0074, 0x0075, 0x0076, 0x0077, 0x0078, 0x0079, 0x007A, 0x03BD, 0x03BE, 0x03BF, 0x03C0, 0x03C1, 0x03C3,
    0x00A3, 0x03AC, 0x03AD, 0x03AE, 0x03CA, 0x03AF, 0x03CC, 0x03CD, 0x03CB, 0x03CE, 0x03C2, 0x03C4, 0x03C5, 0x03C6, 0x03C7, 0x03C8,
    0x007B, 0x0041, 0x0042, 0x0043, 0x0044, 0x0045, 0x0046, 0x0047, 0x0048, 0x0049, 0x00AD, 0x03C9, 0x0390, 0x03B0, 0x2018, 0x2015,
    0x007D, 0x004A, 0x004B, 0x004C, 0x004D, 0x004E, 0x004F, 0x0050, 0x0051, 0x0052, 0x00B1, 0x00BD, 0x001A, 0x0387, 0x2019, 0x00A6,
    0x005C, 0x001A, 0x0053, 0x0054, 0x0055, 0x0056, 0x0057, 0x0058, 0x0059, 0x005A, 0x00B2, 0x00A7, 0x001A, 0x001A, 0x00AB, 0x00AC,
    0x0030, 0x0031, 0x0032, 0x0033, 0x0034, 0x0035, 0x0036, 0x0037, 0x0038, 0x0039, 0x00B3, 0x00A9, 0x001A, 0x001A, 0x00BB, 0x009F
  ],

  /**
   * 20924, IBM924 IBM EBCDIC Latin 9, the 1047 page with the euro.
   * https://public.dhe.ibm.com/software/globalization/gcoc/attachments/CP00924.txt
   * The 191 GCS names, resolved the same way as for 1026 below. It is more than
   * 1047 with 0x9f swapped: it also takes the two caron pairs and the OE
   * ligatures, and drops the fraction signs, the broken bar, the acute accent,
   * the diaeresis, the cedilla and the international currency sign, with cent,
   * logical not and Y acute moving 0x4a -> 0xb0 -> 0xba -> 0x4a. So it is
   * written out in full, not derived from 1047, and 0x9f is the only change
   * Microsoft documents.
   * * iconv has no name for the page, not CP924 nor any alias around it
   * * Perl Encode has no mapping for it either, under cp924 or any other name
   * * Python has no codec for it at all
   */
  CP00924: [
    0x0000, 0x0001, 0x0002, 0x0003, 0x009C, 0x0009, 0x0086, 0x007F, 0x0097, 0x008D, 0x008E, 0x000B, 0x000C, 0x000D, 0x000E, 0x000F,
    0x0010, 0x0011, 0x0012, 0x0013, 0x009D, 0x0085, 0x0008, 0x0087, 0x0018, 0x0019, 0x0092, 0x008F, 0x001C, 0x001D, 0x001E, 0x001F,
    0x0080, 0x0081, 0x0082, 0x0083, 0x0084, 0x000A, 0x0017, 0x001B, 0x0088, 0x0089, 0x008A, 0x008B, 0x008C, 0x0005, 0x0006, 0x0007,
    0x0090, 0x0091, 0x0016, 0x0093, 0x0094, 0x0095, 0x0096, 0x0004, 0x0098, 0x0099, 0x009A, 0x009B, 0x0014, 0x0015, 0x009E, 0x001A,
    0x0020, 0x00A0, 0x00E2, 0x00E4, 0x00E0, 0x00E1, 0x00E3, 0x00E5, 0x00E7, 0x00F1, 0x00DD, 0x002E, 0x003C, 0x0028, 0x002B, 0x007C,
    0x0026, 0x00E9, 0x00EA, 0x00EB, 0x00E8, 0x00ED, 0x00EE, 0x00EF, 0x00EC, 0x00DF, 0x0021, 0x0024, 0x002A, 0x0029, 0x003B, 0x005E,
    0x002D, 0x002F, 0x00C2, 0x00C4, 0x00C0, 0x00C1, 0x00C3, 0x00C5, 0x00C7, 0x00D1, 0x0160, 0x002C, 0x0025, 0x005F, 0x003E, 0x003F,
    0x00F8, 0x00C9, 0x00CA, 0x00CB, 0x00C8, 0x00CD, 0x00CE, 0x00CF, 0x00CC, 0x0060, 0x003A, 0x0023, 0x0040, 0x0027, 0x003D, 0x0022,
    0x00D8, 0x0061, 0x0062, 0x0063, 0x0064, 0x0065, 0x0066, 0x0067, 0x0068, 0x0069, 0x00AB, 0x00BB, 0x00F0, 0x00FD, 0x00FE, 0x00B1,
    0x00B0, 0x006A, 0x006B, 0x006C, 0x006D, 0x006E, 0x006F, 0x0070, 0x0071, 0x0072, 0x00AA, 0x00BA, 0x00E6, 0x017E, 0x00C6, 0x20AC,
    0x00B5, 0x007E, 0x0073, 0x0074, 0x0075, 0x0076, 0x0077, 0x0078, 0x0079, 0x007A, 0x00A1, 0x00BF, 0x00D0, 0x005B, 0x00DE, 0x00AE,
    0x00A2, 0x00A3, 0x00A5, 0x00B7, 0x00A9, 0x00A7, 0x00B6, 0x0152, 0x0153, 0x0178, 0x00AC, 0x0161, 0x00AF, 0x005D, 0x017D, 0x00D7,
    0x007B, 0x0041, 0x0042, 0x0043, 0x0044, 0x0045, 0x0046, 0x0047, 0x0048, 0x0049, 0x00AD, 0x00F4, 0x00F6, 0x00F2, 0x00F3, 0x00F5,
    0x007D, 0x004A, 0x004B, 0x004C, 0x004D, 0x004E, 0x004F, 0x0050, 0x0051, 0x0052, 0x00B9, 0x00FB, 0x00FC, 0x00F9, 0x00FA, 0x00FF,
    0x005C, 0x00F7, 0x0053, 0x0054, 0x0055, 0x0056, 0x0057, 0x0058, 0x0059, 0x005A, 0x00B2, 0x00D4, 0x00D6, 0x00D2, 0x00D3, 0x00D5,
    0x0030, 0x0031, 0x0032, 0x0033, 0x0034, 0x0035, 0x0036, 0x0037, 0x0038, 0x0039, 0x00B3, 0x00DB, 0x00DC, 0x00D9, 0x00DA, 0x009F
  ],

  /**
   * 1026, IBM1026 IBM EBCDIC Turkish, IBM's Latin 5 Turkey.
   * https://public.dhe.ibm.com/software/globalization/gcoc/attachments/CP01026.txt
   * The 191 GCS names, resolved to code points. The file names no GCGID for
   * 0x00..0x3f or 0xff, which are the EBCDIC control layout that the IBM EBCDIC
   * pages share, IBM037 among them.
   * | byte | this table     | iconv CP1026 | Python cp1026 | Perl cp1026 |
   * |------|----------------|--------------|---------------|-------------|
   * | 0x9d | U+00B8 CEDILLA | U+02DB       | U+00B8        | U+00B8      |
   * | 0xbc | U+00AF MACRON  | U+2014       | U+00AF        | U+00AF      |
   */
  CP01026: [
    0x0000, 0x0001, 0x0002, 0x0003, 0x009C, 0x0009, 0x0086, 0x007F, 0x0097, 0x008D, 0x008E, 0x000B, 0x000C, 0x000D, 0x000E, 0x000F,
    0x0010, 0x0011, 0x0012, 0x0013, 0x009D, 0x0085, 0x0008, 0x0087, 0x0018, 0x0019, 0x0092, 0x008F, 0x001C, 0x001D, 0x001E, 0x001F,
    0x0080, 0x0081, 0x0082, 0x0083, 0x0084, 0x000A, 0x0017, 0x001B, 0x0088, 0x0089, 0x008A, 0x008B, 0x008C, 0x0005, 0x0006, 0x0007,
    0x0090, 0x0091, 0x0016, 0x0093, 0x0094, 0x0095, 0x0096, 0x0004, 0x0098, 0x0099, 0x009A, 0x009B, 0x0014, 0x0015, 0x009E, 0x001A,
    0x0020, 0x00A0, 0x00E2, 0x00E4, 0x00E0, 0x00E1, 0x00E3, 0x00E5, 0x007B, 0x00F1, 0x00C7, 0x002E, 0x003C, 0x0028, 0x002B, 0x0021,
    0x0026, 0x00E9, 0x00EA, 0x00EB, 0x00E8, 0x00ED, 0x00EE, 0x00EF, 0x00EC, 0x00DF, 0x011E, 0x0130, 0x002A, 0x0029, 0x003B, 0x005E,
    0x002D, 0x002F, 0x00C2, 0x00C4, 0x00C0, 0x00C1, 0x00C3, 0x00C5, 0x005B, 0x00D1, 0x015F, 0x002C, 0x0025, 0x005F, 0x003E, 0x003F,
    0x00F8, 0x00C9, 0x00CA, 0x00CB, 0x00C8, 0x00CD, 0x00CE, 0x00CF, 0x00CC, 0x0131, 0x003A, 0x00D6, 0x015E, 0x0027, 0x003D, 0x00DC,
    0x00D8, 0x0061, 0x0062, 0x0063, 0x0064, 0x0065, 0x0066, 0x0067, 0x0068, 0x0069, 0x00AB, 0x00BB, 0x007D, 0x0060, 0x00A6, 0x00B1,
    0x00B0, 0x006A, 0x006B, 0x006C, 0x006D, 0x006E, 0x006F, 0x0070, 0x0071, 0x0072, 0x00AA, 0x00BA, 0x00E6, 0x00B8, 0x00C6, 0x00A4,
    0x00B5, 0x00F6, 0x0073, 0x0074, 0x0075, 0x0076, 0x0077, 0x0078, 0x0079, 0x007A, 0x00A1, 0x00BF, 0x005D, 0x0024, 0x0040, 0x00AE,
    0x00A2, 0x00A3, 0x00A5, 0x00B7, 0x00A9, 0x00A7, 0x00B6, 0x00BC, 0x00BD, 0x00BE, 0x00AC, 0x007C, 0x00AF, 0x00A8, 0x00B4, 0x00D7,
    0x00E7, 0x0041, 0x0042, 0x0043, 0x0044, 0x0045, 0x0046, 0x0047, 0x0048, 0x0049, 0x00AD, 0x00F4, 0x007E, 0x00F2, 0x00F3, 0x00F5,
    0x011F, 0x004A, 0x004B, 0x004C, 0x004D, 0x004E, 0x004F, 0x0050, 0x0051, 0x0052, 0x00B9, 0x00FB, 0x005C, 0x00F9, 0x00FA, 0x00FF,
    0x00FC, 0x00F7, 0x0053, 0x0054, 0x0055, 0x0056, 0x0057, 0x0058, 0x0059, 0x005A, 0x00B2, 0x00D4, 0x0023, 0x00D2, 0x00D3, 0x00D5,
    0x0030, 0x0031, 0x0032, 0x0033, 0x0034, 0x0035, 0x0036, 0x0037, 0x0038, 0x0039, 0x00B3, 0x00DB, 0x0022, 0x00D9, 0x00DA, 0x009F
  ],

  /**
   * 10000, Macintosh Roman: Apple's Mac OS Roman.
   * https://www.unicode.org/Public/MAPPINGS/VENDORS/APPLE/ROMAN.TXT
   * The file gives a code point and the Unicode name of the character at each of
   * the 223 graphic positions. It lists no 0x00..0x1f or 0x7f, as the standard
   * mapping tables do not, but its header says which characters those are: the
   * standard control characters. 0xf0 is U+F8FF, the Apple logo, a corporate zone
   * character that the file documents in its header and in CORPCHAR.TXT and the one
   * value here with no Unicode name to check it against; the note about 0xdb in that
   * same header is why 0xdb below is the euro, U+20AC, rather than U+00A4.
   * | byte | this table        | iconv MACINTOSH | Python mac_roman | Perl macRoman |
   * |------|-------------------|-----------------|------------------|---------------|
   * | 0x7f | U+007F DELETE     | U+007F          | U+007F           | undefined     |
   * | 0xc6 | U+2206 INCREMENT  | U+0394          | U+2206           | U+2206        |
   * | 0xf0 | U+F8FF APPLE LOGO | U+E01E          | U+F8FF           | U+F8FF        |
   */
  CP10000: [
    0x0000, 0x0001, 0x0002, 0x0003, 0x0004, 0x0005, 0x0006, 0x0007, 0x0008, 0x0009, 0x000A, 0x000B, 0x000C, 0x000D, 0x000E, 0x000F,
    0x0010, 0x0011, 0x0012, 0x0013, 0x0014, 0x0015, 0x0016, 0x0017, 0x0018, 0x0019, 0x001A, 0x001B, 0x001C, 0x001D, 0x001E, 0x001F,
    0x0020, 0x0021, 0x0022, 0x0023, 0x0024, 0x0025, 0x0026, 0x0027, 0x0028, 0x0029, 0x002A, 0x002B, 0x002C, 0x002D, 0x002E, 0x002F,
    0x0030, 0x0031, 0x0032, 0x0033, 0x0034, 0x0035, 0x0036, 0x0037, 0x0038, 0x0039, 0x003A, 0x003B, 0x003C, 0x003D, 0x003E, 0x003F,
    0x0040, 0x0041, 0x0042, 0x0043, 0x0044, 0x0045, 0x0046, 0x0047, 0x0048, 0x0049, 0x004A, 0x004B, 0x004C, 0x004D, 0x004E, 0x004F,
    0x0050, 0x0051, 0x0052, 0x0053, 0x0054, 0x0055, 0x0056, 0x0057, 0x0058, 0x0059, 0x005A, 0x005B, 0x005C, 0x005D, 0x005E, 0x005F,
    0x0060, 0x0061, 0x0062, 0x0063, 0x0064, 0x0065, 0x0066, 0x0067, 0x0068, 0x0069, 0x006A, 0x006B, 0x006C, 0x006D, 0x006E, 0x006F,
    0x0070, 0x0071, 0x0072, 0x0073, 0x0074, 0x0075, 0x0076, 0x0077, 0x0078, 0x0079, 0x007A, 0x007B, 0x007C, 0x007D, 0x007E, 0x007F,
    0x00C4, 0x00C5, 0x00C7, 0x00C9, 0x00D1, 0x00D6, 0x00DC, 0x00E1, 0x00E0, 0x00E2, 0x00E4, 0x00E3, 0x00E5, 0x00E7, 0x00E9, 0x00E8,
    0x00EA, 0x00EB, 0x00ED, 0x00EC, 0x00EE, 0x00EF, 0x00F1, 0x00F3, 0x00F2, 0x00F4, 0x00F6, 0x00F5, 0x00FA, 0x00F9, 0x00FB, 0x00FC,
    0x2020, 0x00B0, 0x00A2, 0x00A3, 0x00A7, 0x2022, 0x00B6, 0x00DF, 0x00AE, 0x00A9, 0x2122, 0x00B4, 0x00A8, 0x2260, 0x00C6, 0x00D8,
    0x221E, 0x00B1, 0x2264, 0x2265, 0x00A5, 0x00B5, 0x2202, 0x2211, 0x220F, 0x03C0, 0x222B, 0x00AA, 0x00BA, 0x03A9, 0x00E6, 0x00F8,
    0x00BF, 0x00A1, 0x00AC, 0x221A, 0x0192, 0x2248, 0x2206, 0x00AB, 0x00BB, 0x2026, 0x00A0, 0x00C0, 0x00C3, 0x00D5, 0x0152, 0x0153,
    0x2013, 0x2014, 0x201C, 0x201D, 0x2018, 0x2019, 0x00F7, 0x25CA, 0x00FF, 0x0178, 0x2044, 0x20AC, 0x2039, 0x203A, 0xFB01, 0xFB02,
    0x2021, 0x00B7, 0x201A, 0x201E, 0x2030, 0x00C2, 0x00CA, 0x00C1, 0x00CB, 0x00C8, 0x00CD, 0x00CE, 0x00CF, 0x00CC, 0x00D3, 0x00D4,
    0xF8FF, 0x00D2, 0x00DA, 0x00DB, 0x00D9, 0x0131, 0x02C6, 0x02DC, 0x00AF, 0x02D8, 0x02D9, 0x02DA, 0x00B8, 0x02DD, 0x02DB, 0x02C7
  ],

  /**
   * 10007, Macintosh Cyrillic: Apple's Mac OS Cyrillic.
   * https://www.unicode.org/Public/MAPPINGS/VENDORS/APPLE/CYRILLIC.TXT
   * The file gives a code point and the Unicode name of the character at each of
   * the 223 graphic positions. It lists no 0x00..0x1f or 0x7f, as the standard
   * mapping tables do not, but its header says which characters those are: the
   * standard control characters. This is the "Euro sign" version, the one Mac OS 9.0
   * merged the two older Slavic pages into, and its header is what dates the three
   * positions that merge moved: 0xa2 U+0490, 0xb6 U+0491 and 0xff U+20AC, where the
   * currency sign variant had U+00A2, U+2202 and U+00A4.
   * | byte | this table       | iconv MACCYRILLIC | Python mac_cyrillic | Perl macCyrillic |
   * |------|------------------|-------------------|---------------------|------------------|
   * | 0x7f | U+007F DELETE    | U+007F            | U+007F              | undefined        |
   * | 0xff | U+20AC EURO SIGN | U+00A4            | U+20AC              | U+20AC           |
   */
  CP10007: [
    0x0000, 0x0001, 0x0002, 0x0003, 0x0004, 0x0005, 0x0006, 0x0007, 0x0008, 0x0009, 0x000A, 0x000B, 0x000C, 0x000D, 0x000E, 0x000F,
    0x0010, 0x0011, 0x0012, 0x0013, 0x0014, 0x0015, 0x0016, 0x0017, 0x0018, 0x0019, 0x001A, 0x001B, 0x001C, 0x001D, 0x001E, 0x001F,
    0x0020, 0x0021, 0x0022, 0x0023, 0x0024, 0x0025, 0x0026, 0x0027, 0x0028, 0x0029, 0x002A, 0x002B, 0x002C, 0x002D, 0x002E, 0x002F,
    0x0030, 0x0031, 0x0032, 0x0033, 0x0034, 0x0035, 0x0036, 0x0037, 0x0038, 0x0039, 0x003A, 0x003B, 0x003C, 0x003D, 0x003E, 0x003F,
    0x0040, 0x0041, 0x0042, 0x0043, 0x0044, 0x0045, 0x0046, 0x0047, 0x0048, 0x0049, 0x004A, 0x004B, 0x004C, 0x004D, 0x004E, 0x004F,
    0x0050, 0x0051, 0x0052, 0x0053, 0x0054, 0x0055, 0x0056, 0x0057, 0x0058, 0x0059, 0x005A, 0x005B, 0x005C, 0x005D, 0x005E, 0x005F,
    0x0060, 0x0061, 0x0062, 0x0063, 0x0064, 0x0065, 0x0066, 0x0067, 0x0068, 0x0069, 0x006A, 0x006B, 0x006C, 0x006D, 0x006E, 0x006F,
    0x0070, 0x0071, 0x0072, 0x0073, 0x0074, 0x0075, 0x0076, 0x0077, 0x0078, 0x0079, 0x007A, 0x007B, 0x007C, 0x007D, 0x007E, 0x007F,
    0x0410, 0x0411, 0x0412, 0x0413, 0x0414, 0x0415, 0x0416, 0x0417, 0x0418, 0x0419, 0x041A, 0x041B, 0x041C, 0x041D, 0x041E, 0x041F,
    0x0420, 0x0421, 0x0422, 0x0423, 0x0424, 0x0425, 0x0426, 0x0427, 0x0428, 0x0429, 0x042A, 0x042B, 0x042C, 0x042D, 0x042E, 0x042F,
    0x2020, 0x00B0, 0x0490, 0x00A3, 0x00A7, 0x2022, 0x00B6, 0x0406, 0x00AE, 0x00A9, 0x2122, 0x0402, 0x0452, 0x2260, 0x0403, 0x0453,
    0x221E, 0x00B1, 0x2264, 0x2265, 0x0456, 0x00B5, 0x0491, 0x0408, 0x0404, 0x0454, 0x0407, 0x0457, 0x0409, 0x0459, 0x040A, 0x045A,
    0x0458, 0x0405, 0x00AC, 0x221A, 0x0192, 0x2248, 0x2206, 0x00AB, 0x00BB, 0x2026, 0x00A0, 0x040B, 0x045B, 0x040C, 0x045C, 0x0455,
    0x2013, 0x2014, 0x201C, 0x201D, 0x2018, 0x2019, 0x00F7, 0x201E, 0x040E, 0x045E, 0x040F, 0x045F, 0x2116, 0x0401, 0x0451, 0x044F,
    0x0430, 0x0431, 0x0432, 0x0433, 0x0434, 0x0435, 0x0436, 0x0437, 0x0438, 0x0439, 0x043A, 0x043B, 0x043C, 0x043D, 0x043E, 0x043F,
    0x0440, 0x0441, 0x0442, 0x0443, 0x0444, 0x0445, 0x0446, 0x0447, 0x0448, 0x0449, 0x044A, 0x044B, 0x044C, 0x044D, 0x044E, 0x20AC
  ],

  /**
   * 20424, IBM424 EBCDIC Hebrew: the Hebrew EBCDIC page, which is what Microsoft
   * calls 20424.
   * https://www.unicode.org/Public/MAPPINGS/VENDORS/MISC/CP424.TXT
   * A "Format A" table from 1999: a code point and the Unicode name at each of 218
   * positions, and the word "UNDEFINED" with no code point at the other 38, which
   * the file does not leave to be guessed. Those 38 are spelled out below as
   * finalize() computes them, U+FFFD or the C1 control of the same number. All 153
   * graphic names the file prints are still the names Unicode uses today, so nothing
   * here is a casualty of its age; the 65 controls it maps are the standard EBCDIC
   * ones.
   * | byte | this table             | iconv CP424 | Python cp424 | Perl cp424 |
   * |------|------------------------|-------------|--------------|------------|
   * | 0x78 | U+2017 DOUBLE LOW LINE | U+21D4      | U+2017       | U+2017     |
   * | 0x8f | U+00B1 PLUS-MINUS SIGN | undefined   | U+00B1       | U+00B1     |
   */
  CP00424: [
    0x0000, 0x0001, 0x0002, 0x0003, 0x009C, 0x0009, 0x0086, 0x007F, 0x0097, 0x008D, 0x008E, 0x000B, 0x000C, 0x000D, 0x000E, 0x000F,
    0x0010, 0x0011, 0x0012, 0x0013, 0x009D, 0x0085, 0x0008, 0x0087, 0x0018, 0x0019, 0x0092, 0x008F, 0x001C, 0x001D, 0x001E, 0x001F,
    0x0080, 0x0081, 0x0082, 0x0083, 0x0084, 0x000A, 0x0017, 0x001B, 0x0088, 0x0089, 0x008A, 0x008B, 0x008C, 0x0005, 0x0006, 0x0007,
    0x0090, 0x0091, 0x0016, 0x0093, 0x0094, 0x0095, 0x0096, 0x0004, 0x0098, 0x0099, 0x009A, 0x009B, 0x0014, 0x0015, 0x009E, 0x001A,
    0x0020, 0x05D0, 0x05D1, 0x05D2, 0x05D3, 0x05D4, 0x05D5, 0x05D6, 0x05D7, 0x05D8, 0x00A2, 0x002E, 0x003C, 0x0028, 0x002B, 0x007C,
    0x0026, 0x05D9, 0x05DA, 0x05DB, 0x05DC, 0x05DD, 0x05DE, 0x05DF, 0x05E0, 0x05E1, 0x0021, 0x0024, 0x002A, 0x0029, 0x003B, 0x00AC,
    0x002D, 0x002F, 0x05E2, 0x05E3, 0x05E4, 0x05E5, 0x05E6, 0x05E7, 0x05E8, 0x05E9, 0x00A6, 0x002C, 0x0025, 0x005F, 0x003E, 0x003F,
    0xFFFD, 0x05EA, 0xFFFD, 0xFFFD, 0x00A0, 0xFFFD, 0xFFFD, 0xFFFD, 0x2017, 0x0060, 0x003A, 0x0023, 0x0040, 0x0027, 0x003D, 0x0022,
    0x0080, 0x0061, 0x0062, 0x0063, 0x0064, 0x0065, 0x0066, 0x0067, 0x0068, 0x0069, 0x00AB, 0x00BB, 0x008C, 0x008D, 0x008E, 0x00B1,
    0x00B0, 0x006A, 0x006B, 0x006C, 0x006D, 0x006E, 0x006F, 0x0070, 0x0071, 0x0072, 0x009A, 0x009B, 0x009C, 0x00B8, 0x009E, 0x00A4,
    0x00B5, 0x007E, 0x0073, 0x0074, 0x0075, 0x0076, 0x0077, 0x0078, 0x0079, 0x007A, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0x00AE,
    0x005E, 0x00A3, 0x00A5, 0x00B7, 0x00A9, 0x00A7, 0x00B6, 0x00BC, 0x00BD, 0x00BE, 0x005B, 0x005D, 0x00AF, 0x00A8, 0x00B4, 0x00D7,
    0x007B, 0x0041, 0x0042, 0x0043, 0x0044, 0x0045, 0x0046, 0x0047, 0x0048, 0x0049, 0x00AD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD,
    0x007D, 0x004A, 0x004B, 0x004C, 0x004D, 0x004E, 0x004F, 0x0050, 0x0051, 0x0052, 0x00B9, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD,
    0x005C, 0x00F7, 0x0053, 0x0054, 0x0055, 0x0056, 0x0057, 0x0058, 0x0059, 0x005A, 0x00B2, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD,
    0x0030, 0x0031, 0x0032, 0x0033, 0x0034, 0x0035, 0x0036, 0x0037, 0x0038, 0x0039, 0x00B3, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0x009F
  ]
} as const;

/**
 * The whole page in one iconv(1) run, or undefined when iconv(1) does not know
 * the page under that name.
 */
function tableViaIconv(name: string): (number | undefined)[] | undefined {
  const probe = Buffer.alloc(255 * 2);
  for (let byte = 1; byte < 256; byte++) {
    probe[(byte - 1) * 2] = 0x00;
    probe[(byte - 1) * 2 + 1] = byte;
  }
  const result = spawnSync('iconv', ['-f', name, '-t', 'UCS-4LE', '-c'], { input: probe, maxBuffer: 1 << 24 });
  if (result.error) {
    throw new Error(`cannot run iconv(1): ${result.error.message}`);
  }
  if (result.status !== 0) {
    return undefined;
  }
  if (result.stdout.length % 4 !== 0) {
    throw new Error(`iconv(1) returned ${result.stdout.length} bytes for ${name}, not a whole number of code points`);
  }
  const units: number[] = [];
  for (let at = 0; at < result.stdout.length; at += 4) {
    units.push(result.stdout.readUInt32LE(at));
  }

  const table: (number | undefined)[] = [delimiter, ...Array.from<number | undefined>({ length: 255 }).fill(undefined)];
  let pos = 0;
  for (let byte = 1; byte < 256; byte++) {
    if (pos >= units.length || units[pos] !== delimiter) {
      throw new Error(
        `iconv(1) lost the delimiter of ${name} in front of byte 0x${byte.toString(16).padStart(2, '0')}, ` +
          'so the page cannot be read as one sequence of delimited bytes'
      );
    }
    pos += 1;
    // A byte the page does not define leaves nothing behind but its delimiter,
    // which is either the delimiter of the next byte or the end of the run.
    if (pos < units.length && units[pos] !== delimiter) {
      table[byte] = units[pos];
      pos += 1;
    }
  }
  if (pos !== units.length) {
    throw new Error(`iconv(1) returned ${units.length - pos} code points for ${name} that the page does not account for`);
  }
  return table;
}

/**
 * Fills in the bytes a code page leaves empty, so that every byte becomes a
 * character and no table has a gap.
 *
 * A code page need not give a meaning to every byte. A byte with no meaning in
 * 0x80-0x9f becomes the character with the same number, so 0x81 becomes
 * U+0081. Windows does this, and so do browsers: the standard that defines how
 * browsers read these pages fills the gaps the same way, see section 9.1 at
 * https://encoding.spec.whatwg.org and for a full table
 * https://encoding.spec.whatwg.org/index-windows-1252.txt
 *
 * An empty byte anywhere else becomes U+FFFD, the replacement character that
 * stands for input we could not read.
 */
function finalize(table: readonly (number | undefined)[]): number[] {
  // A table written out by hand is transcribed 256 values at a time, and one
  // value too many or too few is otherwise dropped or read past without notice.
  if (table.length !== 256) {
    throw new Error(`a code page table has ${table.length} values instead of 256`);
  }
  const out: number[] = [];
  for (let byte = 0; byte < 256; byte++) {
    const value = table[byte] ?? (byte >= 0x80 && byte <= 0x9f ? byte : replacementChar);
    if ((value === delimiter) !== (byte === 0)) {
      throw new Error(
        `byte 0x${byte.toString(16).padStart(2, '0')} would decode to U+${value.toString(16).padStart(4, '0')}, ` +
          'which is the delimiter the page was read with, so the page cannot be read this way'
      );
    }
    if (value > 0xffff) {
      throw new Error(`byte 0x${byte.toString(16).padStart(2, '0')} would decode to U+${value.toString(16)}, outside the BMP`);
    }
    out.push(value);
  }
  return out;
}

/** One code page, together with the table and where the table came from. */
interface BuiltPage {
  readonly page: CodePage;
  readonly toUnicode: readonly number[];
  /** Which source was used for it, e.g. 'iconv CP850'. */
  readonly source: string;
}

/**
 * The page as its own source says it is, with the invariants every table has to
 * hold checked on the way out.
 */
function buildPage(page: CodePage): BuiltPage {
  const source = page.source;
  let table: readonly (number | undefined)[] | undefined;
  let how: string;

  switch (source.kind) {
    case 'table':
      table = hardCodedTables[source.key];
      how = `written out (${source.key})`;
      break;
    case 'euro': {
      const base = tableViaIconv(source.of);
      if (!base) {
        throw new Error(`iconv(1) does not know ${source.of}, the page code page ${page.codePage} is built from`);
      }
      const euro: (number | undefined)[] = [...base];
      euro[euroByte] = euroSign;
      table = euro;
      how = `iconv ${source.of} with U+20AC at 0x9f`;
      break;
    }
    case 'iconv': {
      table = tableViaIconv(source.name);
      if (!table) {
        throw new Error(`iconv(1) does not know the code page ${page.codePage} (${page.id}, ${page.name}) as ${source.name}`);
      }
      how = `iconv ${source.name}`;
      break;
    }
  }

  try {
    return { page, toUnicode: finalize(table!), source: how };
  } catch (error) {
    throw new Error(`code page ${page.codePage} (${page.id}, ${page.name}): ${(error as Error).message}`);
  }
}

/** The name a page's table gets in the generated file. */
function tableIdentifier(id: string): string {
  return `${id}Table`;
}

const generatedHeader = `/*
  Generated data, one table per single byte code page. Each table maps all 256
  byte values to a Unicode code point, so decoding never has to ask whether a
  byte is defined: a byte the code page leaves undefined is mapped to the C1
  control of the same value in 0x80-0x9f (which is what the Windows ANSI pages
  do) and to U+FFFD anywhere else.

  Generated by tools/CodePageTables-Generator.ts, which asks iconv(1) for each
  page in a single conversion of its 256 bytes, and writes out the few pages
  iconv(1) gets wrong or does not know, each transcribed from the vendor's own
  table.

  These are the code pages of single byte encodings only. A code page that is
  multi byte (932, 936, 949, 950, 1361, 20932, 51932, 54936, ...) has no table
  here, because a table of one code point per byte cannot describe them.
*/
`;

function emitFile(pages: readonly BuiltPage[]): string {
  const out: string[] = [generatedHeader];
  for (const { page, toUnicode } of pages) {
    out.push(`/** Byte value to Unicode code point, code page ${page.codePage}: ${page.name}. */`);
    out.push(`const ${tableIdentifier(page.id)}: readonly number[] = [`);
    for (let row = 0; row < 256; row += 8) {
      const cells = toUnicode
        .slice(row, row + 8)
        .map(value => `0x${value.toString(16).toUpperCase().padStart(4, '0')}`)
        .join(', ');
      out.push(`  ${cells}${row === 248 ? '' : ','}`);
    }
    out.push('];', '');
  }
  out.push('/** One single byte code page: its identifier, and what a byte of it decodes to. */');
  out.push('export interface CodePageTable {');
  out.push('  /** A short label for the page, e.g. \'latin1\'. */');
  out.push('  readonly id: string;');
  out.push('  /** The Microsoft code page identifier, e.g. 28591. */');
  out.push('  readonly codePage: number;');
  out.push('  /** What the page is called, e.g. \'ISO 8859-1\'. */');
  out.push('  readonly name: string;');
  out.push('  /** Byte value to Unicode code point, 256 entries. */');
  out.push('  readonly toUnicode: readonly number[];');
  out.push('}', '');
  out.push('/** Every single byte code page, in ascending order of the code page number. */');
  out.push('export const codePageTables: readonly CodePageTable[] = [');
  for (const { page } of pages) {
    out.push(`  { id: '${page.id}', codePage: ${page.codePage}, name: '${page.name}', toUnicode: ${tableIdentifier(page.id)} },`);
  }
  out.push('];', '');
  return out.join('\n');
}

/** The INFO text fields of a fixture, which between them exercise a whole code page. */
const fixtureFieldIds = ['IART', 'IPRD', 'ICMT'] as const;

/** The prefix a code page fixture is named after, so a stale one is recognisable. */
const fixturePrefix = 'cest_info-cp';

/**
 * A RIFF chunk: its four character id, its size, its payload, and the pad byte
 * the specification asks for after a payload of an odd number of bytes.
 */
function riffChunk(id: string, payload: Uint8Array): Buffer {
  const header = Buffer.alloc(8);
  header.write(id, 0, 4, 'ascii');
  header.writeUInt32LE(payload.length, 4);
  return Buffer.concat([header, Buffer.from(payload), Buffer.alloc(payload.length % 2)]);
}

/**
 * A WAV file that declares `codePage` in its CSET chunk and holds every byte
 * value the page can map, bar NUL, in each of its INFO text fields.
 *
 * NUL is left out because it ends the text, so a field cannot carry it and go on
 * to the bytes behind. The fields are 255 bytes plus that NUL, which is an even
 * number, so none of them is padded and every fixture is the same length.
 */
function fixtureFile(codePage: number): Buffer {
  // 16 bytes of PCM, mono, 8 bits per sample, 22050 Hz.
  const format = Buffer.alloc(16);
  format.writeUInt16LE(1, 0);
  format.writeUInt16LE(1, 2);
  format.writeUInt32LE(22050, 4);
  format.writeUInt32LE(22050, 8);
  format.writeUInt16LE(1, 12);
  format.writeUInt16LE(8, 14);

  // The code page, in the 8 bytes the RIFF specification gives CSET.
  const cset = Buffer.alloc(8);
  cset.writeUInt16LE(codePage, 0);

  const text = Buffer.concat([Buffer.from(Array.from({ length: 255 }, (_, at) => at + 1)), Buffer.from([0x00])]);
  const info = Buffer.concat([Buffer.from('INFO', 'ascii'), ...fixtureFieldIds.map(id => riffChunk(id, text))]);

  const body = Buffer.concat([
    riffChunk('fmt ', format),
    riffChunk('data', Buffer.alloc(8, 0x80)),
    riffChunk('CSET', cset),
    riffChunk('LIST', info)
  ]);

  const riff = Buffer.alloc(8);
  riff.write('RIFF', 0, 4, 'ascii');
  // The size of everything after the size field, which includes the WAVE type.
  riff.writeUInt32LE(body.length + 4, 4);
  return Buffer.concat([riff, Buffer.from('WAVE', 'ascii'), body]);
}

/** The fixtures to write, each under the name it gets and as the bytes it is written as. */
function buildFixtures(pages: readonly BuiltPage[]): { name: string; bytes: Buffer }[] {
  return pages.map(({ page }) => ({ name: `${fixturePrefix}${page.codePage}.wav`, bytes: fixtureFile(page.codePage) }));
}

function main(): void {
  const outFile = join(here, '..', 'lib', 'common', 'CodePageTables.ts');
  const fixtureDir = join(here, '..', 'test', 'samples', 'wav');

  // A code page or a label twice would make one of the two silently unreachable.
  const seenCodePages = new Set<number>();
  const seenIds = new Set<string>();
  for (const page of codePages) {
    if (seenCodePages.has(page.codePage)) {
      throw new Error(`code page ${page.codePage} is listed twice`);
    }
    if (seenIds.has(page.id)) {
      throw new Error(`the label '${page.id}' is used by more than one code page`);
    }
    seenCodePages.add(page.codePage);
    seenIds.add(page.id);
  }

  const pages = [...codePages].sort((a, b) => a.codePage - b.codePage).map(page => buildPage(page));

  const width = Math.max(...pages.map(({ page }) => page.codePage.toString().length));
  console.log(`single byte code pages: ${pages.length}`);
  for (const { page, source } of pages) {
    console.log(`  ${page.codePage.toString().padStart(width)}  ${page.id.padEnd(14)} ${page.name.padEnd(45)} ${source}`);
  }

  writeFileSync(outFile, emitFile(pages));
  console.log(`\nwrote ${outFile} (${pages.length} code pages, ${pages.length * 256} values)`);

  mkdirSync(fixtureDir, { recursive: true });
  for (const { name, bytes } of buildFixtures(pages)) {
    writeFileSync(join(fixtureDir, name), bytes);
  }
  console.log(`wrote ${pages.length} code page fixtures to ${fixtureDir} (${fixturePrefix}<code page>.wav)`);
}

main();
