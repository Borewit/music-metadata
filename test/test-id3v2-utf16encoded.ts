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

it('decodes id3v2 UTF-16BE ($02) text frames', async () => {
  // ID3v2.4 tag with a TIT2 frame using text-encoding $02 (UTF-16BE, no BOM).
  const syncsafe = (n: number) =>
    Uint8Array.from([(n >>> 21) & 0x7f, (n >>> 14) & 0x7f, (n >>> 7) & 0x7f, n & 0x7f]);
  const text = Uint8Array.from([0x00, 0x54, 0x00, 0xEB, 0x00, 0x73, 0x00, 0x74]); // 'T\u00ebst' in UTF-16BE
  const body = Uint8Array.from([0x02, ...text]);
  const frame = Uint8Array.from([0x54, 0x49, 0x54, 0x32, ...syncsafe(body.length), 0x00, 0x00, ...body]);
  const header = Uint8Array.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, ...syncsafe(frame.length)]);
  const mpeg = new Uint8Array(417);
  mpeg.set([0xFF, 0xFB, 0x90, 0x00], 0);
  const buf = Buffer.concat([Buffer.from(header), Buffer.from(frame), Buffer.from(mpeg)]);

  const { common } = await mm.parseBuffer(buf, { mimeType: 'audio/mpeg' });
  assert.strictEqual(common.title, 'T\u00ebst', 'UTF-16BE title decoded without byte swapping');
});
