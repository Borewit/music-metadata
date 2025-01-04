import { assert } from 'chai';
import path from 'node:path';
import { Parsers } from './metadata-parsers.js';
import { samplePath } from './util.js';

const amrPath = path.join(samplePath, 'amr');

describe('Adaptive Multi-Rate (AMR) audio file', () => {

  Parsers.forEach(parser => {

    describe(parser.description, () => {

      it('parse: sample.amr', async function () {
        const {metadata} = await parser.initParser(() => this.skip(), path.join(amrPath, 'sample.amr'), 'audio/amr', {duration: true});
        const {format} = metadata;
        assert.strictEqual(format.sampleRate, 8000, 'format.sampleRate');
        assert.strictEqual(format.numberOfChannels, 1, 'format.numberOfChannels');
        assert.strictEqual(format.bitrate, 64000, 'format.bitrate');
        assert.approximately(format.duration, 35.36, 0.0005, 'format.duration');
      });

      it('parse: gs-16b-1c-8000hz.amr', async function () {
        const {metadata} = await parser.initParser(() => this.skip(), path.join(amrPath, 'gs-16b-1c-8000hz.amr'), 'audio/amr', {duration: true});
        const {format} = metadata;
        assert.strictEqual(format.sampleRate, 8000, 'format.sampleRate');
        assert.strictEqual(format.numberOfChannels, 1, 'format.numberOfChannels');
        assert.strictEqual(format.bitrate, 64000, 'format.bitrate');
        assert.approximately(format.duration, 16.42, 0.0005, 'format.duration');
      });


      it('parse: ff-16b-1c-8000hz.amr', async function () {
        const {metadata} = await parser.initParser(() => this.skip(), path.join(amrPath, 'ff-16b-1c-8000hz.amr'), 'audio/amr', {duration: true});
        const {format} = metadata;
        assert.strictEqual(format.sampleRate, 8000, 'format.sampleRate');
        assert.strictEqual(format.numberOfChannels, 1, 'format.numberOfChannels');
        assert.strictEqual(format.bitrate, 64000, 'format.bitrate');
        assert.approximately(format.duration, 187.56, 0.0005, 'format.duration');
      });

    });
  });

});
