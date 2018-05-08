import {assert} from 'chai';
import * as mm from '../src';
import * as path from 'path';
import * as fs from 'fs-extra';

const t = assert;

describe("Read MPEG-4 audio files with iTunes metadata", () => {

  describe("Parse MPEG-4 audio files", () => {

    const filePath = path.join(__dirname, 'samples', 'id4.m4a');

    function checkFormat(format) {
      assert.deepEqual(format.tagTypes, ['iTunes MP4'], 'format.tagTypes');
      t.strictEqual(format.duration, 2.2058956916099772, 'format.duration');
      assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
    }

    function checkCommon(common) {
      t.strictEqual(common.title, 'Voodoo People (Pendulum Remix)', 'title');
      t.strictEqual(common.artist, 'The Prodigy', 'artist');
      t.strictEqual(common.albumartist, 'Pendulum', 'albumartist');
      t.strictEqual(common.album, 'Voodoo People', 'album');
      t.strictEqual(common.year, 2005, 'year');
      t.strictEqual(common.track.no, 1, 'track no');
      t.strictEqual(common.track.of, 12, 'track of');
      t.strictEqual(common.disk.no, 1, 'disk no');
      t.strictEqual(common.disk.of, 1, 'disk of');
      t.strictEqual(common.genre[0], 'Electronic', 'genre');
      t.strictEqual(common.picture[0].format, 'jpg', 'picture 0 format');
      t.strictEqual(common.picture[0].data.length, 196450, 'picture 0 length');
      t.strictEqual(common.picture[1].format, 'jpg', 'picture 1 format');
      t.strictEqual(common.picture[1].data.length, 196450, 'picture 1 length');
    }

    function checkNativeTags(native) {

      t.ok(native, 'Native m4a tags should be present');

      t.deepEqual(native.trkn, ['1/12'], 'm4a.trkn');
      t.deepEqual(native.disk, ['1/1'], 'm4a.disk');
      t.deepEqual(native.tmpo, [0], 'm4a.tmpo');
      t.deepEqual(native.gnre, ['Electronic'], 'm4a.gnre');
      t.deepEqual(native.stik, [1], 'm4a.stik');
      t.deepEqual(native['©alb'], ['Voodoo People'], 'm4a.©alb');
      t.deepEqual(native.aART, ['Pendulum'], 'm4a.aART');
      t.deepEqual(native['©ART'], ['The Prodigy'], 'm4a.©ART');
      t.deepEqual(native['©cmt'], ['(Pendulum Remix)'], 'm4a.©cmt');
      t.deepEqual(native['©wrt'], ['Liam Howlett'], 'm4a.©wrt');
      t.deepEqual(native['----:com.apple.iTunes:iTunNORM'], [' 0000120A 00001299 00007365 0000712F 0002D88B 0002D88B 00007F2B 00007F2C 0003C770 0001F5C7'], 'm4a.----:com.apple.iTunes:iTunNORM');
      t.deepEqual(native['©nam'], ['Voodoo People (Pendulum Remix)'], 'm4a.©nam');
      t.deepEqual(native['©too'], ['Lavf52.36.0'], 'm4a.©too');
      t.deepEqual(native['©day'], ['2005'], 'm4a.@day');

      // Check album art
      t.isDefined(native.covr);
      t.strictEqual(native.covr[0].format, 'image/jpeg', 'm4a.covr.format');
      t.strictEqual(native.covr[0].data.length, 196450, 'm4a.covr.data.length');
    }

    it("should decode from a file", () => {

      return mm.parseFile(filePath, {native: true}).then(metadata => {

        const native = metadata.native['iTunes MP4'];
        t.ok(native, 'Native m4a tags should be present');

        checkFormat(metadata.format);
        checkCommon(metadata.common);
        checkNativeTags(mm.orderTags(native));
      });

    });

    it("should decode from a stream", () => {

      const stream = fs.createReadStream(filePath);

      return mm.parseStream(stream, 'audio/mp4', {native: true}).then(metadata => {
        checkFormat(metadata.format);
        checkCommon(metadata.common);
        checkNativeTags(mm.orderTags(metadata.native['iTunes MP4']));
      }).then(() => {
        stream.close();
      });

    });
  });

  it("should decode 8-byte unsigned integer", () => {

    // AAC
    const filename = path.join(__dirname, "samples", "01. Trumpsta (Djuro Remix).m4a");

    return mm.parseFile(filename, {native: true}).then(metadata => {

      t.isDefined(metadata.native["iTunes MP4"], "Native m4a tags should be present");
      t.deepEqual(metadata.format.duration, 2.066575963718821, "metadata.format.duration");
      const iTunes = mm.orderTags(metadata.native["iTunes MP4"]);
      t.deepEqual(iTunes.plID, [637567119], "iTunes.plID=637567119 (64-bit / 8-byte encoded uint");
      t.deepEqual(iTunes.cnID, [637567333], "iTunes.cnID (ITUNESCATALOGID) = 637567333");
    });

  });

  /**
   * Ref: https://github.com/Borewit/music-metadata/issues/74
   */
  it("should support metadata behind the 'mdat' atom", () => {

    const filePath = path.join(__dirname, "samples", "issue_74.m4a");

    return mm.parseFile(filePath, {duration: true, native: true}).then(metadata => {

      assert.isAtLeast(metadata.native['iTunes MP4'].length, 1);
      t.deepEqual(metadata.common.album, "Live at Tom's Bullpen in Dover, DE (2016-04-30)");
      t.deepEqual(metadata.common.albumartist, "They Say We're Sinking");
      t.deepEqual(metadata.common.comment, ["youtube rip\r\nSource: https://www.youtube.com/playlist?list=PLZ4QPxwBgg9TfsFVAArOBfuve_0e7zQaV"]);
    });
  });

  /**
   * Ref: https://github.com/Borewit/music-metadata/issues/79
   */
  it("should be able to extract the composer and artist", () => {

    const filePath = path.join(__dirname, "samples", "issue_79.m4a");

    return mm.parseFile(filePath, {duration: true, native: true}).then(metadata => {
      assert.strictEqual(metadata.common.title, "Uprising");
      assert.deepEqual(metadata.common.composer, ["Muse"]);
      assert.deepEqual(metadata.common.artists, ["Muse"]);
      assert.deepEqual(metadata.common.genre, ["Rock"]);
      assert.strictEqual(metadata.common.date, "2009");
      assert.strictEqual(metadata.common.encodedby, "iTunes 8.2.0.23, QuickTime 7.6.2");
      assert.deepEqual(metadata.common.disk, {no: 1, of: 1});
      assert.deepEqual(metadata.common.track, {no: 1, of: null});
    });
  });

});
