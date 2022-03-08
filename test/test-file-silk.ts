import { assert } from 'chai';
import * as path from 'path';
import * as mm from '../lib';

describe('Parse SILK audio format', () => {

  const filePathSilk = path.join(__dirname, 'samples', 'silk');

  it('Parse 0.slk', async () => {

    // Metadata edited with Adobe Audition CC 2018.1

    const metadata = await mm.parseFile(path.join(filePathSilk, '0.slk'));
    const format = metadata.format;
    assert.deepEqual(format.container, 'SILK', 'format.container');
    assert.strictEqual(format.lossless, false);
    assert.strictEqual(format.sampleRate, 8000);
  });
});
