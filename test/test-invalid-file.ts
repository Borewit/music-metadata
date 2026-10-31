import path from 'node:path';
import { assert, expect } from 'chai';
import * as mm from '../lib/index.js';
import { CouldNotDetermineFileTypeError, parseFile, UnsupportedFileTypeError } from '../lib/index.js';
import { samplePath } from './shared/util.js';

describe('Errors in case a file cannot be parsed', () => {
  it('should throw CouldNotDetermineFileTypeError if the file type is not known', async () => {
    const filePath = path.join(samplePath, 'not-an-audio-file.txt');
    await expect(parseFile(filePath)).to.be.rejectedWith(
      CouldNotDetermineFileTypeError,
      'Failed to determine audio format: '
    );
  });

  it('should throw UnsupportedFileTypeError if the file type is not supported', async () => {
    const filePath = path.join(samplePath, 'tinytrans.gif');
    await expect(parseFile(filePath)).to.be.rejectedWith(
      UnsupportedFileTypeError,
      'Guessed MIME-type not supported: image/gif: '
    );
  });

  it("should reject files that can't be parsed", async () => {
    const filePath = path.join(samplePath, 'flac.flac.jpg');

    // Run with default options
    try {
      await mm.parseFile(filePath);
      assert.fail('Should reject a file which cannot be parsed');
    } catch (err) {
      assert.isDefined(err);
      assert.isDefined(err.message);
    }
  });
});
