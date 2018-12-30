import {assert} from 'chai';
import * as mm from '../src';
import * as path from 'path';

const t = assert;

describe("Parser options", () => {

  const file_ape = path.join(__dirname, 'samples', 'monkeysaudio.ape');
  const file_flac = path.join(__dirname, 'samples', "MusicBrainz - Beth Hart - Sinner's Prayer.flac");
  const file_id3v22 = path.join(__dirname, 'samples', 'id3v2.2.mp3');
  const file_m4a = path.join(__dirname, 'samples', 'mp4', 'id4.m4a');
  const file_ogg = path.join(__dirname, 'samples', 'Nirvana - In Bloom - 2-sec.ogg');

  describe("option 'native'", () => {

    it("should not include native tags, if option.native is not defined", () => {
      return mm.parseFile(file_ape).then(result => {
        t.isUndefined(result.native, 'native tags should not be defined');
      });
    });

    it("should not include native tags, if option.native=false", () => {
      return mm.parseFile(file_ape, {native: false}).then(result => {
        t.isUndefined(result.native, 'native tags should not be defined');
      });
    });

    it("should include native tags, if option.native=true", () => {
      return mm.parseFile(file_ape, {native: true}).then(result => {
        t.isDefined(result.native, 'native tags should be defined');
      });
    });
  });

  describe("option 'skipCovers'", () => {

    describe("'skipCovers' in APE format", () => {

      it("should include cover-art if option.skipCovers is not defined", () => {
        return mm.parseFile(file_ape, {native: true}).then(result => {
          const native = mm.orderTags(result.native.APEv2);
          // Native
          t.isDefined(native['Cover Art (Back)'], "APEv2.'Cover Art (Back)'");
          t.isDefined(native['Cover Art (Back)'], "APEv2.'Cover Art (Front)'");
          // Common
          t.isDefined(result.common.picture, "result.common.picture");
        });
      });

      it("should not include cover-art if option.skipCovers=true", () => {
        return mm.parseFile(file_ape, {native: true, skipCovers: true}).then(result => {
          const native = mm.orderTags(result.native.APEv2);
          // Native
          t.isUndefined(native['Cover Art (Back)'], "APEv2.'Cover Art (Back)'");
          t.isUndefined(native['Cover Art (Back)'], "APEv2.'Cover Art (Front)'");
          // Common
          t.isUndefined(result.common.picture, "result.common.picture");
        });
      });

      it("should not include cover-art if option.skipCovers=true", () => {
        return mm.parseFile(file_ape, {native: true}).then(result => {
          const native = mm.orderTags(result.native.APEv2);
          // Native
          t.isDefined(native['Cover Art (Back)'], "APEv2.'Cover Art (Back)'");
          t.isDefined(native['Cover Art (Back)'], "APEv2.'Cover Art (Front)'");
          // Common
          t.isDefined(result.common.picture, "result.common.picture");
        });
      });

    }); // should skipCovers in APE format

    describe("'skipCovers' in FLAC/Vorbis format", () => {

      it("should include cover-art if option.skipCovers is not defined", () => {
        return mm.parseFile(file_flac, {native: true}).then(result => {
          const vorbis = mm.orderTags(result.native.vorbis);
          // Native
          t.isDefined(vorbis.METADATA_BLOCK_PICTURE, "vorbis.METADATA_BLOCK_PICTURE");
          // Common
          t.isDefined(result.common.picture, "result.common.picture");
        });
      });

      it("should not include cover-art if option.skipCovers=true", () => {
        return mm.parseFile(file_flac, {native: true, skipCovers: true}).then(result => {
          const vorbis = mm.orderTags(result.native.vorbis);
          // Native
          t.isUndefined(vorbis.METADATA_BLOCK_PICTURE, "vorbis.METADATA_BLOCK_PICTURE");
          // Common
          t.isUndefined(result.common.picture, "result.common.picture");
        });
      });

      it("should include cover-art if option.skipCovers=false", () => {
        return mm.parseFile(file_flac, {native: true, skipCovers: false}).then(result => {
          const vorbis = mm.orderTags(result.native.vorbis);
          // Native
          t.isDefined(vorbis.METADATA_BLOCK_PICTURE, "vorbis.METADATA_BLOCK_PICTURE");
          // Common
          t.isDefined(result.common.picture, "result.common.picture");
        });
      });

    }); // should skipCovers in FLAC format

    describe("'skipCovers' in MP3/id3v2.2 format", () => {

      it("should include cover-art if option.skipCovers is not defined", () => {
        return mm.parseFile(file_id3v22, {native: true}).then(result => {
          const id3 = mm.orderTags(result.native['ID3v2.2']);
          // Native
          t.isDefined(id3.PIC, "id3v1.PIC");
          // Common
          t.isDefined(result.common.picture, "result.common.picture");
        });
      });

      it("should not include cover-art if option.skipCovers=true", () => {
        return mm.parseFile(file_id3v22, {native: true, skipCovers: true}).then(result => {
          const id3 = mm.orderTags(result.native['ID3v2.2']);
          // Native
          t.isUndefined(id3.PIC, "id3v1.PIC");
          // Common
          t.isUndefined(result.common.picture, "result.common.picture");
        });
      });

      it("should include cover-art if option.skipCovers=false", () => {
        return mm.parseFile(file_id3v22, {native: true, skipCovers: false}).then(result => {
          const id3 = mm.orderTags(result.native['ID3v2.2']);
          // Native
          t.isDefined(id3.PIC, "id3v1.PIC");
          // Common
          t.isDefined(result.common.picture, "result.common.picture");
        });
      });

    }); // should skipCovers in MP3/id3v2.2 format

  });

  describe("'skipCovers' in M4A (id4) format", () => {

    it("should include cover-art if option.skipCovers is not defined", async () => {
      const result = await mm.parseFile(file_m4a, {native: true});
      const iTunes = mm.orderTags(result.native.iTunes);
      // Native
      t.isDefined(iTunes.covr, "iTunes.covr");
      // Common
      t.isDefined(result.common.picture, "result.common.picture");
    });

    it("should not include cover-art if option.skipCovers=true", async () => {
      const result = await mm.parseFile(file_m4a, {native: true, skipCovers: true});
      const iTunes = mm.orderTags(result.native.iTunes);
      // Native
      t.isUndefined(iTunes.covr, "m4a.covr");
      // Common
      t.isUndefined(result.common.picture, "result.common.picture");
    });

    it("should include cover-art if option.skipCovers=false", async () => {
      const result = await mm.parseFile(file_m4a, {native: true, skipCovers: false});
      const iTunes = mm.orderTags(result.native.iTunes);
      // Native
      t.isDefined(iTunes.aART, "m4a.covr");
      // Common
      t.isDefined(result.common.picture, "result.common.picture");
    });

  }); // should skipCovers in M4A format

  describe("'skipCovers' in ogg format", () => {

    it("should include cover-art if option.skipCovers is not defined", async () => {
      const result = await mm.parseFile(file_ogg, {native: true});
      const vorbis = mm.orderTags(result.native.vorbis);
      // Native
      t.isDefined(vorbis.METADATA_BLOCK_PICTURE, "vorbis.METADATA_BLOCK_PICTURE");
      // Common
      t.isDefined(result.common.picture, "result.common.picture");
    });

    it("should not include cover-art if option.skipCovers=true", async () => {
      const result = await mm.parseFile(file_ogg, {native: true, skipCovers: true});
      const vorbis = mm.orderTags(result.native.vorbis);
      // Native
      t.isUndefined(vorbis.METADATA_BLOCK_PICTURE, "vorbis.METADATA_BLOCK_PICTURE");
      // Common
      t.isUndefined(result.common.picture, "result.common.picture");
    });

    it("should include cover-art if option.skipCovers=false", async () => {
      const result = await mm.parseFile(file_ogg, {native: true, skipCovers: false});
      const vorbis = mm.orderTags(result.native.vorbis);
      // Native
      t.isDefined(vorbis.METADATA_BLOCK_PICTURE, "vorbis.METADATA_BLOCK_PICTURE");
      // Common
      t.isDefined(result.common.picture, "result.common.picture");
    });

  }); // should skipCovers in M4A format

});
