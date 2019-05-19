import {assert} from "chai";
import * as mm from "../src";

import * as fs from "fs";
import * as path from "path";
import {SourceStream} from "./util";
import {ID3v24TagMapper} from "../src/id3v2/ID3v24TagMapper";
import {Parsers} from './metadata-parsers';
import {IFormat, INativeTagDict} from '../src/type';

const t = assert;

describe("Parse MPEG", () => {

  it("should parse MPEG-1 Audio Layer II ", () => {
    /**
     * No errors found in file.
     *
     * ---------------------------
     * MPEG-length:	      8359
     * Sample-rate:	     44100
     * frame_size:	       418
     * Samples per frame	1152
     *
     * Summary:
     * ===============
     * Total number of frames: 20, unpadded: 1, padded: 19
     * File is CBR. Bitrate of each frame is 128 kbps.
     * Exact length: 00:00
     *
     * FooBar: 22559 samples
     * Audacity: 23040 samples (assumed to be correct)
     *
     * Using CBR calculation: 23392.29375; same as Mutagen
     */
    const filePath = path.join(__dirname, "samples", "1971 - 003 - Sweet - Co-Co - CannaPower.mp2");

    return mm.parseFile(filePath, {duration: true, native: true}).then(metadata => {

      t.deepEqual(metadata.format.tagTypes, ["ID3v2.3", "ID3v1"], "Tags: ID3v1 & ID3v2.3");
      t.strictEqual(metadata.format.container, "MPEG", "format.container = MPEG");
      t.strictEqual(metadata.format.codec, "mp2", "format.codec = mp2 (MPEG-2 Audio Layer II)");
      t.strictEqual(metadata.format.bitrate, 128000, "format.bitrate = 128 kbit/sec");
      t.strictEqual(metadata.format.sampleRate, 44100, "format.sampleRate = 44.1 kHz");
      t.strictEqual(metadata.format.numberOfSamples, 23040, "format.numberOfSamples = 23040");
      t.strictEqual(metadata.format.duration, 0.5224489795918368, "duration [seconds]"); // validated 2017-04-09
    });
  });

  describe("MPEG frame sync efficiency", () => {

    const emptyStreamSize = 5 * 1024 * 1024;
    const buf = Buffer.alloc(emptyStreamSize).fill(0);

    it("should sync efficient from a stream", function() {

      this.timeout(10000); // It takes a log time to parse, due to sync errors and assumption it is VBR (which is caused by the funny 224 kbps frame)

      const streamReader = new SourceStream(buf);

      return mm.parseStream(streamReader, "audio/mpeg", {duration: true, native: true});
    });

    it("should sync efficient, from a file", function() {

      this.timeout(10000); // It takes a log time to parse, due to sync errors and assumption it is VBR (which is caused by the funny 224 kbps frame)

      const tmpFilePath = path.join(__dirname, "samples", "zeroes.mp3");

      fs.writeFileSync(tmpFilePath, buf);
      return mm.parseFile(tmpFilePath, {duration: true, native: true}).then(() => {
        fs.unlinkSync(tmpFilePath);
      });
    });

  });

  describe("mpeg parsing fails for irrelevant attributes #14", () => {

    // tslint:disable:only-arrow-functions
    it("should decode 04 - You Don't Know.mp3", function() {

      /**
       * File has id3v2.3 & id3v1 tags
       * First frame is 224 kbps, rest 320 kbps
       * After id3v2.3, lots of 0 padding
       */
      this.timeout(15000); // It takes a long time to parse, due to sync errors and assumption it is VBR (which is caused by the funny 224 kbps frame)

      const filePath = path.join(__dirname, "samples", "04 - You Don't Know.mp3");

      function checkFormat(format) {
        t.deepEqual(format.tagTypes, ["ID3v2.3", "ID3v1"], "format.tagTypes");
        t.strictEqual(format.sampleRate, 44100, "format.sampleRate = 44.1 kHz");
        t.strictEqual(format.numberOfSamples, 9098496, "format.numberOfSamples"); // FooBar says 3:26.329 seconds (9.099.119 samples)
        t.approximately(format.duration, 206.3, 1 / 10, "format.duration"); // FooBar says 3:26.329 seconds (9.099.119 samples)
        t.strictEqual(format.bitrate, 320000, "format.bitrate = 128 kbit/sec");
        t.strictEqual(format.numberOfChannels, 2, "format.numberOfChannels 2 (stereo)");

        // t.strictEqual(format.codec, 'LAME3.91', 'format.codec');
        // t.strictEqual(format.codecProfile, 'CBR', 'format.codecProfile');
      }

      function checkCommon(common) {
        t.strictEqual(common.title, "You Don't Know", "common.title");
        t.deepEqual(common.artists, ["Reel Big Fish"], "common.artists");
        t.strictEqual(common.albumartist, "Reel Big Fish", "common.albumartist");
        t.strictEqual(common.album, "Why Do They Rock So Hard?", "common.album");
        t.strictEqual(common.year, 1998, "common.year");
        t.strictEqual(common.track.no, 4, "common.track.no");
        t.strictEqual(common.track.of, null, "common.track.of");
        t.strictEqual(common.disk.no, null, "common.disk.no");
        t.strictEqual(common.disk.of, null, "common.disk.of");
        t.deepEqual(common.genre, ["Ska-Punk"], "common.genre");
        t.deepEqual(common.comment, ["Jive"], "common.genre");
      }

      function checkID3v1(id3v1: INativeTagDict) {

        t.deepEqual(id3v1.artist, ["Reel Big Fish"], "id3v1.artist");
        t.deepEqual(id3v1.title, ["You Don't Know"], "id3v1.title");
        t.deepEqual(id3v1.album, ["Why Do They Rock So Hard?"], "id3v1.album");
        t.deepEqual(id3v1.year, ["1998"], "(id3v1.year");
        t.deepEqual(id3v1.track, [4], "id3v1.track");
        t.deepEqual(id3v1.comment, ["000010DF 00000B5A 00007784"], "id3v1.comment");
      }

      function checkID3v23(id3v23: INativeTagDict) {

        t.deepEqual(id3v23.TPE2, ["Reel Big Fish"], "native: TPE2");
        t.deepEqual(id3v23.TIT2, ["You Don't Know"], "native: TIT2");
        t.deepEqual(id3v23.TALB, ["Why Do They Rock So Hard?"], "native: TALB");
        t.deepEqual(id3v23.TPE1, ["Reel Big Fish"], "native: TPE1");
        t.deepEqual(id3v23.TCON, ["Ska-Punk"], "native: TCON");
        t.deepEqual(id3v23.TYER, ["1998"], "native: TYER");
        t.deepEqual(id3v23.TCOM, ["CA"], "native: TCOM"); // ToDo: common property?
        t.deepEqual(id3v23.TRCK, ["04"], "native: TRCK");
        t.deepEqual(id3v23.COMM, [{description: "", language: "eng", text: "Jive"}], "native: COMM");
      }

      return mm.parseFile(filePath, {duration: true, native: true}).then(result => {

        checkFormat(result.format);
        checkCommon(result.common);
        checkID3v23(mm.orderTags(result.native["ID3v2.3"]));
        checkID3v1(mm.orderTags(result.native.ID3v1));
      });

    });

    it("should decode 07 - I'm Cool.mp3", function() {
      // 'LAME3.91' found on position 81BCF=531407

      const filePath = path.join(__dirname, "samples", "07 - I'm Cool.mp3");

      this.timeout(15000); // It takes a long time to parse

      function checkFormat(format) {
        t.deepEqual(format.tagTypes, ["ID3v2.3", "ID3v1"], "format.type");
        t.strictEqual(format.sampleRate, 44100, "format.sampleRate = 44.1 kHz");
        // t.strictEqual(format.numberOfSamples, 8040655, 'format.numberOfSamples'); // FooBar says 8.040.655 samples
        t.approximately(format.duration, 200.9, 1 / 10, "format.duration"); // FooBar says 3:26.329 seconds
        t.strictEqual(format.bitrate, 320000, "format.bitrate = 128 kbit/sec");
        t.strictEqual(format.numberOfChannels, 2, "format.numberOfChannels 2 (stereo)");
        // t.strictEqual(format.codec, 'LAME3.98r', 'format.codec'); // 'LAME3.91' found on position 81BCF=531407// 'LAME3.91' found on position 81BCF=531407
        // t.strictEqual(format.codecProfile, 'CBR', 'format.codecProfile');
      }

      function checkCommon(common) {
        t.strictEqual(common.title, "I'm Cool", "common.title");
        t.deepEqual(common.artists, ["Reel Big Fish"], "common.artists");
        t.strictEqual(common.albumartist, "Reel Big Fish", "common.albumartist");
        t.strictEqual(common.album, "Why Do They Rock So Hard?", "common.album");
        t.strictEqual(common.year, 1998, "common.year");
        t.strictEqual(common.track.no, 7, "common.track.no");
        t.strictEqual(common.track.of, null, "common.track.of");
        t.strictEqual(common.disk.no, null, "common.disk.no");
        t.strictEqual(common.disk.of, null, "common.disk.of");
        t.deepEqual(common.genre, ["Ska-Punk"], "common.genre");
        t.deepEqual(common.comment, ["Jive"], "common.genre");
      }

      function checkID3v23(native: INativeTagDict) {
        t.deepEqual(native.TPE2, ["Reel Big Fish"], "native: TPE2");
        t.deepEqual(native.TIT2, ["I'm Cool"], "native: TIT2");
        t.deepEqual(native.TALB, ["Why Do They Rock So Hard?"], "native: TALB");
        t.deepEqual(native.TPE1, ["Reel Big Fish"], "native: TPE1");
        t.deepEqual(native.TCON, ["Ska-Punk"], "native: TCON");
        t.deepEqual(native.TYER, ["1998"], "native: TYER");
        t.deepEqual(native.TCOM, ["CA"], "native: TCOM");
        t.deepEqual(native.TRCK, ["07"], "native: TRCK");
        t.deepEqual(native.COMM, [{description: "", language: "eng", text: "Jive"}], "native: COMM");
      }

      return mm.parseFile(filePath, {duration: true, native: true}).then(result => {

        checkFormat(result.format);
        checkCommon(result.common);
        checkID3v23(mm.orderTags(result.native["ID3v2.3"]));
      });
    });
  });

  /**
   * Related to issue #38
   */
  describe("Handle corrupt MPEG-frames", () => {

    it("should handle corrupt frame causing negative frame data left", () => {

      /*------------[outofbounds.mp3]-------------------------------------------
       Frame 2 header expected at byte 2465, but found at byte 3343.
       Frame 1 (bytes 2048-3343) was 1295 bytes long (expected 417 bytes).

       Frame 17 header expected at byte 19017, but found at byte 19019.
       Frame 16 (bytes 17972-19019) was 1047 bytes long (expected 1045 bytes).

       Frame 18 header expected at byte 20064, but found at byte 21107.
       Frame 17 (bytes 19019-21107) was 2088 bytes long (expected 1045 bytes).

       Summary:
       ===============
       Total number of frames: 19, unpadded: 3, padded: 16
       File is VBR. Average bitrate is 309 kbps.
       Exact length: 00:00
       ------------------------------------------------------------------------*/
      const filePath = path.join(__dirname, "samples", "outofbounds.mp3");

      function checkFormat(format) {
        t.deepEqual(format.tagTypes, ["ID3v2.3", "ID3v1"], "format.type");
        t.strictEqual(format.sampleRate, 44100, "format.sampleRate = 44.1 kHz");
        t.strictEqual(format.bitrate, 320000, "format.bitrate = 128 kbit/sec");
        t.strictEqual(format.numberOfChannels, 2, "format.numberOfChannels 2 (stereo)");
      }

      return mm.parseFile(filePath, {duration: true}).then(metadata => {
        checkFormat(metadata.format);
      });
    });

  });

  const issueDir = path.join(__dirname, "samples");

  /**
   * Related to issue #39
   */
  describe("Multiple ID3 tags: ID3v2.3, ID3v2.4 & ID3v1", () => {

    function checkFormat(format: IFormat, expectedDuration) {
      t.deepEqual(format.tagTypes, ["ID3v2.3", "ID3v2.4", "ID3v1"], "format.tagTypes");
      t.strictEqual(format.duration, expectedDuration, "format.duration");
      t.deepEqual(format.container, 'MPEG', 'format.container');
      t.deepEqual(format.codec, 'mp3', 'format.codec');
      t.strictEqual(format.lossless, false, "format.lossless");
      t.strictEqual(format.sampleRate, 44100, "format.sampleRate = 44.1 kHz");
      t.strictEqual(format.bitrate, 320000, "format.bitrate = 160 kbit/sec");
      t.strictEqual(format.numberOfChannels, 2, "format.numberOfChannels 2 (stereo)");
    }

    it("should parse multiple tag headers: ID3v2.3, ID3v2.4 & ID3v1", () => {

      return mm.parseFile(path.join(issueDir, "id3-multi-02.mp3")).then(metadata => {
        checkFormat(metadata.format, 230.29551020408164);
      });
    });

    /**
     *  Test on multiple headers: ID3v1, ID3v2.3, ID3v2.4 & ID3v2.4 ( 2x ID3v2.4 !! )
     */
    it("should decode mp3_01 with 2x ID3v2.4 header",  () => {

      // ToDo: currently second ID3v2.4 is overwritten. Either make both headers accessible or generate warning
      return mm.parseFile(path.join(issueDir, "id3-multi-01.mp3")).then(metadata => {
        checkFormat(metadata.format, 0.1306122448979592);
      });
    });

  });

  /**
   * Test decoding popularimeter
   */
  describe("POPM decoding", () => {

    it("check mapping function", () => {

      assert.deepEqual(ID3v24TagMapper.toRating({email: 'user1@bla.com', rating: 0}), {source: 'user1@bla.com', rating: undefined}, 'unknown rating');
      assert.deepEqual(ID3v24TagMapper.toRating({email: 'user1@bla.com', rating: 1}), {source: 'user1@bla.com', rating: 0 / 255}, 'lowest rating');
      assert.deepEqual(ID3v24TagMapper.toRating({email: 'user1@bla.com', rating: 255}), {source: 'user1@bla.com', rating: 1}, 'highest rating');
    });

    it("from 'Yeahs-It's Blitz!.mp3'", () => {

      return mm.parseFile(path.join(issueDir, "02-Yeahs-It's Blitz! 2.mp3"), {duration: false, native: true}).then(metadata => {
        const idv23 = mm.orderTags(metadata.native['ID3v2.3']);
        assert.deepEqual(idv23.POPM[0], {email: "no@email", rating: 128, counter: 0}, "ID3v2.3 POPM");
        assert.approximately(metadata.common.rating[0].rating, 0.5, 1 / (2 * 254), "Common rating");
      });
    });

    it("from 'id3v2-lyrics.mp3'", () => {

      return mm.parseFile(path.join(issueDir, "id3v2-lyrics.mp3"), {duration: false, native: true}).then(metadata => {
        const idv23 = mm.orderTags(metadata.native['ID3v2.3']);
        // Native rating value
        assert.deepEqual(idv23.POPM[0], {email: "MusicBee", rating: 255, counter: 0}, "ID3v2.3 POPM");
        // Common rating value
        assert.approximately(metadata.common.rating[0].rating, 1, 0, "Common rating");
      });
    });

    it("decode POPM without a counter field", () => {

      const filePath = path.join(issueDir, "issue-100.mp3");

      return mm.parseFile(filePath, {duration: true, native: true}).then(metadata => {
        const idv23 = mm.orderTags(metadata.native['ID3v2.3']);
        assert.deepEqual(idv23.POPM[0], {
          counter: undefined,
          email: "Windows Media Player 9 Series",
          rating: 255
        }, "ID3v2.3 POPM");
      });
    });

  });

  describe("Calculate / read duration", () => {

    describe("VBR read from Xing header", () => {

      const filePath = path.join(issueDir, 'id3v2-xheader.mp3');

      Parsers
        .forEach(parser => {
          it(parser.description, () => {
          return parser.initParser(filePath, 'audio/mpeg', {duration: false, native: true}).then(metadata => {
            assert.strictEqual(metadata.format.duration, 0.4963265306122449);
          });
        });
      });

    });

    it("VBR: based on frame count if duration flag is set", () => {

      const filePath = path.join(issueDir, "Dethklok-mergeTagHeaders.mp3");

      const stream = fs.createReadStream(filePath);
      stream.path = undefined; // disable file size based calculation

      return mm.parseStream(stream, 'audio/mpeg', {duration: true, native: true}).then(metadata => {
        stream.close();
        assert.approximately(metadata.format.duration, 34.69, 1 / 100);
      });

    });

  });

});
