import {assert} from 'chai';
import * as path from 'path';
import {ID3v2Parser} from "../src/id3v2/ID3v2Parser";
import * as strtok from "strtok3";
import {MetadataCollector} from "../src/common/MetadataCollector";
import * as mm from '../src';

const t = assert;

const samplePath = path.join(__dirname, 'samples');

describe("Extract metadata from ID3v2.3 header", () => {

  it("should parse a raw ID3v2.3 header", () => {

    const filePath = path.join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer.id3v23");

    const metadata = new MetadataCollector({});

    return strtok.fromFile(filePath).then(tokenizer => {
      return new ID3v2Parser().parse(metadata, tokenizer, {}).then(() => {

        t.strictEqual(33, metadata.native['ID3v2.3'].length);

        const id3v23 = mm.orderTags(metadata.native['ID3v2.3']);
        t.isDefined(id3v23.UFID, "check if ID3v2.3-UFID is set");
      });
    });
  });

  it("parse a ID3v2.3", () => {

    const filePath = path.join(samplePath, 'id3v2.3.mp3');

    function checkFormat(format) {
      t.deepEqual(format.tagTypes, ['ID3v2.3', 'ID3v1'], 'format.type');
      t.strictEqual(format.duration, 0.7836734693877551, 'format.duration'); // FooBar says 0.732 seconds (32.727 samples)
      t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
      t.strictEqual(format.bitrate, 128000, 'format.bitrate = 128 kbit/sec');
      t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
      t.strictEqual(format.container, 'MPEG', 'format.container');
      t.strictEqual(format.codec, 'MP3', 'format.codec');
      t.strictEqual(format.tool, 'LAME3.98r', 'format.tool');
      t.strictEqual(format.codecProfile, 'CBR', 'format.codecProfile');
    }

    function checkCommon(common) {
      t.strictEqual(common.title, 'Home', 'common.title');
      t.deepEqual(common.artists, ['Explosions In The Sky', 'Another', 'And Another'], 'common.artists');
      t.strictEqual(common.albumartist, 'Soundtrack', 'common.albumartist');
      t.strictEqual(common.album, 'Friday Night Lights [Original Movie Soundtrack]', 'common.album');
      t.strictEqual(common.year, 2004, 'common.year');
      t.strictEqual(common.track.no, 5, 'common.track.no');
      t.strictEqual(common.track.of, null, 'common.track.of');
      t.strictEqual(common.disk.no, 1, 'common.disk.no');
      t.strictEqual(common.disk.of, 1, 'common.disk.of');
      t.strictEqual(common.genre[0], 'Soundtrack', 'common.genre');
      t.strictEqual(common.picture[0].format, 'image/jpeg', 'common.picture format');
      t.strictEqual(common.picture[0].data.length, 80938, 'common.picture length');
    }

    function checkID3v1(id3v11: mm.INativeTagDict) {

      t.deepEqual(id3v11.title, ['Home'], 'id3v11.title');
      t.deepEqual(id3v11.album, ['Friday Night Lights [Original'], 'id3v11.album');
      t.deepEqual(id3v11.artist, ['Explosions In The Sky/Another/'], 'id3v11.artist');
      t.deepEqual(id3v11.genre, ['Soundtrack'], 'id3v11.genre');
      t.deepEqual(id3v11.track, [5], 'id3v11.track');
      t.deepEqual(id3v11.year, ['2004'], 'id3v11.year');
    }

    function checkID3v23(id3v23: mm.INativeTagDict) {

      t.deepEqual(id3v23.TALB, ['Friday Night Lights [Original Movie Soundtrack]'], 'native: TALB');
      t.deepEqual(id3v23.TPE1, ['Explosions In The Sky', 'Another', 'And Another'], 'native: TPE1');
      t.deepEqual(id3v23.TPE2, ['Soundtrack'], 'native: TPE2');
      t.deepEqual(id3v23.TCOM, ['Explosions in the Sky'], 'native: TCOM');
      t.deepEqual(id3v23.TPOS, ['1/1'], 'native: TPOS');
      t.deepEqual(id3v23.TCON, ['Soundtrack'], 'native: TCON');
      t.deepEqual(id3v23.TIT2, ['Home'], 'native: TIT2');
      t.deepEqual(id3v23.TRCK, ['5'], 'native: TRCK');
      t.deepEqual(id3v23.TYER, ['2004'], 'native: TYER');
      t.deepEqual(id3v23['TXXX:PERFORMER'], ['Explosions In The Sky'], 'native: TXXX:PERFORMER');

      const apic = id3v23.APIC[0];
      t.strictEqual(apic.format, 'image/jpeg', 'raw APIC format');
      t.strictEqual(apic.type, 'Cover (front)', 'raw APIC tagTypes');
      t.strictEqual(apic.description, '', 'raw APIC description');
      t.strictEqual(apic.data.length, 80938, 'raw APIC length');
    }

    return mm.parseFile(filePath, {duration: true, native: true}).then(result => {
      checkFormat(result.format);
      checkCommon(result.common);
      checkID3v1(mm.orderTags(result.native.ID3v1));
      checkID3v23(mm.orderTags(result.native['ID3v2.3']));
    });

  });

  describe("corrupt header / tags", () => {

    it("should decode corrupt ID3v2.3 header: 'Strawberry'", () => {

      /**
       * Kept 25 frames from original MP3; concatenated copied last 128 bytes to restore ID3v1.0 header
       */
      const filePath = path.join(samplePath, '04-Strawberry.mp3');

      function checkFormat(format: mm.IFormat) {
        t.strictEqual(format.duration, 247.84979591836733, 'format.duration');
        t.deepEqual(format.tagTypes, ['ID3v2.3'], 'format.tagTypes');
        t.strictEqual(format.container, 'MPEG', 'format.container');
        t.strictEqual(format.codec, 'MP3', 'format.codec');
        t.strictEqual(format.lossless, false, 'format.lossless');
        t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        t.strictEqual(format.bitrate, 128000, 'format.bitrate = 128 bit/sec');
        t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
      }

      function checkCommon(common: mm.ICommonTagsResult) {
        t.strictEqual(common.title, 'Strawberry', 'common.title');
        t.strictEqual(common.artist, 'Union Youth', "common.artist");
        t.strictEqual(common.album, "The Royal Gene", "common.album");
        t.strictEqual(common.albumartist, undefined, "common.albumartist");
        t.strictEqual(common.year, 2002, 'common.year');
        t.deepEqual(common.track, {no: 4, of: null}, 'common.track = 4/?');
        t.strictEqual(common.track.of, null, 'common.track.of = null');
        t.deepEqual(common.genre, ["Alternative"], "common.genre");
        t.isUndefined(common.comment, "common.comment");
      }

      return mm.parseFile(filePath).then(result => {
        checkFormat(result.format);
        checkCommon(result.common);
      });

    });

    it("should decode PeakValue without data", () => {

      const filePath = path.join(samplePath, 'issue_56.mp3');

      return mm.parseFile(filePath, {duration: true, native: true}).then(metadata => {
        t.deepEqual(metadata.format.tagTypes, ['ID3v2.3', 'ID3v1'], 'format.tagTypes'); // ToDo: has hale APEv2 tag header
      });
    });

  });

  /**
   * id3v2.4 defines that multiple T* values are separated by 0x00
   * id3v2.3 defines that multiple T* values are separated by /
   * Related issue: https://github.com/Borewit/music-metadata/issues/52
   * Specification: http://id3.org/id3v2.3.0#line-290
   */
  describe("slash delimited fields", () => {

    it("Slash in track title", () => {
      const filePath = path.join(samplePath, "Their - They're - Therapy - 1sec.mp3");

      return mm.parseFile(filePath, {native: true}).then(result => {
        t.isDefined(result.native['ID3v2.3'], 'Expect ID3v2.3 tag');
        const id3v23 = mm.orderTags(result.native['ID3v2.3']);
        // It should not split the id3v23.TIT2 tag (containing '/')
        t.deepEqual(id3v23.TIT2, ["Their / They're / Therapy"], 'id3v23.TIT2');
        // The artist name is actually "Their / They're / There"
        // Specification: http://id3.org/id3v2.3.0#line-455
        t.deepEqual(id3v23.TPE1, ["Their", "They're", "There"], 'id3v23.TPE1');
      });
    });

  });

  describe("Decode frames", () => {

    // http://id3.org/id3v2.3.0#URL_link_frames_-_details
    it("4.3.1 WCOM: Commercial information", () => {
      return mm.parseFile(path.join(samplePath, 'id3v2-lyrics.mp3'), {native: true}).then(metadata => {
        const id3v23 = mm.orderTags(metadata.native['ID3v2.3']);
        // tslint:disable:max-line-length
        t.deepEqual(id3v23.WCOM[0], "http://www.amazon.com/Rotation-Cute-What-We-Aim/dp/B0018QCXAU%3FSubscriptionId%3D0R6CGKPJ3EKNPQBPYJR2%26tag%3Dsoftpointer-20%26linkCode%3Dxm2%26camp%3D2025%26creative%3D165953%26creativeASIN%3DB0018QCXAU ");
      });
    });

    // http://id3.org/id3v2.3.0#User_defined_URL_link_frame
    it("4.3.2 WXXX: User defined URL link frame", () => {
      return mm.parseFile(path.join(samplePath, 'bug-unkown encoding.mp3'), {native: true}).then(metadata => {
        const id3v23 = mm.orderTags(metadata.native['ID3v2.3']);
        t.deepEqual(id3v23.WXXX[0], {
          description: "Tempa at bleep",
          url: "http://www"
        });
      });
    });

    // http://id3.org/id3v2.3.0#Music_CD_identifier
    it("4.5 MCDI: Music CD identifier", () => {

      return mm.parseFile(path.join(samplePath, '04-Strawberry.mp3'), {native: true}).then(metadata => {
        const id3v23 = mm.orderTags(metadata.native['ID3v2.3']);
        t.equal(id3v23.MCDI[0].length, 804, 'TOC');
      });
    });

  });

});
