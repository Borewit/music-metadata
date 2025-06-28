import {assert} from 'chai';
import path from 'node:path';

import * as mm from '../lib/index.js';
import { samplePath } from './util.js';

describe('Parse Sony DSF (DSD Stream File)', () => {

  const dsfSamplePath = path.join(samplePath, 'dsf');

  it('parse: 2L-110_stereo-5644k-1b_04.dsf', async () => {

    const dsfFilePath = path.join(dsfSamplePath, '2L-110_stereo-5644k-1b_04_0.1-sec.dsf');

    const {format, common} = await mm.parseFile(dsfFilePath, {duration: false});

    // format chunk information
    assert.strictEqual(format.container, 'DSF');
    assert.strictEqual(format.lossless, true);
    assert.strictEqual(format.numberOfChannels, 2);
    assert.strictEqual(format.bitsPerSample, 1);
    assert.strictEqual(format.sampleRate, 5644800);
    assert.strictEqual(Number(format.numberOfSamples), 564480);
    assert.strictEqual(format.duration, 0.1);
    assert.strictEqual(format.bitrate, 11289600);
    assert.deepStrictEqual(format.tagTypes, ['ID3v2.3']);
    assert.isTrue(format.hasAudio, 'format.hasAudio');
    assert.isFalse(format.hasVideo, 'format.hasAudio');

    // ID3v2 chunk information
    assert.strictEqual(common.title, 'Kyrie');
    assert.strictEqual(common.artist, 'CANTUS (Tove Ramlo-Ystad) & Frode Fjellheim');
    assert.deepStrictEqual(common.track, {no: 4, of: 12});
  });

});
