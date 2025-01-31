import { assert } from 'chai';
import path from 'node:path';

import * as mm from '../lib/index.js';
import { samplePath } from './util.js';
import fs from "node:fs/promises";


describe('JavaScriptCore', () => {

  const mp3SamplePath = path.join(samplePath, 'mp3');

  it('should parse blobs properly', async () => {
    const filePath = path.join(mp3SamplePath, 'lame-peak.mp3');

    const data = await fs.readFile(filePath);
    const blob = new Blob([data]);
    const metadata = await mm.parseBlob(blob);

    assert.isNotNull(metadata, 'metadata');
  });

});
