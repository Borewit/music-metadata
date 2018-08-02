import {} from "mocha";
import {assert} from 'chai';
import * as mm from '../src';
import * as path from 'path';

const t = assert;

/**
 * Ensure the mapping of native comment field to the common comment field is done correctly
 * Ref: https://github.com/Borewit/music-metadata/issues/50
 */
describe("Mapping of common comment tag", () => {

  const samples = path.join(__dirname, 'samples');

  describe("Vorbis", () => {

    it("FLAC/Vorbis", () => {

      const filePath = path.join(samples, "MusicBrainz - Beth Hart - Sinner's Prayer.flac");

      // Parse flac/Vorbis file
      return mm.parseFile(filePath, {native: true}).then(metadata => {
        t.deepEqual(metadata.common.comment, ["Test 123"]);
      });
    });

    it("should map ogg/Vorbis", () => {

      const filePath = path.join(samples, "MusicBrainz - Beth Hart - Sinner's Prayer.ogg");

      // Parse ogg/Vorbis file
      return mm.parseFile(filePath, {native: true}).then(metadata => {
        t.deepEqual(metadata.common.comment, ["Test 123"]);
      });
    });
  });

  describe("APEv2 header", () => {

    it("Monkey's Audio / APEv2", () => {

      const filePath = path.join(samples, "MusicBrainz - Beth Hart - Sinner's Prayer.ape");

      // Run with default options
      return mm.parseFile(filePath, {native: true}).then(metadata => {
        t.deepEqual(metadata.common.comment, ["Test 123"]);
      });
    });

    it("WavPack / APEv2", () => {

      const filePath = path.join(samples, "MusicBrainz - Beth Hart - Sinner's Prayer.wv");

      // Run with default options
      return mm.parseFile(filePath, {native: true}).then(metadata => {
        t.deepEqual(metadata.common.comment, ["Test 123"]);
      });
    });
  });

  describe("ID3v2.3 header", () => {

    it("MP3 / ID3v2.3", () => {

      const filePath = path.join(samples, "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.3].V2.mp3");

      // Run with default options
      return mm.parseFile(filePath, {native: true}).then(metadata => {
        t.deepEqual(metadata.common.comment, ["Test 123"]);
      });
    });

    it("RIFF/WAVE/PCM / ID3v2.3", () => {

      const filePath = path.join(samples, "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.3].wav");

      return mm.parseFile(filePath, {native: true}).then(metadata => {
        t.deepEqual(metadata.common.comment, ["Test 123"]);
      });
    });
  });

  describe("ID3v2.4 header", () => {

    it("MP3/ID3v2.4 header", () => {

      const filename = "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.4].V2.mp3";
      const filePath = path.join(__dirname, 'samples', filename);

      function checkFormat(format: mm.IFormat) {
        t.deepEqual(format.tagTypes, ['ID3v2.4'], 'format.tagTypes');
        t.strictEqual(format.dataformat, 'mp3', 'format.dataformat = mp3');
        t.strictEqual(format.duration, 2.1681632653061222, 'format.duration');
        t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        // t.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample');
        t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
        t.strictEqual(format.codecProfile, 'V2', 'format.codecProfile = V2');
        t.strictEqual(format.encoder, 'LAME3.99r', 'format.encoder = LAME3.99r');
      }

      // Run with default options
      return mm.parseFile(filePath, {native: true}).then(metadata => {
        t.deepEqual(metadata.common.comment, ["Test 123"]);
      });
    });

    it("should parse AIFF/ID3v2.4 audio file", () => {

      const filePath = path.join(samples, "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.4].aiff");

      // Run with default options
      return mm.parseFile(filePath, {native: true}).then(metadata => {
        t.deepEqual(metadata.common.comment, ["Test 123"]);
      });
    });

  });

  it("should map M4A / (Apple) iTunes MP4 header", () => {

    const filePath = path.join(samples, "MusicBrainz - Beth Hart - Sinner's Prayer.m4a");

    // Run with default options
    return mm.parseFile(filePath, {native: true}).then(metadata => {
      // Aggregation of '----:com.apple.iTunes:NOTES' & '©cmt'
      t.deepEqual(metadata.common.comment, ["Medieval CUE Splitter (www.medieval.it)", "Test 123"]);
    });
  });

  it("should map WMA/ASF header", () => {

    // ToDo: update sample file
    const filePath = path.join(samples, "MusicBrainz - Beth Hart - Sinner's Prayer.wma");

    // Parse wma/asf file
    return mm.parseFile(filePath, {native: true}).then(metadata => {
      t.deepEqual(metadata.common.comment, ["Test 123"]);
    });
  });

});
