import path from 'node:path';
import { Parsers } from './metadata-parsers.js';
import { assert } from 'chai';
import * as mm from '../lib/index.js';
import { samplePath} from './util.js';

describe('Parse AIFF (Audio Interchange File Format)', () => {

  const aiffSamplePath = path.join(samplePath, 'aiff');

  const ULAW = 'ITU-T G.711 mu-law';

  function checkFormat(format: mm.IFormat, compressionType: string, sampleRate: number, channels: number, bitsPerSample: number, samples: number) {
    const lossless = compressionType === 'PCM';
    const dataFormat = lossless ? 'AIFF' : 'AIFF-C';
    const duration = samples / format.sampleRate;
    assert.strictEqual(format.container, dataFormat, `format.container = '${dataFormat}'`);
    assert.strictEqual(format.lossless, lossless, `format.lossless = ${lossless}`);
    assert.strictEqual(format.sampleRate, sampleRate, `format.sampleRate = ${sampleRate} kHz`);
    assert.strictEqual(format.bitsPerSample, bitsPerSample, `format.bitsPerSample = ${bitsPerSample} bit`);
    assert.strictEqual(format.numberOfChannels, channels, `format.numberOfChannels = ${channels} channels`);
    assert.strictEqual(format.numberOfSamples, samples, `format.numberOfSamples = ${samples} samples`);
    assert.strictEqual(format.duration, duration, `format.duration = ${duration} sec.`);
    assert.strictEqual(format.codec, compressionType, `format.codec = ${compressionType}`);
  }

  describe('Parse AIFF', () => {

    Parsers.forEach(parser => {
      it(parser.description, async function(){
        // AIFF file, AIFF file, stereo 8-bit data
        // Source: http://www-mmsp.ece.mcgill.ca/Documents/AudioFormats/AIFF/Samples.html
        const metadata = await parser.initParser(() => this.skip(), path.join(aiffSamplePath, 'M1F1-int8-AFsp.aif'), 'audio/aiff');
        checkFormat(metadata.format, 'PCM', 8000, 2, 8, 23493);
      });
    });
  });

  describe('Parse AIFF-C', () => {

    Parsers.forEach(parser => {
      it(parser.description, async function(){
        // AIFF-C file, stereo A-law data (compression type: alaw)
        // Source: http://www-mmsp.ece.mcgill.ca/Documents/AudioFormats/AIFF/Samples.html
        const metadata = await parser.initParser(this.skip(), path.join(aiffSamplePath, 'M1F1-AlawC-AFsp.aif'), 'audio/aiff');
        checkFormat(metadata.format, 'Alaw 2:1', 8000, 2, 16, 23493);
      });
    });

    // Issue: https://github.com/Borewit/music-metadata/issues/1211
    it('Uncompressed AIFC', async () => {

      const filePath = path.join(aiffSamplePath, 'hit-broken.aif');

      const {format} = await mm.parseFile(filePath);

      assert.strictEqual(format.container, 'AIFF-C', 'format.container');
      assert.strictEqual(format.codec, '32-bit floating point IEEE 32-bit float', 'format.codec');
      assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
    });

  });

  describe('Parse perverse Files', () => {

    describe('AIFF-C file (9 samples) with an odd length intermediate chunk', () => {

      Parsers.forEach(parser => {
        it(parser.description, async function(){
          const metadata = await parser.initParser(() => this.skip(), path.join(aiffSamplePath, 'Pmiscck.aif'), 'audio/aiff');
          checkFormat(metadata.format, ULAW, 8000, 1, 16, 9);
        });
      });
    });

    describe('AIFF-C file with 0 samples (no SSND chunk)', () => {

      Parsers.forEach(parser => {
        it(parser.description, async function(){
          const metadata = await parser.initParser(() => this.skip(), path.join(aiffSamplePath, 'Pnossnd.aif'), 'audio/aiff');
          checkFormat(metadata.format, ULAW, 8000, 1, 16, 0);
        });
      });
    });

    describe('AIFF-C file (9 samples), SSND chunk has a 5 byte offset to the data and trailing junk in the SSND chunk', () => {

      Parsers.forEach(parser => {
        it(parser.description, async function(){
          const metadata = await parser.initParser(() => this.skip(), path.join(aiffSamplePath, 'Poffset.aif'), 'audio/aiff');
          checkFormat(metadata.format, ULAW, 8000, 1, 16, 9);
        });
      });
    });

    describe('AIFF-C file (9 samples) with SSND chunk ahead of the COMM chunk', () => {

      Parsers.forEach(parser => {
        it(parser.description, async function(){
          const metadata = await parser.initParser(() => this.skip(), path.join(aiffSamplePath, 'Porder.aif'), 'audio/aiff');
          checkFormat(metadata.format, ULAW, 8000, 1, 16, 9);
        });
      });
    });

    describe('AIFF-C file (9 samples) with trailing junk after the FORM chunk', () => {

      Parsers.forEach(parser => {
        it(parser.description, async function(){
          const metadata = await parser.initParser(() => this.skip(), path.join(aiffSamplePath, 'Ptjunk.aif'), 'audio/aiff');
          checkFormat(metadata.format, ULAW, 8000, 1, 16, 9);
        });
      });
    });

    describe('AIFF-C file (9 samples) with COMM chunk declaring 92 bytes (1 byte longer than actual file length), SSND with 9 bytes, missing trailing fill byte', () => {

      Parsers.forEach(parser => {
        it(parser.description, async function(){
          const metadata = await parser.initParser(() => this.skip(), path.join(aiffSamplePath, 'Fnonull.aif'), 'audio/aiff');
          checkFormat(metadata.format, ULAW, 8000, 1, 16, 9);
        });
      });
    });

  });

  // Issue: https://github.com/Borewit/music-metadata/issues/643
  it('Parse tag "(c) "', async () => {

    const filePath = path.join(aiffSamplePath, 'No Sanctuary Here.aiff');

    const {format, common} = await mm.parseFile(filePath);

    assert.strictEqual(format.container, 'AIFF', 'format.container');
    assert.strictEqual(format.codec, 'PCM', 'format.codec');

    assert.strictEqual(common.album, 'Hdtracks 2020 Hi-Res Sampler', 'common.album');
    assert.deepStrictEqual(common.artists, ['Chris Jones'], 'common.artists');
    assert.strictEqual(common.encodersettings, 'Lavf58.29.100', 'common.encodersettings');
    assert.strictEqual(common.year, 2020, 'common.year');
  });

  it('text chunks', async () => {

    const filePath = path.join(aiffSamplePath, 'M1F1-AlawC-AFsp.aif');

    const {format, common} = await mm.parseFile(filePath);

    assert.strictEqual(format.container, 'AIFF-C', 'format.container');
    assert.strictEqual(format.codec, 'Alaw 2:1', 'format.codec');

    assert.deepStrictEqual(common.comment, ['AFspdate: 2003-01-30 03:28:34 UTC', 'user: kabal@CAPELLA' ,'program: CopyAudio'], 'common.comment');
  });

});
