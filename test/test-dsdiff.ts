import {assert} from 'chai';
import * as mm from '../src';
import * as path from 'path';

describe('Parse Philips DSDIFF', () => {

  const dsdiffamplePath = path.join(__dirname, 'samples', 'dsdiff');

  it('parse: DSD64.dff', async () => {

    const filePath = path.join(dsdiffamplePath, 'DSD64.dff');

    const {format, common} = await mm.parseFile(filePath, {duration: false});

    // format chunk information
    assert.strictEqual(format.container, 'DSDIFF/DSD');
    assert.deepEqual(format.lossless, true);
    assert.deepEqual(format.tagTypes, ['ID3v2.3']);
    assert.deepEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
    assert.deepEqual(format.bitsPerSample, 1, 'format.bitsPerSample');
    assert.deepEqual(format.sampleRate, 2822400, 'format.sampleRate [Hz]');
    assert.deepEqual(format.numberOfSamples, 300800, 'format.numberOfSamples');
    assert.deepEqual(format.duration, 300800 / 2822400, 'format.duration');
    assert.deepEqual(format.bitrate, 5644800, 'format.bitrate');
    assert.deepEqual(format.tagTypes, ['ID3v2.3'], 'TAG headers');

    // ID3v2 chunk information
    assert.strictEqual(common.artist, 'CANTUS (Tove Ramlo-Ystad) & Frode Fjellheim', 'common.artist');
    assert.strictEqual(common.title, 'Kyrie', 'common.title');
    assert.strictEqual(common.album, 'SPES', 'common.album');
    assert.deepEqual(common.genre, ['Choral'], 'common.genre');
    assert.deepEqual(common.track, {no: 4, of: 12}, 'common.track');
  });

});
