import type { IChapter, IComment, ICommonTagsResult, ILyricsText, IPicture } from '../../type.js';

/**
 * A tag value that may be set, replaced, or removed.
 *
 * - `undefined` (or an absent property) leaves the existing value untouched.
 * - `null` removes the value.
 * - a string or array of strings sets the value.
 */
export type TextPatch = string | readonly string[] | null;

/**
 * Track or disc number, with an optional total.
 *
 * A missing property is left untouched; `null` removes it.
 */
export type NumberPairPatch = Partial<ICommonTagsResult['track']>;

/**
 * Track or disc number as returned by `music-metadata`.
 */
export type NumberPair = ICommonTagsResult['track'];

/**
 * Embedded picture, extending `music-metadata`'s `IPicture` with the optional
 * dimensions that can be stored in a FLAC PICTURE block.
 */
export interface Picture extends IPicture {
  /** Image width in pixels, when known. */
  width?: number;
  /** Image height in pixels, when known. */
  height?: number;
  /** Bits per pixel, when known. */
  colour_depth?: number;
  indexed_color?: number;
  colourDepth?: number;
  /** Number of colours for indexed images, when known. */
  colours?: number;
}

/**
 * Comment value accepted by a patch.
 *
 * This is structurally identical to `music-metadata`'s `IComment`.
 */
export type Comment = IComment;

/**
 * One line of synchronized lyrics.
 *
 * Identical to `music-metadata`'s `ILyricsText`.
 */
export type SynchronizedLyricsText = ILyricsText;

/**
 * One lyrics entry accepted by `TagPatch.lyrics`.
 *
 * This is structurally compatible with `music-metadata`'s `IComment` and
 * `ILyricsTag`, so reader results can be written back without translation.
 * Unlike `ILyricsTag`, all fields are optional to accept partial input patches.
 *
 * Which properties survive depends on the container:
 *
 * - MP3/ADTS AAC/WAV preserve `language`, `descriptor`, `contentType`, `timeStampFormat`
 *   and `syncText` by writing `USLT` and/or `SYLT` frames.
 * - FLAC stores `text` in `LYRICS`, or an LRC string when `syncText` is present.
 *   Language, descriptor, content type and timestamp format are not stored.
 * - MP4 stores `text` in `©lyr`; when only `syncText` is supplied, the line
 *   texts are joined with newlines. Timing and ID3 attributes are not stored.
 */
export interface LyricsEntry {
  /** Un-synchronized lyrics text. */
  text?: string;
  /** Three-letter ID3 language code, for example `eng` or `zho`. */
  language?: string;
  /** Content descriptor stored in `USLT`/`SYLT`. */
  descriptor?: string;
  /** ID3 `SYLT` content type from 0 to 8. Defaults to lyrics (`1`) for ID3 output. */
  contentType?: number;
  /**
   * ID3 `SYLT` timestamp format. Defaults to milliseconds (`2`) for ID3 output. FLAC LRC output requires milliseconds (`2`);
   * MP4 ignores it.
   */
  timeStampFormat?: number;
  /**
   * Synchronized lines. FLAC rejects CR/LF in line text, writes these as LRC and requires millisecond
   * timestamps on every line.
   */
  syncText?: readonly SynchronizedLyricsText[];
}

/**
 * Lyrics value accepted by a patch.
 *
 * - A string sets un-synchronized text.
 * - A single entry or an array of entries sets one or more lyrics records.
 * - An empty string, an empty array or `null` removes all lyrics.
 *
 * A lyrics patch replaces the complete lyrics value for the edited format.
 * On MP3/ADTS AAC/WAV, text-only input removes existing `SYLT` frames and synchronized
 * input removes existing `USLT` frames. Use an entry containing both `text` and
 * `syncText` to keep both representations.
 *
 * Reading FLAC LRC text through `music-metadata` and writing it back normalizes
 * timestamps (for example `[00:01.25]` becomes `[00:01.250]`). Use the native
 * `LYRICS` field when byte-identical LRC text is required.
 */
export type LyricsPatch = string | LyricsEntry | readonly (string | LyricsEntry)[] | null;

/**
 * Common tag patch.
 *
 * Fields use the same names as `music-metadata`'s `ICommonTagsResult`, so a
 * caller can round-trip values read by `music-metadata` without a translation
 * table.
 */
