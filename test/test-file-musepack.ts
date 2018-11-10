import { assert, expect } from 'chai';
import * as mm from '../src';
import * as path from 'path';

describe('Parse Musepack (.mpc)', () => {

  const samplePath = path.join(__dirname, 'samples', 'mpc');

  describe('Musepack SV7', () => {

    it('Parse Musepack SV7 with APEv2 header', () => {

      const filePath = path.join(samplePath, 'apev2.sv7.mpc');

      return mm.parseFile(filePath, {native: true}).then(metadata => {

        // Check format
        assert.deepEqual(metadata.format.dataformat, 'Musepack/SV7');
        assert.strictEqual(metadata.format.sampleRate, 44100);
        assert.strictEqual(metadata.format.numberOfSamples, 11940);
        assert.approximately(metadata.format.bitrate, 269649, 1);
        assert.strictEqual(metadata.format.encoder, '1.15');

        // Check format
        assert.strictEqual(metadata.common.title, 'God Inside');
        assert.strictEqual(metadata.common.artist, 'Faze Action');
        assert.strictEqual(metadata.common.album, 'Broad Souls');
        assert.strictEqual(metadata.common.date, '2004');
        assert.deepEqual(metadata.common.track, {no: 9, of: null});
      });
    });
  });
});
