import { assert } from 'chai';
import path from 'node:path';

import { Parsers } from './metadata-parsers.js';
import { samplePath } from './util.js';

describe('Parse Musepack (.mpc)', () => {

  const mpcSamplePath = path.join(samplePath, 'mpc');

  describe('Parse Musepack, SV7 with APEv2 header', () => {

    const filePath = path.join(mpcSamplePath, 'apev2.sv7.mpc');

    Parsers.forEach(parser => {
      it(parser.description, async function(){

        const { format, common } = await parser.initParser(() => this.skip(), filePath, 'audio/musepac');
        // Check format
        assert.deepEqual(format.container, 'Musepack, SV7');
        assert.strictEqual(format.sampleRate, 44100);
        assert.strictEqual(format.numberOfSamples, 11940);
        assert.approximately(format.bitrate, 269649, 1);
        assert.strictEqual(format.codec, '1.15');

        // Check generic metadata
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

  describe('Handle APEv1 TAG header (no header, only footer)', () => {

    /**
     * In this sample the APEv2 header is not present, only the APEv2 footer
     */
    const filePath = path.join(mpcSamplePath, 'apev2-no-header.sv7.mpc');

    Parsers.forEach(parser => {
      it(parser.description, async function(){

        const { format, common } = await parser.initParser(() => this.skip(), filePath, 'audio/musepac');
        // Check format
        assert.deepEqual(format.container, 'Musepack, SV7');
        assert.strictEqual(format.sampleRate, 44100);
        assert.strictEqual(format.numberOfSamples, 11940);
        assert.approximately(format.bitrate, 269649, 1);
        assert.strictEqual(format.codec, '1.15');

        // Check generic metadata
        assert.strictEqual(common.title, 'God Inside');
        assert.strictEqual(common.artist, 'Faze Action');
        assert.strictEqual(common.album, 'Broad Souls');
        assert.strictEqual(common.date, '2004');
        assert.deepEqual(common.track, {no: 9, of: null});
      });
    });

  });

  describe('Parse Musepack, SV8 with APEv2 header', () => {

    const filePath = path.join(mpcSamplePath, 'bach-goldberg-variatians-05.sv8.mpc');

    Parsers.forEach(parser => {
      it(parser.description, async function(){

        const { format, common } = await parser.initParser(() => this.skip(), filePath, 'audio/musepac');
        // Check format
        assert.deepEqual(format.container, 'Musepack, SV8');
        assert.strictEqual(format.sampleRate, 48000);
        assert.strictEqual(format.numberOfSamples, 24000);
        assert.strictEqual(format.numberOfChannels, 2);
        assert.approximately(format.duration, 0.5, 1 / 2000);
        assert.approximately(format.bitrate, 32368, 1);

        // Check generic metadata
        assert.strictEqual(common.title, 'Goldberg Variations, BWV 988: Variatio 4 a 1 Clav.');
        assert.strictEqual(common.artist, 'Johann Sebastian Bach');
        assert.deepEqual(common.artists, ['Johann Sebastian Bach']);
        assert.deepEqual(common.isrc, ['QMNYZ1200005']);
        assert.deepEqual(common.license, 'https://creativecommons.org/publicdomain/zero/1.0/');
        assert.strictEqual(common.album, 'Open Goldberg Variations');
        assert.strictEqual(common.date, '2012-05-28');
        assert.deepEqual(common.track, {no: 5, of: 32});
      });
    });

  });

});
