import {assert} from 'chai';
import * as mm from '../src';
import * as path from 'path';
import {Parsers} from './metadata-parsers';

const t = assert;

describe("Parse MPEG-4 files with iTunes metadata", () => {

  const samples = path.join(__dirname, "samples");

  describe("Parse MPEG-4 files (.m4a)", () => {

    function checkFormat(format) {
      assert.deepEqual(format.tagTypes, ['iTunes'], 'format.tagTypes');
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
      t.strictEqual(common.picture[0].format, 'image/jpeg', 'picture 0 format');
      t.strictEqual(common.picture[0].data.length, 196450, 'picture 0 length');
      t.strictEqual(common.picture[1].format, 'image/jpeg', 'picture 1 format');
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

    Parsers.forEach(parser => {
      it(parser.description, () => {

        const filePath = path.join(__dirname, 'samples', 'id4.m4a');

        return parser.initParser(filePath, 'audio/mp4', {native: true}).then(metadata => {
          const native = metadata.native.iTunes;
          t.ok(native, 'Native m4a tags should be present');

          checkFormat(metadata.format);
          checkCommon(metadata.common);
          checkNativeTags(mm.orderTags(native));
        });
      });
    });

  });

  /**
   * Ref: https://github.com/Borewit/music-metadata/issues/74
   */
  describe("should decode 8-byte unsigned integer", () => {

    Parsers.forEach(parser => {
      it(parser.description, () => {

        const filePath = path.join(samples, "issue_74.m4a");

        return parser.initParser(filePath, 'audio/mp4', {native: true}).then(metadata => {
          const native = metadata.native.iTunes;
          t.ok(native, 'Native m4a tags should be present');

          assert.isAtLeast(metadata.native.iTunes.length, 1);
          t.deepEqual(metadata.common.album, "Live at Tom's Bullpen in Dover, DE (2016-04-30)");
          t.deepEqual(metadata.common.albumartist, "They Say We're Sinking");
          t.deepEqual(metadata.common.comment, ["youtube rip\r\nSource: https://www.youtube.com/playlist?list=PLZ4QPxwBgg9TfsFVAArOBfuve_0e7zQaV"]);
        });
      });
    });
  });

  /**
   * Ref: https://github.com/Borewit/music-metadata/issues/79
   */
  describe("should be able to extract the composer and artist", () => {

    Parsers.forEach(parser => {
      it(parser.description, () => {

        const filePath = path.join(samples, "issue_79.m4a");

        return parser.initParser(filePath, 'audio/mp4', {duration: true, native: true}).then(metadata => {
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
  });

  describe("Parse MPEG-4 Audio Book files (.m4b)", () => {

    describe("audio book from issue #120", () => {

      Parsers.forEach(parser => {
        it(parser.description, () => {

          const filePath = path.join(samples, 'issue-120.m4b');

          return parser.initParser(filePath, 'audio/mp4', {duration: true, native: true}).then(metadata => {
            assert.strictEqual(metadata.common.title, 'The Land: Predators: A LitRPG Saga: Chaos Seeds, Book 7 (Unabridged)');
            assert.deepEqual(metadata.common.composer, ['Nick Podehl']);
            assert.deepEqual(metadata.common.artists, ['Aleron Kong']);
            assert.deepEqual(metadata.common.genre, ['Audiobook']);
            assert.strictEqual(metadata.common.year, 2018);
            assert.strictEqual(metadata.common.encodedby, 'inAudible 1.97');
            assert.deepEqual(metadata.common.disk, {no: null, of: null});
            assert.deepEqual(metadata.common.track, {no: null, of: null});
            assert.deepEqual(metadata.common.comment, ['Welcome to the long-awaited seventh novel of the best-selling saga by Aleron Kong, the longest and best book ever recorded by Nick Podehl!']);
          });
        });
      });
    });

    describe("audio book from issue issue #127", () => {

      Parsers.forEach(parser => {
        it(parser.description, () => {

          const filePath = path.join(samples, 'issue-127.m4b');

          return parser.initParser(filePath, 'audio/mp4', {duration: true, native: true}).then(metadata => {
            assert.strictEqual(metadata.common.title, 'GloriesIreland00-12_librivox');
            assert.deepEqual(metadata.common.artists, ['Joseph Dunn']);
            assert.deepEqual(metadata.common.genre, ['Audiobook']);
            assert.strictEqual(metadata.common.encodedby, 'Chapter and Verse V 1.5');
            assert.deepEqual(metadata.common.disk, {no: null, of: null});
            assert.deepEqual(metadata.common.track, {no: 1, of: null});
            assert.deepEqual(metadata.common.comment, ['https://archive.org/details/glories_of_ireland_1801_librivox']);

            const iTunes = mm.orderTags(metadata.native.iTunes);
            assert.deepEqual(iTunes.stik, [2], 'iTunes.stik = 2 = Audiobook'); // Ref: http://www.zoyinc.com/?p=1004
          });
        });
      });
    });

    describe("should support extended atom header", () => {

      Parsers.forEach(parser => {
        it(parser.description, () => {

          const filePath = path.join(samples, 'issue-133.m4a');

          return parser.initParser(filePath, 'audio/mp4', {duration: true, native: true}).then(metadata => {
            assert.deepEqual(metadata.format.dataformat, 'MPEG-4');
          });
        });
      });
    });

  });

});
