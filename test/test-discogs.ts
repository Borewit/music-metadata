import { describe, test, expect } from "vitest";
import { join } from "node:path";

import { orderTags, parseFile } from "../lib";
import { ID3v24TagMapper } from "../lib/id3v2/ID3v24TagMapper";
import { VorbisTagMapper } from "../lib/ogg/vorbis/VorbisTagMapper";
import { samplePath } from "./util";

const discogs_tags = [
  "DISCOGS_ARTIST_ID",
  "DISCOGS_ARTISTS",
  "DISCOGS_ARTIST_NAME",
  "DISCOGS_ALBUM_ARTISTS",
  "DISCOGS_CATALOG",
  "DISCOGS_COUNTRY",
  "DISCOGS_DATE",
  "DISCOGS_LABEL",
  "DISCOGS_LABEL_ID",
  "DISCOGS_MASTER_RELEASE_ID",
  "DISCOGS_RATING",
  "DISCOGS_RELEASED",
  "DISCOGS_RELEASE_ID",
  "DISCOGS_VOTES",
];

describe("Mapping definitions", () => {
  const id3v24Mapper = new ID3v24TagMapper();
  const vorbisMapper = new VorbisTagMapper();

  test.each(discogs_tags)("should map Discogs/ID3v2.3/ID3v2.4 tag: %s", (tag) => {
    // Each Discogs tag should be mapped
    const tagName = "TXXX:" + tag;
    expect(id3v24Mapper.tagMap).toHaveProperty(tagName);
  });

  test.each(discogs_tags)("should map Discog/Vorbis/FLAC tag: %s", (tag) => {
    // Each Discogs tag should be mapped
    expect(vorbisMapper.tagMap).toHaveProperty(tag);
  });
});

