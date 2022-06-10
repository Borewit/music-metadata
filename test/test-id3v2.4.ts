import { assert } from "chai";
import * as mm from "../lib";

import * as path from "path";
import { samplePath } from "./util";

const t = assert;

describe("Decode MP3/ID3v2.4", () => {
  it("should decode id3v2.4", () => {
    const filename = "id3v2.4.mp3";
    const filePath = path.join(samplePath, filename);

    return mm.parseFile(filePath, { duration: true }).then((metadata) => {
      t.deepEqual(
        metadata.format.tagTypes,
        ["ID3v2.4", "ID3v1"],
        "format.tagTypes"
      );
      t.strictEqual(
        metadata.format.duration,
        0.7836734693877551,
        "format.format.duration"
      );
      t.strictEqual(
        metadata.format.sampleRate,
        44100,
        "format.sampleRate = 44.1 kHz"
      );
      t.strictEqual(
        metadata.format.bitrate,
        128000,
        "format.bitrate = 128 kbit/sec"
      );
      t.strictEqual(
        metadata.format.codecProfile,
        "CBR",
        "format.codecProfile = CBR"
      );
      t.strictEqual(metadata.format.container, "MPEG", "format.container");
      t.strictEqual(metadata.format.codec, "MPEG 1 Layer 3", "format.codec");
      t.strictEqual(metadata.format.tool, "LAME 3.98r", "format.tool");
      t.strictEqual(
        metadata.format.numberOfChannels,
        2,
        "format.numberOfChannels = 2"
      );

      t.strictEqual(metadata.common.title, "Home", "title");
      t.strictEqual(metadata.common.artist, "Explo", "common.artist");
      t.deepEqual(
        metadata.common.artists,
        ["Explo", "ions", "nodejsftws"],
        "common.artists"
      );
      t.strictEqual(metadata.common.albumartist, "Soundtrack", "albumartist");
      t.strictEqual(
        metadata.common.album,
        "Friday Night Lights [Original Movie Soundtrack]",
        "album"
      );
      t.strictEqual(metadata.common.year, 2004, "year");
      t.deepEqual(metadata.common.track, { no: 5, of: null }, "common.track");
      t.deepEqual(metadata.common.disk, { no: 1, of: 1 }, "common.disk");
      t.deepEqual(
        metadata.common.genre,
        ["Soundtrack", "OST"],
        "common.genres"
      );
      t.strictEqual(
        metadata.common.picture[0].format,
        "image/jpeg",
        "common.picture 0 format"
      );
      t.strictEqual(
        metadata.common.picture[0].data.length,
        80938,
        "common.picture 0 length"
      );
      t.strictEqual(
        metadata.common.picture[1].format,
        "image/jpeg",
        "common.picture 1 format"
      );
      t.strictEqual(
        metadata.common.picture[1].data.length,
        80938,
        "common.picture 1 length"
      );
    });
  });

  // Issue: https://github.com/Borewit/music-metadata/issues/502
  it("COMM mapping", async () => {
    const filePath = path.join(samplePath, "mp3", "issue-502.mp3");
    const { common } = await mm.parseFile(filePath);
    t.deepEqual(common.comment, ["CLEAN"], "common.comment");
  });

  it("should respect skipCovers-flag", () => {
    const filename = "id3v2.4.mp3";
    const filePath = path.join(samplePath, filename);

    return mm
      .parseFile(filePath, { duration: true, skipCovers: true })
      .then((result) => {
        t.isUndefined(
          result.common.picture,
          "common.picture should be undefined"
        );
      });
  });

  it("Map TXXX:ISRC", async () => {
    const filename = "issue-802.mp3";
    const filePath = path.join(samplePath, "mp3", filename);

    const { common, native } = await mm.parseFile(filePath);
    const id3v24 = native["ID3v2.4"];
    t.isDefined(id3v24, "ID3v2.4 presence");
    t.strictEqual(
      id3v24.filter((tag) => {
        return tag.id === "TSRC";
      }).length,
      0,
      "ID3v2.4 tag TSRC not defined"
    );
    t.strictEqual(
      id3v24.filter((tag) => {
        return tag.id === "TXXX:ISRC";
      }).length,
      1,
      "ID3v2.4 tag TXXX:ISRC to be defined"
    );
    t.includeDeepMembers(common.isrc, ["DEAE61300058"], "ISRC");
  });
});
