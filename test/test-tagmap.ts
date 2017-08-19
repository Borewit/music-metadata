import {} from "mocha";
import {assert} from 'chai';
import TagMap, {ITagInfoMap} from "../src/tagmap";

const t = assert;

it("tagmap", () => {

  const tagMap = new TagMap();

  const commonTags: ITagInfoMap = (TagMap as any).commonTags;
  t.isDefined(commonTags);

  // Check mappings
  t.doesNotThrow(() => {
    for (const type in (tagMap as any).mappings) {
      const typeMap = (tagMap as any).mappings[type];
      for (const tag in typeMap) {
        const commonType = typeMap[tag];
        t.isDefined(commonTags[commonType], 'Unknown common headerType in mapping ' + type + '.' + tag + ' => ' + commonType);
      }
    }
  });

  // common tags, singleton
  t.ok(TagMap.isSingleton('title'), 'common tag "title" is a singleton');
  t.ok(TagMap.isSingleton('artist'), 'common tag "artist" is a singleton');
  t.ok(!TagMap.isSingleton('artists'), 'common tag "artists" is not a singleton');

  // native tags, singleton
  t.ok(tagMap.isNativeSingleton('vorbis', 'TITLE'), 'Vorbis tag "TITLE" is a singleton');
  t.ok(!tagMap.isNativeSingleton('vorbis', 'METADATA_BLOCK_PICTURE'), 'Vorbis tag "METADATA_BLOCK_PICTURE" is not a singleton');

  t.ok(tagMap.isNativeSingleton('iTunes MP4',  '©nam'), 'iTunes MP4 tag "©nam" is a singleton');

});
