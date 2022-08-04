import {assert} from 'chai';
import path from 'node:path';

import * as mm from '../lib/index.js';
import { samplePath } from './util.js';

describe('Parse Sony DSF (DSD Stream File)', () => {

  const dsfSamplePath = path.join(samplePath, 'dsf');

  it('parse: 2L-110_stereo-5644k-1b_04.dsf', async () => {

    const dsfFilePath = path.join(dsfSamplePath, '2L-110_stereo-5644k-1b_04_0.1-sec.dsf');

    const metadata = await mm.parseFile(dsfFilePath, {duration: false});

    // format chunk information
    assert.strictEqual(metadata.format.container, 'DSF');
    assert.strictEqual(metadata.format.lossless, true);
    assert.strictEqual(metadata.format.numberOfChannels, 2);
    assert.strictEqual(metadata.format.bitsPerSample, 1);
    assert.strictEqual(metadata.format.sampleRate, 5644800);
    assert.strictEqual(Number(metadata.format.numberOfSamples), 564480);
    assert.strictEqual(metadata.format.duration, 0.1);
    assert.strictEqual(metadata.format.bitrate, 11289600);
    assert.deepStrictEqual(metadata.format.tagTypes, ['ID3v2.3']);

    // ID3v2 chunk information
    assert.strictEqual(metadata.common.title, 'Kyrie');
    assert.strictEqual(metadata.common.artist, 'CANTUS (Tove Ramlo-Ystad) & Frode Fjellheim');
    assert.deepStrictEqual(metadata.common.track, {no: 4, of: 12});
  });

});