describe("Track mapping: Beth Hart - Sinner's Prayer", () => {
  test("ID3v2.3/ID3v2.4", async () => {
    const filename = "Discogs - Beth Hart - Sinner's Prayer [id3v2.3].mp3";
    const filePath = join(samplePath, filename);

    // Run with default options
    const metadata = await parseFile(filePath);

    expect(metadata.common, "should include common tags").toBeTruthy();
    expect(metadata.format.tagTypes).toStrictEqual(["ID3v2.3", "ID3v1"]);

    const id3v23 = orderTags(metadata.native["ID3v2.3"]);

    expect(metadata.format.duration, "format.duration").toBe(2.168_163_265_306_122_2);
    expect(metadata.format.sampleRate, "format.sampleRate").toBe(44_100);
    expect(metadata.format.bitrate, "format.bitrate").toBeCloseTo(156_000, -3);
    expect(metadata.format.numberOfChannels, "format.numberOfChannels").toBe(2);

    // Expect basic common tags
    expect(metadata.common.album, "common.album").toBe("Don't Explain");
    expect(metadata.common.artist, "common.artist").toBe("Beth Hart, Joe Bonamassa");

    // Check discogs, DISCOGS_RELEASE_ID
    expect(id3v23["TXXX:DISCOGS_RELEASE_ID"], "id3v23/TXXX:DISCOGS_RELEASE_ID").toStrictEqual(["4204665"]);
    expect(metadata.common.discogs_release_id, "id3v23/TXXX:DISCOGS_RELEASE_ID => common.discogs_release_id").toBe(
      4_204_665
    );

    // Check Discogs-tag: DISCOGS_ARTIST_ID
    expect(id3v23["TXXX:DISCOGS_ARTIST_ID"], "id3v23/TXXX:DISCOGS_ARTIST_ID").toStrictEqual(["389157", "900313"]);
    expect(
      metadata.common.discogs_artist_id,
      "id3v23/TXXX:DISCOGS_ARTIST_ID => common.discogs_release_id"
    ).toStrictEqual([389_157, 900_313]);

    // Check Discogs-tag: DISCOGS_ALBUM_ARTISTS
    expect(id3v23["TXXX:DISCOGS_ALBUM_ARTISTS"], "id3v23/TXXX:DISCOGS_ALBUM_ARTISTS").toStrictEqual([
      "Beth Hart",
      "Joe Bonamassa",
    ]);
    expect(metadata.common.artists, "id3v23/TXXX:DISCOGS_ALBUM_ARTISTS => common.discogs_release_id").toStrictEqual([
      "Beth Hart",
      "Joe Bonamassa",
    ]);

    // Check Discogs-tag: DISCOGS_VOTES
    expect(id3v23["TXXX:DISCOGS_VOTES"], "id3v23/TXXX:DISCOGS_VOTES").toStrictEqual(["9"]);
    expect(metadata.common.discogs_votes, "id3v23/TXXX:DISCOGS_VOTES => common.discogs_release_id").toStrictEqual(9);

    // Check Discogs-tag: STYLE
    expect(id3v23["TXXX:STYLE"], "id3v23/TXXX:STYLE").toStrictEqual(["Blues Rock"]);
    expect(metadata.common.genre, "id3v23/TXXX:STYLE => common.genre").toStrictEqual(["Rock;Blues", "Blues Rock"]);
    expect(id3v23.TCON, `id3v23/TCON`).toStrictEqual(["Rock;Blues"]); // ToDo: why different in Vorbis

    // Check discogs, CATALOGID mapping
    expect(id3v23["TXXX:CATALOGID"], "id3v23/TXXX:CATALOGID").toStrictEqual(["PRAR931391"]);
    expect(metadata.common.catalognumber, "id3v23/TXXX:CATALOGID => common.catalognumber").toStrictEqual([
      "PRAR931391",
    ]);
  });

  test("Vorbis/FLAC", async () => {
    const filename = "Discogs - Beth Hart - Sinner's Prayer [APEv2].flac";
    const filePath = join(samplePath, filename);

    // Run with default options
    const metadata = await parseFile(filePath);

    expect(metadata.common, "should include common tags").toBeTruthy();
    expect(metadata.format.tagTypes).toStrictEqual(["vorbis"]);

    expect(metadata.format.duration, "format.duration").toBe(2.122_993_197_278_911_6);
    expect(metadata.format.sampleRate, "format.sampleRate").toBe(44_100);
    expect(metadata.format.bitsPerSample, "format.bitsPerSample").toBe(16);
    expect(metadata.format.numberOfChannels, "format.numberOfChannels").toBe(2);

    const vorbis = orderTags(metadata.native.vorbis);

    // Expect basic common tags
    expect(metadata.common.album, "common.album").toBe("Don't Explain");
    expect(metadata.common.artist, "common.artist").toBe("Beth Hart, Joe Bonamassa");

    // Check discogs, DISCOGS_RELEASE_ID
    expect(vorbis.DISCOGS_RELEASE_ID, "vorbis/DISCOGS_RELEASE_ID").toStrictEqual(["4204665"]);
    expect(metadata.common.discogs_release_id, "vorbis/DISCOGS_RELEASE_ID => common.discogs_release_id").toBe(
      4_204_665
    );

    // Check Discogs-tag: DISCOGS_ARTIST_ID
    expect(vorbis.DISCOGS_ARTIST_ID, "vorbis/DISCOGS_ARTIST_ID").toStrictEqual(["389157", "900313"]);
    expect(metadata.common.discogs_artist_id, "vorbis/DISCOGS_ARTIST_ID => common.discogs_release_id").toStrictEqual([
      389_157, 900_313,
    ]);

    // Check Discogs-tag: DISCOGS_ALBUM_ARTISTS
    expect(vorbis.DISCOGS_ALBUM_ARTISTS, "vorbis/DISCOGS_ALBUM_ARTISTS").toStrictEqual(["Beth Hart", "Joe Bonamassa"]);
    expect(metadata.common.artists, "vorbis/DISCOGS_ALBUM_ARTISTS => common.discogs_release_id").toStrictEqual([
      "Beth Hart",
      "Joe Bonamassa",
    ]);

    // Check Discogs-tag: DISCOGS_VOTES
    expect(vorbis.DISCOGS_VOTES, "vorbis/DISCOGS_VOTES").toStrictEqual(["9"]);
    expect(metadata.common.discogs_votes, "vorbis/DISCOGS_VOTES => common.discogs_release_id").toStrictEqual(9);

    // Check Discogs-tag: STYLE
    expect(vorbis.STYLE, "vorbis/STYLE").toStrictEqual(["Blues Rock"]);
    expect(metadata.common.genre, `vorbis/STYLE => common.genre`).toStrictEqual(["Rock", "Blues", "Blues Rock"]);
    expect(vorbis.GENRE, `vorbis/GENRE`).toStrictEqual(["Rock", "Blues"]);
    expect(vorbis.STYLE, `vorbis/STYLE`).toStrictEqual(["Blues Rock"]);
  });
});

