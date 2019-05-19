import {assert} from 'chai';
import * as mm from '../src';
import * as path from 'path';

describe('Parse Sony DSF (DSD Stream File)', () => {

  const dsfSamplePath = path.join(__dirname, 'samples', 'dsf');

  it('parse: 2L-110_stereo-5644k-1b_04.dsf', async () => {

    const dsfFilePath = path.join(dsfSamplePath, '2L-110_stereo-5644k-1b_04_0.1-sec.dsf');

    const metadata = await mm.parseFile(dsfFilePath, {duration: false});

    // format chunk information
    assert.strictEqual(metadata.format.container, 'DSF');
    assert.deepEqual(metadata.format.lossless, true);
    assert.deepEqual(metadata.format.numberOfChannels, 2);
    assert.deepEqual(metadata.format.bitsPerSample, 1);
    assert.deepEqual(metadata.format.sampleRate, 5644800);
    assert.deepEqual(metadata.format.numberOfSamples, 564480);
    assert.deepEqual(metadata.format.duration, 0.1);
    assert.deepEqual(metadata.format.bitrate, 11289600);
    assert.deepEqual(metadata.format.tagTypes, ['ID3v2.3']);

    // ID3v2 chunk information
    assert.strictEqual(metadata.common.title, 'Kyrie');
    assert.strictEqual(metadata.common.artist, 'CANTUS (Tove Ramlo-Ystad) & Frode Fjellheim');
    assert.deepEqual(metadata.common.track, {no: 4, of: 12});
  });

});
