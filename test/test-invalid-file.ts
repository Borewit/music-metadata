import { CouldNotDetermineFileTypeError, parseFile, UnsupportedFileTypeError } from '../lib/index.js';
import { samplePath } from './util.js';
import path from 'node:path';
import { expect } from 'chai';

describe('Errors in case a file cannot be parsed', () => {

  it('should throw CouldNotDetermineFileTypeError if the file type is not known', async () => {
    const filePath = path.join(samplePath, 'not-an-audio-file.txt');
    await expect(parseFile(filePath)).to.be.rejectedWith(CouldNotDetermineFileTypeError, 'Failed to determine audio format: ');
  });

  it('should throw UnsupportedFileTypeError if the file type is not supported', async () => {
    const filePath = path.join(samplePath, 'tinytrans.gif');
    await expect(parseFile(filePath)).to.be.rejectedWith(UnsupportedFileTypeError, 'Guessed MIME-type not supported: image/gif: ');
  });

});
