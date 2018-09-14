import * as mm from '../src';
import * as path from 'path';
import {Parsers} from './metadata-parsers';
import {assert} from 'chai';

const t = assert;

describe('Parse AIFF (Audio Interchange File Format)', () => {

  const samplePath = path.join(__dirname, 'samples');

  describe('Parse AIFF-C', () => {

    function checkFormat(format: mm.IFormat) {
      t.strictEqual(format.dataformat, "AIFC", "format.dataformat = 'AIFC'");
      t.deepEqual(format.tagTypes, [], "format.tagTypes = []"); // ToDo
      // ToDo t.strictEqual(format.sampleRate, 8000, 'format.sampleRate = 8 kHz');
      t.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample = 16 bits');
      t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels = 2 channels');
      t.strictEqual(format.numberOfSamples, 23493, 'format.bitsPerSample = 93624');
      // ToDo t.strictEqual(format.duration, 2.937, 'format.duration = ~2.937');
    }

    Parsers.forEach(parser => {
      it(parser.description, () => {
        // AIFF-C file, stereo A-law data (compression type: alaw)
        // Source: http://www-mmsp.ece.mcgill.ca/Documents/AudioFormats/AIFF/Samples.html
        return parser.initParser(path.join(samplePath, 'M1F1-AlawC-AFsp.aif'), 'audio/aiff', {native: true}).then(metadata => {
          checkFormat(metadata.format);
        });
      });
    });

  });

});