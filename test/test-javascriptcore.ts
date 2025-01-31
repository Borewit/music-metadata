import { assert } from 'chai';
import path from 'node:path';

import { samplePath } from './util.js';
import { Parsers } from "./metadata-parsers.js";

describe('JavaScriptCore', () => {

  const mp3SamplePath = path.join(samplePath, 'mp3');

  it('should parse mp3s correctly', async () => {
    const filePath = path.join(mp3SamplePath, 'lame-peak.mp3');

    Parsers.forEach(parser => {
      it(parser.description, async function(){
        const { format, common } = await parser.initParser(() => this.skip(), filePath);
        assert.isNotNull(format, 'format');
        assert.isNotNull(common, 'common');
      });
    });
  });

});
