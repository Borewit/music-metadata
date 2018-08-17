import {assert} from 'chai';
import * as mm from '../src';

import * as path from 'path';

const t = assert;

it("decode id3v2-utf16", () => {

  const filename = 'id3v2-utf16.mp3';
  const filePath = path.join(__dirname, 'samples', filename);

  return mm.parseFile(filePath, {duration: true, native: true}).then(result => {

    t.strictEqual(result.common.title, 'Redial (Feat. LeafRunner and Nowacking)', 'title');
    t.strictEqual(result.common.artist, 'YourEnigma', 'artist 0');
    t.strictEqual(result.common.year, 2014, 'year');
    t.strictEqual(result.common.picture[0].format, 'image/jpeg', 'picture 0 format');
    t.strictEqual(result.common.picture[0].data.length, 214219, 'picture 0 length');
    t.deepEqual(result.common.picture[0].data.slice(0, 2), Buffer.from([0xFF, 0xD8]), 'picture 0 JFIF magic header');

    const native = result.native['ID3v2.3'];
    t.ok(native, 'Native id3v2.3 tags should be present');

    t.deepEqual(native[0], {id: 'TIT2', value: 'Redial (Feat. LeafRunner and Nowacking)'}, "['ID3v2.4'].TIT2");
    t.deepEqual(native[1], {id: 'TPE1', value: 'YourEnigma'}, "['ID3v2.4'].TIT2");
    t.deepEqual(native[2], {id: 'TYER', value: '2014'}, "['ID3v2.4'].TYER");
  });

});
