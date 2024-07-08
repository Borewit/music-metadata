import { assert } from 'chai';
import path from 'node:path';

import * as mm from '../lib/index.js';
import { samplePath } from './util.js';

it("decode id3v2-utf16", async () => {

  const filename = 'id3v2-utf16.mp3';
  const filePath = path.join(samplePath, filename);

  const metadata = await mm.parseFile(filePath, {duration: true});
  const { common } = metadata;

  assert.strictEqual(common.title, 'Redial (Feat. LeafRunner and Nowacking)', 'title');
  assert.strictEqual(common.artist, 'YourEnigma', 'artist 0');
  assert.strictEqual(common.year, 2014, 'year');
  assert.strictEqual(common.picture[0].format, 'image/jpeg', 'picture 0 format');
  assert.strictEqual(common.picture[0].data.length, 214219, 'picture 0 length');
  assert.deepEqual(common.picture[0].data.slice(0, 2), Uint8Array.from([0xFF, 0xD8]), 'picture 0 JFIF magic header');

  const native = metadata.native['ID3v2.3'];
  assert.ok(native, 'Native id3v2.3 tags should be present');

  assert.deepEqual(native[0], {id: 'TIT2', value: 'Redial (Feat. LeafRunner and Nowacking)'}, "['ID3v2.4'].TIT2");
  assert.deepEqual(native[1], {id: 'TPE1', value: 'YourEnigma'}, "['ID3v2.4'].TIT2");
  assert.deepEqual(native[2], {id: 'TYER', value: '2014'}, "['ID3v2.4'].TYER");
});
