import { describe, assert, it } from "vitest";
import * as path from "node:path";

import * as mm from "../lib";

describe("Parser options", () => {
  const file_ape = path.join(__dirname, "samples", "monkeysaudio.ape");
  const file_flac = path.join(
    __dirname,
    "samples",
    "MusicBrainz - Beth Hart - Sinner's Prayer.flac"
  );
  const file_id3v22 = path.join(__dirname, "samples", "id3v2.2.mp3");
  const file_m4a = path.join(__dirname, "samples", "mp4", "id4.m4a");
  const file_ogg = path.join(
    __dirname,
    "samples",
    "Nirvana - In Bloom - 2-sec.ogg"
  );

  describe("option 'skipCovers'", () => {
    describe("'skipCovers' in APE format", () => {
      it("should include cover-art if option.skipCovers is not defined", async () => {
        const metadata = await mm.parseFile(file_ape);
        const native = mm.orderTags(metadata.native.APEv2);
        // Native
        assert.isDefined(
          native["Cover Art (Back)"],
          "APEv2.'Cover Art (Back)'"
        );
        assert.isDefined(
          native["Cover Art (Back)"],
          "APEv2.'Cover Art (Front)'"
        );
        // Common
        assert.isDefined(metadata.common.picture, "metadata.common.picture");
      });

      it("should not include cover-art if option.skipCovers=true", async () => {
        const metadata = await mm.parseFile(file_ape, { skipCovers: true });
        const native = mm.orderTags(metadata.native.APEv2);
        // Native
        assert.isUndefined(
          native["Cover Art (Back)"],
          "APEv2.'Cover Art (Back)'"
        );
        assert.isUndefined(
          native["Cover Art (Back)"],
          "APEv2.'Cover Art (Front)'"
        );
        // Common
        assert.isUndefined(metadata.common.picture, "metadata.common.picture");
      });

      it("should include cover-art if option.skipCovers=false", async () => {
        const metadata = await mm.parseFile(file_ape, { skipCovers: false });
        const native = mm.orderTags(metadata.native.APEv2);
        // Native
        assert.isDefined(
          native["Cover Art (Back)"],
          "APEv2.'Cover Art (Back)'"
        );
        assert.isDefined(
          native["Cover Art (Back)"],
          "APEv2.'Cover Art (Front)'"
        );
        // Common
        assert.isDefined(metadata.common.picture, "metadata.common.picture");
      });
    }); // should skipCovers in APE format

    describe("'skipCovers' in FLAC/Vorbis format", () => {
      it("should include cover-art if option.skipCovers is not defined", async () => {
        const metadata = await mm.parseFile(file_flac, { skipCovers: true });
        const vorbis = mm.orderTags(metadata.native.vorbis);
        // Native
        assert.isUndefined(
          vorbis.METADATA_BLOCK_PICTURE,
          "vorbis.METADATA_BLOCK_PICTURE"
        );
        // Common
        assert.isUndefined(metadata.common.picture, "metadata.common.picture");
      });

      it("should not include cover-art if option.skipCovers=true", async () => {
        const metadata = await mm.parseFile(file_flac, { skipCovers: true });
        const vorbis = mm.orderTags(metadata.native.vorbis);
        // Native
        assert.isUndefined(
          vorbis.METADATA_BLOCK_PICTURE,
          "vorbis.METADATA_BLOCK_PICTURE"
        );
        // Common
        assert.isUndefined(metadata.common.picture, "metadata.common.picture");
      });

      it("should include cover-art if option.skipCovers=false", async () => {
        const metadata = await mm.parseFile(file_flac, { skipCovers: false });
        const vorbis = mm.orderTags(metadata.native.vorbis);
        // Native
        assert.isDefined(
          vorbis.METADATA_BLOCK_PICTURE,
          "vorbis.METADATA_BLOCK_PICTURE"
        );
        // Common
        assert.isDefined(metadata.common.picture, "metadata.common.picture");
      });
    }); // should skipCovers in FLAC format

    describe("'skipCovers' in MP3/id3v2.2 format", () => {
      it("should include cover-art if option.skipCovers is not defined", async () => {
        const metadata = await mm.parseFile(file_id3v22);
        const id3 = mm.orderTags(metadata.native["ID3v2.2"]);
        // Native
        assert.isDefined(id3.PIC, "id3v1.PIC");
        // Common
        assert.isDefined(metadata.common.picture, "metadata.common.picture");
      });

      it("should not include cover-art if option.skipCovers=true", async () => {
        const metadata = await mm.parseFile(file_id3v22, { skipCovers: true });
        const id3 = mm.orderTags(metadata.native["ID3v2.2"]);
        // Native
        assert.isUndefined(id3.PIC, "id3v1.PIC");
        // Common
        assert.isUndefined(metadata.common.picture, "metadata.common.picture");
      });

      it("should include cover-art if option.skipCovers=false", async () => {
        const metadata = await mm.parseFile(file_id3v22, { skipCovers: false });
        const id3 = mm.orderTags(metadata.native["ID3v2.2"]);
        // Native
        assert.isDefined(id3.PIC, "id3v1.PIC");
        // Common
        assert.isDefined(metadata.common.picture, "metadata.common.picture");
      });
    }); // should skipCovers in MP3/id3v2.2 format
  });

  describe("'skipCovers' in M4A (id4) format", () => {
    it("should include cover-art if option.skipCovers is not defined", async () => {
      const metadata = await mm.parseFile(file_m4a);
      const iTunes = mm.orderTags(metadata.native.iTunes);
      // Native
      assert.isDefined(iTunes.covr, "iTunes.covr");
      // Common
      assert.isDefined(metadata.common.picture, "metadata.common.picture");
    });

    it("should not include cover-art if option.skipCovers=true", async () => {
      const metadata = await mm.parseFile(file_m4a, { skipCovers: true });
      const iTunes = mm.orderTags(metadata.native.iTunes);
      // Native
      assert.isUndefined(iTunes.covr, "m4a.covr");
      // Common
      assert.isUndefined(metadata.common.picture, "metadata.common.picture");
    });

    it("should include cover-art if option.skipCovers=false", async () => {
      const metadata = await mm.parseFile(file_m4a, { skipCovers: false });
      const iTunes = mm.orderTags(metadata.native.iTunes);
      // Native
      assert.isDefined(iTunes.aART, "m4a.covr");
      // Common
      assert.isDefined(metadata.common.picture, "metadata.common.picture");
    });
  }); // should skipCovers in M4A format

  describe("'skipCovers' in ogg format", () => {
    it("should include cover-art if option.skipCovers is not defined", async () => {
      const metadata = await mm.parseFile(file_ogg);
      const vorbis = mm.orderTags(metadata.native.vorbis);
      // Native
      assert.isDefined(
        vorbis.METADATA_BLOCK_PICTURE,
        "vorbis.METADATA_BLOCK_PICTURE"
      );
      // Common
      assert.isDefined(metadata.common.picture, "metadata.common.picture");
    });

    it("should not include cover-art if option.skipCovers=true", async () => {
      const metadata = await mm.parseFile(file_ogg, { skipCovers: true });
      const vorbis = mm.orderTags(metadata.native.vorbis);
      // Native
      assert.isUndefined(
        vorbis.METADATA_BLOCK_PICTURE,
        "vorbis.METADATA_BLOCK_PICTURE"
      );
      // Common
      assert.isUndefined(metadata.common.picture, "metadata.common.picture");
    });

    it("should include cover-art if option.skipCovers=false", async () => {
      const metadata = await mm.parseFile(file_ogg, { skipCovers: false });
      const vorbis = mm.orderTags(metadata.native.vorbis);
      // Native
      assert.isDefined(
        vorbis.METADATA_BLOCK_PICTURE,
        "vorbis.METADATA_BLOCK_PICTURE"
      );
      // Common
      assert.isDefined(metadata.common.picture, "metadata.common.picture");
    });
  }); // should skipCovers in M4A format
});
