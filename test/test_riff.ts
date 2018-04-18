import {} from "mocha";
import {assert} from 'chai';
import * as mm from '../src';
import * as path from 'path';

const t = assert;

describe("Extract metadata from RIFF (Resource Interchange File Format)", () => {

  describe("Parse RIFF/WAVE audio format", () => {

    function checkExifTags(exif: mm.INativeTagDict) {

      t.deepEqual(exif.IART, ["Beth Hart & Joe Bonamassa"], "exif.IART");
      t.deepEqual(exif.ICRD, ["2011"], "exif.ICRD");
      t.deepEqual(exif.INAM, ["Sinner's Prayer"], "exif.INAM");
      t.deepEqual(exif.IPRD, ["Don't Explain"], "exif.IPRD");
      t.deepEqual(exif.ITRK, ["1/10"], "exif.ITRK");
    }

    /**
     * Looks like RIFF/WAV not fully supported yet in MusicBrainz Picard: https://tickets.metabrainz.org/browse/PICARD-653?jql=text%20~%20%22RIFF%22.
     * This file has been fixed with Mp3Tag to have a valid ID3v2.3 tag
     */
    it("should parse LIST-INFO (EXIF)", () => {

      const filename = "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.3].wav";
      const filePath = path.join(__dirname, 'samples', filename);

      function checkFormat(format: mm.IFormat) {
        t.strictEqual(format.dataformat, "WAVE", "format.dataformat = WAVE");
        t.deepEqual(format.tagTypes, ["ID3v2.3", "exif"], "format.tagTypes = ['ID3v2.3']"); // ToDo
        t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        t.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample = 16 bits');
        t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels = 2 channels');
        t.strictEqual(format.numberOfSamples, 88200, 'format.numberOfSamples = 93624');
        t.strictEqual(format.duration, 2.0, 'format.duration = 2 seconds');
      }

      // Parse wma/asf file
      return mm.parseFile(filePath, {native: true}).then(result => {
        // Check wma format
        checkFormat(result.format);
        // Check native tags
        checkExifTags(mm.orderTags(result.native.exif));
      });

    });

    // Issue https://github.com/Borewit/music-metadata/issues/75
    it("should be able to handle complex nested chunk structures", () => {

      const filePath = path.join(__dirname, "samples", "issue_75.wav");

      return mm.parseFile(filePath, {duration: true, native: true}).then(metadata => {
        assert.deepEqual(metadata.format.dataformat, "WAVE");
      });
    });

  });

});
