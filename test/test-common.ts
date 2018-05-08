import {assert} from "chai";

import {CommonTagMapper} from "../src/common/GenericTagMapper";
import {commonTags, isSingleton} from "../lib/common/GenericTagTypes";
import {CombinedTagMapper} from "../src/index";

const t = assert;

describe("CommonTagMapper.parseGenre", () => {

  it("should be able to parse genres", () => {
    const tests = {
      Electronic: "Electronic",
      "Electronic/Rock": "Electronic/Rock",
      "(0)": "Blues",
      "(0)(1)(2)": "Blues/Classic Rock/Country",
      "(0)(160)(2)": "Blues/Electroclash/Country",
      "(0)(192)(2)": "Blues/Country",
      "(0)(255)(2)": "Blues/Country",
      "(4)Eurodisco": "Disco/Eurodisco",
      "(4)Eurodisco(0)Mopey": "Disco/Eurodisco/Blues/Mopey",
      "(RX)(CR)": "RX/CR",
      "1stuff": "1stuff",
      "RX/CR": "RX/CR"
    };
    for (const test in tests) {
      t.strictEqual(CommonTagMapper.parseGenre(test), tests[test], test);
    }
  });
});

describe("GenericTagMap", () => {

  const combinedTagMapper = new CombinedTagMapper();

  it("Check if each native tag, is mapped to a valid common type", () => {

    t.isDefined(commonTags);

    // for each tag type
    for (const nativeType in combinedTagMapper.tagMappers) {
      const tagMapper = combinedTagMapper.tagMappers[nativeType];
      for (const nativeTag in tagMapper.tagMap) {
        const commonType = tagMapper.tagMap[nativeTag];
        t.isDefined(commonTags[commonType], "Unknown common tagTypes in mapping " + nativeType + "." + nativeTag + " => " + commonType);
      }
    }
  });

  it("should be able to distinct singletons", () => {

    // common tags, singleton
    t.ok(isSingleton("title"), "common tag \"title\" is a singleton");
    t.ok(isSingleton("artist"), "common tag \"artist\" is a singleton");
    t.ok(!isSingleton("artists"), "common tag \"artists\" is not a singleton");
  });

  describe("Vorbis generic mapper", () => {
    const vorbisGenericMapper = combinedTagMapper.tagMappers.vorbis;
    t.isDefined(vorbisGenericMapper);

    t.ok(vorbisGenericMapper.isNativeSingleton("TITLE"), "Vorbis tag \"TITLE\" is a singleton");
    t.ok(!vorbisGenericMapper.isNativeSingleton("METADATA_BLOCK_PICTURE"), "Vorbis tag \"METADATA_BLOCK_PICTURE\" is not a singleton");
  });

  describe("iTunes MP4", () => {
    const itunesGenericMapper = combinedTagMapper.tagMappers["iTunes MP4"];
    t.ok(itunesGenericMapper.isNativeSingleton("©nam"), "iTunes MP4 tag \"©nam\" is a singleton");
  });

});
