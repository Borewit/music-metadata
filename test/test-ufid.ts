import { assert } from 'chai';
import path from 'node:path';

import * as mm from '../lib/index.js';
import { samplePath } from './util.js';

const t = assert;

it('ID3v2.4', async () => {

  const filename = '29 - Dominator.mp3';
  const filePath = path.join(samplePath, filename);

  const metadata = await mm.parseFile(filePath);
  const nativeTags = mm.orderTags(metadata.native['ID3v2.3']);

  t.equal(nativeTags.UFID.length, 1);

  t.deepEqual(nativeTags.UFID[0], {
    owner_identifier: 'http://musicbrainz.org',
    identifier: new Uint8Array([0x33, 0x66, 0x32, 0x33, 0x66, 0x32, 0x63, 0x66, 0x2d,
      0x32, 0x61, 0x34, 0x36, 0x2d, 0x34, 0x38, 0x65, 0x63, 0x2d, 0x38, 0x36, 0x33,
      0x65, 0x2d, 0x36, 0x65, 0x63, 0x34, 0x33, 0x31, 0x62, 0x35, 0x66, 0x65, 0x63,
      0x61])
  }, 'UFID');
});
