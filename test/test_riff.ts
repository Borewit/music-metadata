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
        t.strictEqual(format.numberOfSamples, 93624, 'format.numberOfSamples = 93624');
        t.strictEqual(format.duration, 2.1229931972789116, 'format.duration = ~2.123');
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

    it("should map RIFF tags to common", () => {

      // Metadata edited with Adobe Audition CC 2018.1
      const filePath = path.join(__dirname, "samples", "riff_adobe_audition.wav");

      return mm.parseFile(filePath, {duration: true, native: true}).then(metadata => {
        const format = metadata.format;
        assert.deepEqual(format.dataformat, "WAVE");
        assert.deepEqual(format.bitsPerSample, 24);
        assert.deepEqual(format.sampleRate, 48000);
        assert.deepEqual(format.numberOfSamples, 13171);
        assert.deepEqual(format.duration, 0.27439583333333334);
        assert.deepEqual(format.tagTypes, [ 'exif' ]);

        const exif = mm.orderTags(metadata.native.exif);
        assert.deepEqual(exif.IART, ["Wolfgang Amadeus Mozart"], "exif.IART: Original Artist");
        assert.deepEqual(exif.ICMS, ["Louis Walker"], "exif.ICMS: Commissioned");
        assert.deepEqual(exif.ICMT, ["Comments here!"], "exif.ICMT: Comments");
        assert.deepEqual(exif.ICOP, ["Copyright 2018"]);
        assert.deepEqual(exif.ICRD, ["2018-04-26T13:26:19-05:00"]);
        assert.deepEqual(exif.IENG, ["Engineer"], "exif.IENG: Engineer");
        assert.deepEqual(exif.IARL, ["https://github.com/borewit/music-metadata"], "exif.IARL: Archival Location");
        assert.deepEqual(exif.IGNR, ["Blues"], "exif.IGNR: Genre");
        assert.deepEqual(exif.IKEY, ["neat; cool; riff; tags"], "exif.IKEY: Keywords");
        assert.deepEqual(exif.IMED, ["CD"], "exif.IMED: Original Medium");
        assert.deepEqual(exif.INAM, ["The Magic Flute"], "exif.INAM: Display Title");
        assert.deepEqual(exif.IPRD, ["La clemenzo di Tito"], "exif.IPRD: Product");
        assert.deepEqual(exif.ISBJ, ["An opera in two acts"], "exif.ISBJ: Subject");
        assert.deepEqual(exif.ISFT, ["Adobe Audition CC 2018.1 (Macintosh)"]);
        assert.deepEqual(exif.ISRC, ["Foo Bar"], "exif.ISRC Source Supplier");
        assert.deepEqual(exif.ITCH, ["Technician"], "exif.ITCH: Technician");

        const common = metadata.common;
        assert.deepEqual(common.artists, ["Wolfgang Amadeus Mozart"]);
        assert.deepEqual(common.title, "The Magic Flute");
        assert.deepEqual(common.album, "La clemenzo di Tito");
        assert.deepEqual(common.date, "2018-04-26T13:26:19-05:00");
        assert.deepEqual(common.year, 2018);
        assert.deepEqual(common.encodedby, "Adobe Audition CC 2018.1 (Macintosh)");
        assert.deepEqual(common.comment, ["Comments here!"]);
        assert.deepEqual(common.genre, ["Blues"]);
        assert.deepEqual(common.engineer, ["Engineer"]);
        assert.deepEqual(common.technician, ["Technician"]);
        assert.deepEqual(common.media, "CD");

      });
    });

  });

});