interface CustomTagPatch {
  notes?: TextPatch;
  barcode?: TextPatch;
  releasecountry?: TextPatch;
  asin?: TextPatch;
  albumartistsort?: TextPatch;
  artistsort?: TextPatch;
  script?: TextPatch;
  releasestatus?: TextPatch;
  releasetype?: TextPatch;
  acoustid_id?: TextPatch;
  rating?: Readonly<NonNullable<ICommonTagsResult['rating']>> | null;
  title?: TextPatch;
  artist?: TextPatch;
  artists?: TextPatch;
  albumartist?: TextPatch;
  albumartists?: TextPatch;
  album?: TextPatch;
  date?: TextPatch;
  originaldate?: TextPatch;
  originalyear?: number | null;
  releasedate?: TextPatch;
  genre?: TextPatch;
  comment?: Comment | readonly Comment[] | string | null;
  composer?: TextPatch;
  lyricist?: TextPatch;
  writer?: TextPatch;
  conductor?: TextPatch;
  remixer?: TextPatch;
  arranger?: TextPatch;
  engineer?: TextPatch;
  producer?: TextPatch;
  mixer?: TextPatch;
  technician?: TextPatch;
  label?: TextPatch;
  catalognumber?: TextPatch;
  isrc?: TextPatch;
  bpm?: number | string | null;
  copyright?: TextPatch;
  media?: TextPatch;
  mood?: TextPatch;
  grouping?: TextPatch;
  subtitle?: TextPatch;
  /**
   * MP4 Nero chapters: undefined preserves, null/[] removes, an array replaces.
   * Uses each chapter's timeScale (default 1). Supports at most 255 chapters
   * and 255 UTF-8 bytes per title, with increasing starts before movie duration.
   * Explicit ends must match the next start or movie duration; URLs/images are
   * unsupported. Replacing/removing chapters retires dedicated QuickTime chapter
   * tracks, but leaves their media bytes intact. No QuickTime tracks are written.
   */
  chapters?: readonly IChapter[] | null;
  website?: TextPatch;
  lyrics?: LyricsPatch;
  picture?: readonly Picture[] | null;
  movementIndex?: NumberPairPatch | null;
  track?: NumberPairPatch | null;
  disk?: NumberPairPatch | null;
  /** MusicBrainz recording identifier (the Vorbis `MUSICBRAINZ_TRACKID` field). */
  musicbrainz_recordingid?: TextPatch;
  /** MusicBrainz release-track identifier (the Vorbis `MUSICBRAINZ_RELEASETRACKID` field). */
  musicbrainz_trackid?: TextPatch;
  /** MusicBrainz release identifier. */
  musicbrainz_albumid?: TextPatch;
  /** MusicBrainz artist identifier. */
  musicbrainz_artistid?: TextPatch;
  /** MusicBrainz album-artist identifier. */
  musicbrainz_albumartistid?: TextPatch;
  /** MusicBrainz release-group identifier. */
  musicbrainz_releasegroupid?: TextPatch;
  /** MusicBrainz work identifier. */
  musicbrainz_workid?: TextPatch;
  /** ReplayGain track gain, e.g. `-6.20 dB`. */
  replaygain_track_gain?: TextPatch | ICommonTagsResult['replaygain_track_gain'];
  /** ReplayGain track peak, e.g. `0.988`. */
  replaygain_track_peak?: TextPatch | ICommonTagsResult['replaygain_track_peak'];
  /** ReplayGain album gain, e.g. `-6.20 dB`. */
  replaygain_album_gain?: TextPatch | ICommonTagsResult['replaygain_album_gain'];
  /** ReplayGain album peak, e.g. `0.988`. */
  replaygain_album_peak?: TextPatch | ICommonTagsResult['replaygain_album_peak'];
  /**
   * Format-native fields, applied after the common mapping.
   *
   * For MP3, ADTS AAC and WAV use frame IDs (TXXX:description for user text), structured native
   * objects for APIC/COMM/USLT/UFID/POPM/TIPL/TMCL, or raw Uint8Array bodies
   * for binary frames. For MP4 use four-character item names or ----:mean:name;
   * strings write UTF-8 data and Uint8Array supplies a complete raw item body
   * (including matching mean/name children for freeform keys).
   * For FLAC use Vorbis Comment field names, e.g.
   * `{ "MY_FIELD": "value" }`. Use `null` to remove a field.
   */
  native?: Readonly<
    Record<
      string,
      | string
      | readonly string[]
      | Uint8Array
      | Readonly<Record<string, unknown>>
      | readonly Readonly<Record<string, unknown>>[]
      | null
    >
  > | null;
}

type CommonPatch = { [K in keyof ICommonTagsResult]?: ICommonTagsResult[K] | null };

/** All reader common fields are accepted, plus the editor's patch conveniences. */
export type TagPatch = Omit<CommonPatch, keyof CustomTagPatch> & CustomTagPatch;

export type PaddingOption = number;

export interface WriteOptions {
  /**
   * Discard the existing leading ID3v2.2/2.3/2.4 tag and trailing ID3v1 tag
   * before writing the patch as ID3v2.4. In WAV, replaces the ID3 chunk contents.
   * Unspecified ID3 fields are lost.
   * Other trailing metadata (such as APE) is preserved. MP3, ADTS AAC and WAV ID3 chunks only.
   */
  replaceId3?: boolean;
  /** Remove a nonstandard leading ID3 tag when rewriting FLAC metadata. */
  stripFlacId3?: boolean;
  /**
   * Target amount of padding to keep or add, in bytes. Defaults to 8192.
   * MP4 and Ogg Vorbis/Opus do not add padding and reject this option.
   */
  padding?: PaddingOption;
  /**
   * Write through a temporary file and rename it into place. Defaults to
   * `true`. Only applies to `updateFile`. When false, stage output in memory
   * and overwrite the existing file in place; MP4 and Ogg Vorbis/Opus instead
   * stage on disk, requiring directory write access and space for a second
   * copy. Neither overwrite is crash-atomic.
   */
  atomic?: boolean;
  /**
   * Keep a backup of the original file. Defaults to `false`.
   */
  backup?: boolean;
  /**
   * Parse and build the output, but do not write anything. `updateFile`
   * returns the byte count that would be written.
   */
  dryRun?: boolean;
}

/**
 * Result of a FLAC, MP3, ADTS AAC, WAV, MP4 or Ogg Vorbis/Opus write operation.
 */
export interface WriteResult {
  /** Container format that was written. */
  format: 'flac' | 'mp3' | 'aac' | 'wav' | 'mp4' | 'ogg';
  /** Total number of bytes in the resulting file. */
  bytesWritten: number;
  /** Padding bytes in the resulting metadata section. */
  paddingBytes: number;
  /** Whether an atomic rename was performed. */
  atomic: boolean;
}

export type CommonTags = ICommonTagsResult;
