import { fileTypeFromTokenizer } from 'file-type';
import { EndOfStreamError, type ITokenizer } from 'strtok3';
import { decodeAscii } from './bytes.js';
import type { ByteSource } from './source.js';

export type ContainerFormat = 'flac' | 'id3' | 'mp3' | 'wav' | 'mp4' | 'ogg' | 'unknown';

/** Detect audio containers using file-type without loading the entire file. */
export async function detectFormat(source: ByteSource): Promise<ContainerFormat> {
  if (source.size >= 12) {
    const header = await source.read(0, 12);
    if (decodeAscii(header.subarray(0, 4)) === 'OggS') {
      return 'ogg';
    }
    if (decodeAscii(header.subarray(0, 4)) === 'RIFF' && decodeAscii(header.subarray(8, 12)) === 'WAVE') {
      return 'wav';
    }
  }
  let extension: string | undefined;
  try {
    const tokenizer = source.tokenizer;
    tokenizer.setPosition(0);
    // file-type closes its input. Borrow the methods while retaining ownership
    // of the source so the writer can continue reading the same open file.
    const borrowed: ITokenizer = {
      fileInfo: tokenizer.fileInfo,
      get position() {
        return tokenizer.position;
      },
      readBuffer: tokenizer.readBuffer.bind(tokenizer),
      peekBuffer: tokenizer.peekBuffer.bind(tokenizer),
      readToken: tokenizer.readToken.bind(tokenizer),
      peekToken: tokenizer.peekToken.bind(tokenizer),
      readNumber: tokenizer.readNumber.bind(tokenizer),
      peekNumber: tokenizer.peekNumber.bind(tokenizer),
      ignore: tokenizer.ignore.bind(tokenizer),
      supportsRandomAccess: tokenizer.supportsRandomAccess.bind(tokenizer),
      abort: tokenizer.abort.bind(tokenizer),
      close: async () => {
        /* The borrowed source remains owned by the caller. */
      }
    };
    extension = (await fileTypeFromTokenizer(borrowed))?.ext;
  } catch (error) {
    if (!(error instanceof EndOfStreamError)) {
      throw error;
    }
  }
  if (extension === 'm4a' || extension === 'mp4' || extension === 'm4b') {
    return 'mp4';
  }
  if (extension === 'flac' || extension === 'mp3' || extension === 'wav') {
    return extension;
  }

  // Route incomplete or unsupported ID3 input to the writer for validation.
  // file-type can return undefined for truncated tags or an ID3v2.4 footer.
  if (source.size >= 3) {
    const signature = await source.read(0, 3);
    if (signature[0] === 73 && signature[1] === 68 && signature[2] === 51) {
      return 'id3';
    }
  }
  return 'unknown';
}
