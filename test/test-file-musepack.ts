import { assert, expect } from 'chai';
import * as path from 'path';
import { Parsers } from './metadata-parsers';

describe('Parse Musepack (.mpc)', () => {

  const samplePath = path.join(__dirname, 'samples', 'mpc');

  describe('Parse Musepack, SV7 with APEv2 header', () => {

    const filePath = path.join(samplePath, 'apev2.sv7.mpc');

    Parsers.forEach(parser => {
      it(parser.description, () => {

        return parser.initParser(filePath, 'audio/musepack', {native: true}).then(metadata => {
          // Check format
          const format = metadata.format;
          assert.deepEqual(format.container, 'Musepack, SV7');
          assert.strictEqual(format.sampleRate, 44100);
          assert.strictEqual(format.numberOfSamples, 11940);
          assert.approximately(format.bitrate, 269649, 1);
          assert.strictEqual(format.codec, '1.15');

          // Check generic metadata
          const common = metadata.common;
          assert.strictEqual(common.title, 'God Inside');
          assert.strictEqual(common.artist, 'Faze Action');
          assert.strictEqual(common.album, 'Broad Souls');
          assert.strictEqual(common.date, '2004-05-03');
          assert.strictEqual(common.barcode, '802085273528');
          assert.deepEqual(common.catalognumber, ['LUNECD35']);
          assert.strictEqual(common.media, 'CD');
          assert.strictEqual(common.releasecountry, 'GB');
          assert.deepEqual(common.track, {no: 9, of: 10});
        });
      });
    });

  });

  describe('Handle APEv2 with missing header (only footer)', () => {

    /**
     * In this sample the APEv2 header is not present, only the APEv2 footer
     */
    const filePath = path.join(samplePath, 'apev2-no-header.sv7.mpc');

    Parsers.forEach(parser => {
      it(parser.description, () => {

        return parser.initParser(filePath, 'audio/musepack', {native: true}).then(metadata => {
          // Check format
          assert.deepEqual(metadata.format.container, 'Musepack, SV7');
          assert.strictEqual(metadata.format.sampleRate, 44100);
          assert.strictEqual(metadata.format.numberOfSamples, 11940);
          assert.approximately(metadata.format.bitrate, 269649, 1);
          assert.strictEqual(metadata.format.codec, '1.15');

          // Check generic metadata
          assert.strictEqual(metadata.common.title, 'God Inside');
          assert.strictEqual(metadata.common.artist, 'Faze Action');
          assert.strictEqual(metadata.common.album, 'Broad Souls');
          assert.strictEqual(metadata.common.date, '2004');
          assert.deepEqual(metadata.common.track, {no: 9, of: null});
        });
      });
    });

  });

  describe('Parse Musepack, SV8 with APEv2 header', () => {

    const filePath = path.join(samplePath, 'bach-goldberg-variatians-05.sv8.mpc');

    Parsers.forEach(parser => {
      it(parser.description, () => {

        return parser.initParser(filePath, 'audio/musepack', {native: true}).then(metadata => {
          // Check format
          assert.deepEqual(metadata.format.container, 'Musepack, SV8');
          assert.strictEqual(metadata.format.sampleRate, 48000);
          assert.strictEqual(metadata.format.numberOfSamples, 24000);
          assert.strictEqual(metadata.format.numberOfChannels, 2);
          assert.approximately(metadata.format.duration, 0.5, 1 / 2000);
          assert.approximately(metadata.format.bitrate, 32368, 1);

          // Check generic metadata
          assert.strictEqual(metadata.common.title, 'Goldberg Variations, BWV 988: Variatio 4 a 1 Clav.');
          assert.strictEqual(metadata.common.artist, 'Johann Sebastian Bach');
          assert.deepEqual(metadata.common.artists, ['Johann Sebastian Bach']);
          assert.deepEqual(metadata.common.isrc, ['QMNYZ1200005']);
          assert.deepEqual(metadata.common.license, 'https://creativecommons.org/publicdomain/zero/1.0/');
          assert.strictEqual(metadata.common.album, 'Open Goldberg Variations');
          assert.strictEqual(metadata.common.date, '2012-05-28');
          assert.deepEqual(metadata.common.track, {no: 5, of: 32});
        });
      });
    });

  });

});
