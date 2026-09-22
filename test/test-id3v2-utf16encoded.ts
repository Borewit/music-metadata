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

// Issue: https://github.com/Borewit/music-metadata/issues/2736
// This fixture contains a single ID3v2.4 tag followed by 44.1 kHz stereo MP3
// silence. The comments cover $01 with/without BOM and $02, including both
// empty and non-empty descriptions and terminated/unterminated comment text.
it('decodes id3v2 UTF-16 text and COMM frames from a single MP3 fixture', async () => {
  const filePath = path.join(samplePath, 'issue-2736-utf16.mp3');
  const { native, common, format } = await mm.parseFile(filePath, {duration: true});

  const comments = [
    // $01: bare empty-description terminator, then LE BOM and text.
    {language: 'eng', descriptor: '', text: 'Hello'},
    // $01: LE BOM before both description and text.
    {language: 'eng', descriptor: 'Dësc with BOM', text: 'Tëst'},
    // $01: neither description nor text has a BOM.
    {language: 'eng', descriptor: 'Dësc without BOM', text: 'Tëst'},
    // $02: big-endian description and text without BOMs.
    {language: 'eng', descriptor: 'Dësc big-endian', text: 'Tëst'},
    // $01: BE BOM before the empty description and unterminated text.
    {language: 'deu', descriptor: '', text: 'Tëst'}
  ];
  assert.deepEqual(native['ID3v2.4'], [
    {id: 'TIT2', value: 'Tëst'}, // $02 text frame
    {id: 'TPE1', value: 'Example Artist'},
    ...comments.map(value => ({id: 'COMM', value}))
  ], 'native ID3v2.4 tags');
  assert.strictEqual(common.title, 'Tëst');
  assert.strictEqual(common.artist, 'Example Artist');
  assert.deepEqual(common.comment, comments);
  assert.strictEqual(format.codec, 'MPEG 1 Layer 3');
  assert.strictEqual(format.sampleRate, 44100);
  assert.strictEqual(format.numberOfChannels, 2);
  assert.isAbove(format.duration, 0);
});
