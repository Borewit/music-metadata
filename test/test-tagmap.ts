import {} from "mocha"
import {assert} from 'chai';
import through = require("through");

const path = require('path');

const t = assert;

const TagMap = require('../src/tagmap').default;

it("tagmap", () => {

  // Check mappings
  t.doesNotThrow(() => {
    for (const type in TagMap.mappings) {
      const typeMap = TagMap.mappings[type];
      for (const tag in typeMap) {
        const commonType = typeMap[tag];
        if (!TagMap.common.hasOwnProperty(commonType)) {
          throw 'Unknown common headerType in mapping ' + type + '.' + tag + ' => ' + commonType
        }
      }
    }
  });

  // common tags, singleton
  t.ok(TagMap.isSingleton('title'), 'common tag "title" is a singleton');
  t.ok(TagMap.isSingleton('artist'), 'common tag "artist" is a singleton');
  t.ok(!TagMap.isSingleton('artists'), 'common tag "artists" is not a singleton');

  const tagMap = new TagMap;

  // native tags, singleton
  t.ok(tagMap.isNativeSingleton('vorbis', 'TITLE'), 'Vorbis tag "TITLE" is a singleton');
  t.ok(!tagMap.isNativeSingleton('vorbis', ' METADATA_BLOCK_PICTURE'), 'Vorbis tag " METADATA_BLOCK_PICTURE" is not a singleton');

});
