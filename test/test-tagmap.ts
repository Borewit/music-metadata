import {} from "mocha";
import {assert} from "chai";
import TagMap, {ITagInfoMap} from "../src/tagmap";

const t = assert;

describe("TagMap", () => {

  const tagMap = new TagMap();

  it("Check if each native tag, is mapped to a valid common type", () => {

    const commonTags: ITagInfoMap = (TagMap as any).commonTags;
    t.isDefined(commonTags);

    // for each tag type
    for (const nativeType in (tagMap as any).mappings) {
      const typeMap = (tagMap as any).mappings[nativeType];
      for (const nativeTag in typeMap) {
        const commonType = typeMap[nativeTag];
        t.isDefined(commonTags[commonType], "Unknown common tagTypes in mapping " + nativeType + "." + nativeTag + " => " + commonType);
      }
    }
  });

  it("should be able to distinct singletons", () => {

    // common tags, singleton
    t.ok(TagMap.isSingleton("title"), "common tag \"title\" is a singleton");
    t.ok(TagMap.isSingleton("artist"), "common tag \"artist\" is a singleton");
    t.ok(!TagMap.isSingleton("artists"), "common tag \"artists\" is not a singleton");

    // native tags, singleton
    t.ok(tagMap.isNativeSingleton("vorbis", "TITLE"), "Vorbis tag \"TITLE\" is a singleton");
    t.ok(!tagMap.isNativeSingleton("vorbis", "METADATA_BLOCK_PICTURE"), "Vorbis tag \"METADATA_BLOCK_PICTURE\" is not a singleton");

    t.ok(tagMap.isNativeSingleton("iTunes MP4", "©nam"), "iTunes MP4 tag \"©nam\" is a singleton");

  });

});
