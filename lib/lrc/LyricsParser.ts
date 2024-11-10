import { type ILyricsText, type ILyricsTag, LyricsContentType, TimestampFormat } from '../type.js';

/**
 * Parse LRC (Lyrics) formatted text
 * Ref: https://en.wikipedia.org/wiki/LRC_(file_format)
 * @param lrcString
 */
export function parseLrc(lrcString: string): ILyricsTag {
  const lines = lrcString.split('\n');
  const syncText: ILyricsText[] = [];

  // Regular expression to match LRC timestamps (e.g., [00:45.52])
  const timestampRegex = /\[(\d{2}):(\d{2})\.(\d{2})\]/;

  for (const line of lines) {
    const match = line.match(timestampRegex);

    if (match) {
      const minutes = Number.parseInt(match[1], 10);
      const seconds = Number.parseInt(match[2], 10);
      const hundredths = Number.parseInt(match[3], 10);

      // Convert the timestamp to milliseconds, as per TimestampFormat.milliseconds
      const timestamp = (minutes * 60 + seconds) * 1000 + hundredths * 10;

      // Get the text portion of the line (e.g., "あの蝶は自由になれたかな")
      const text = line.replace(timestampRegex, '').trim();

      syncText.push({ timestamp, text });
    }
  }

  // Creating the ILyricsTag object
  return {
    contentType: LyricsContentType.lyrics,
    timeStampFormat: TimestampFormat.milliseconds,
    syncText,
  };
}
