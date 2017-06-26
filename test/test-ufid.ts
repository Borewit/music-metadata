import {} from "mocha"
import {assert} from 'chai';
import through = require("through");
import * as mm from '../src';

const path = require('path');

const t = assert;

it("id3v2.4", () => {

  const filename = '29 - Dominator.mp3';
  const filePath = path.join(__dirname, 'samples', filename);

  function mapNativeTags(nativeTags: any[]): {[tag:string] : any[]} {
    const tags:{[tag:string] : any[]} = {};
    nativeTags.forEach( (tag) => {
      (tags[tag.id] = (tags[tag.id] || [])).push(tag.value);
    });
    return tags;
  }

  return mm.parseFile(filePath).then( (result) => {
    const nativeTags = mapNativeTags(result.native["id3v2.3"]);

    t.equal(nativeTags.UFID.length, 1);

    t.deepEqual(nativeTags.UFID[0], {
      'owner_identifier': 'http://musicbrainz.org',
      'identifier': new Buffer([0x33, 0x66, 0x32, 0x33, 0x66, 0x32, 0x63, 0x66, 0x2d,
        0x32, 0x61, 0x34, 0x36, 0x2d, 0x34, 0x38, 0x65, 0x63, 0x2d, 0x38, 0x36, 0x33,
        0x65, 0x2d, 0x36, 0x65, 0x63, 0x34, 0x33, 0x31, 0x62, 0x35, 0x66, 0x65, 0x63,
        0x61])
    }, 'UFID');
  });
});
