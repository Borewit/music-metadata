import {assert} from "chai";

import {CommonTagMapper} from "../src/common/GenericTagMapper";
import {commonTags, isSingleton} from "../src/common/GenericTagTypes";
import * as path from "path";
import * as mm from "../src";
import {CombinedTagMapper} from "../src/common/CombinedTagMapper";
import {joinArtists} from '../src/common/MetadataCollector';
import { ParserFactory, parseHttpContentType } from '../src/ParserFactory';

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

  describe("common.artist / common.artists mapping", () => {

    it("should be able to join artists", () => {
      t.equal(joinArtists(["David Bowie"]), "David Bowie");
      t.equal(joinArtists(["David Bowie", "Stevie Ray Vaughan"]), "David Bowie & Stevie Ray Vaughan");
      t.equal(joinArtists(["David Bowie", "Queen", "Mick Ronson"]), "David Bowie, Queen & Mick Ronson");
    });

    it("parse RIFF tags", () => {

      const filePath = path.join(__dirname, "samples", "issue-89 no-artist.aiff");

      return mm.parseFile(filePath, {duration: true, native: true}).then(metadata => {
        t.deepEqual(metadata.common.artists, ["Beth Hart", "Joe Bonamassa"], "common.artists directly via WM/ARTISTS");
        t.strictEqual(metadata.common.artist, "Beth Hart & Joe Bonamassa", "common.artist derived from common.artists");
      });
    });
  });
});

describe("Convert rating", () => {

  it("should convert rating to stars", () => {

    assert.equal(mm.ratingToStars(undefined), 0);
    assert.equal(mm.ratingToStars(0), 1);
    assert.equal(mm.ratingToStars(0.1), 1);
    assert.equal(mm.ratingToStars(0.2), 2);
    assert.equal(mm.ratingToStars(0.5), 3);
    assert.equal(mm.ratingToStars(0.75), 4);
    assert.equal(mm.ratingToStars(1), 5);

  });

});

describe("MimeType", () => {

  it('should be able to decode basic MIME-types', () => {
    const mime = parseHttpContentType('audio/mpeg');
    assert.equal(mime.type, 'audio');
    assert.equal(mime.subtype, 'mpeg');
  });

  it('should be able to decode MIME-type parameters', () => {
    {
      const mime = parseHttpContentType('message/external-body; access-type=URL');
      assert.equal(mime.type, 'message');
      assert.equal(mime.subtype, 'external-body');
      assert.deepEqual(mime.parameters, {'access-type': 'URL'});
    }

    {
      const mime = parseHttpContentType('Text/HTML;Charset="utf-8"');
      assert.equal(mime.type, 'text');
      assert.equal(mime.subtype, 'html');
      assert.deepEqual(mime.parameters, {charset: 'utf-8'});
    }
  });

  it('should be able to decode MIME-type suffix', () => {
    const mime = parseHttpContentType('application/xhtml+xml');
    assert.equal(mime.type, 'application');
    assert.equal(mime.subtype, 'xhtml');
    assert.equal(mime.suffix, 'xml');
  });

});
