import { IPrivateOptions, IRandomReader } from "./type";
import { APEv2Parser } from "./apev2/APEv2Parser";
import { hasID3v1Header } from "./id3v1/ID3v1Parser";
import { getLyricsHeaderLength } from "./lyrics3/Lyrics3";

/**
 *
 * @param randomReader
 * @param options
 */
export async function scanAppendingHeaders(
  randomReader: IRandomReader,
  options: IPrivateOptions = {}
) {
  let apeOffset = randomReader.fileSize;
  if (await hasID3v1Header(randomReader)) {
    apeOffset -= 128;
    const lyricsLen = await getLyricsHeaderLength(randomReader);
    apeOffset -= lyricsLen;
  }

  options.apeHeader = await APEv2Parser.findApeFooterOffset(
    randomReader,
    apeOffset
  );
}