describe("Track mapping: Yasmin Levy - Mi Korasón.flac'", () => {
  test("Vorbis/FLAC tags", async () => {
    const filename = "Discogs - Yasmin Levy - Mi Korasón.flac";
    const metadata = await parseFile(join(samplePath, filename));

    expect(metadata.common, "should include common tags").toBeTruthy();
    expect(metadata.format.tagTypes).toStrictEqual(["vorbis"]);

    const native = orderTags(metadata.native.vorbis);

    // Each Discogs tag should be mapped
    for (const tag of Object.keys(native).filter((t) => t.includes("DISCOGS_"))) {
      expect(discogs_tags.includes(tag), `Discog/Vorbis tag: ${tag}`).toBe(true);
    }

    // Make sure we parse the correct song
    expect(metadata.common.album, "common.album").toBe("Sentir");
    expect(metadata.common.artist, "common.artist").toBe("Yasmin Levy");

    // Check Discogs-tag: DISCOGS_RELEASE_ID
    expect(native.DISCOGS_RELEASE_ID, "vorbis/DISCOGS_RELEASE_ID").toStrictEqual(["3520814"]);
    expect(metadata.common.discogs_release_id, "vorbis/DISCOGS_RELEASE_ID => common.discogs_release_id").toBe(
      3_520_814
    );

    // Check Discogs-tag: DISCOGS_MASTER_RELEASE_ID
    expect(native.DISCOGS_MASTER_RELEASE_ID, "vorbis/DISCOGS_MASTER_RELEASE_ID").toStrictEqual(["461710"]);
    expect(
      metadata.common.discogs_master_release_id,
      "vorbis/DISCOGS_MASTER_RELEASE_ID => common.discogs_master_release_id"
    ).toBe(461_710);

    // Check Discogs-tag: DISCOGS_ARTIST_ID
    expect(native.DISCOGS_ARTIST_ID, "vorbis/DISCOGS_ARTIST_ID").toStrictEqual(["467650"]);
    expect(metadata.common.discogs_artist_id, "vorbis/DISCOGS_ARTIST_ID => common.discogs_artist_id").toStrictEqual([
      467_650,
    ]);

    // Check Discogs-tag: DISCOGS_ARTIST_NAME ToDo: test multiple artists
    expect(native.DISCOGS_ARTIST_NAME, "vorbis/DISCOGS_ARTIST_NAME").toStrictEqual(["Yasmin Levy"]);
    expect(metadata.common.artists, "vorbis/DISCOGS_ARTIST_NAME => common.artists").toStrictEqual(["Yasmin Levy"]); // ToDo? remove duplicates

    // Check Discogs-tag: DISCOGS_DATE
    expect(native.DISCOGS_DATE, "vorbis/DISCOGS_DATE").toStrictEqual(["2009"]);
    expect(metadata.common.originaldate, "vorbis/DISCOGS_DATE => common.originaldate").not.toBe("2009"); // Why is not "2009"

    // Check Discogs: DISCOGS_CATALOG
    expect(native.DISCOGS_CATALOG, "vorbis/DISCOGS_CATALOG").toStrictEqual(["450010"]);
    expect(metadata.common.catalognumber, "vorbis/DISCOGS_CATALOG => common.catalognumber").toStrictEqual(["450010"]);
  });
});
