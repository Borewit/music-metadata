import initDebug from 'debug';
import { fromFile } from 'strtok3';
import { getTokenizerOptions } from './common/Allocation.js';
import { CouldNotDetermineFileTypeError, UnsupportedFileTypeError } from './core.js';
import { ParserFactory } from './ParserFactory.js';
import type { IAudioMetadata, IOptions } from './type.js';

const debug = initDebug('music-metadata:parser');

/**
 * Parse audio from Node file
 * Requires a regular file; symlinks to regular files are supported.
 * @param filePath - Media file to read meta-data from
 * @param options - Parsing options
 * @returns Metadata
 * @throws {NotRegularFileError} If the opened filesystem object is not a regular file.
 */
export async function parseFile(filePath: string, options: IOptions = {}): Promise<IAudioMetadata> {
  debug(`parseFile: ${filePath}`);

  const fileTokenizer = await fromFile(filePath, {
    ...getTokenizerOptions(options),
    regularFileOnly: true
  });

  const parserFactory = new ParserFactory();

  try {
    return await parserFactory.parse(fileTokenizer, options);
  } catch (error: unknown) {
    if (error instanceof CouldNotDetermineFileTypeError || error instanceof UnsupportedFileTypeError) {
      error.message += `: ${filePath}`;
    }
    throw error;
  } finally {
    await fileTokenizer.close();
  }
}
