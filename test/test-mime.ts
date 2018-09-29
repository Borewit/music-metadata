import {assert} from "chai";
import * as mime from "mime";
import * as mm from "../src";
import {SourceStream} from "./util";
import * as fs from "fs";
import * as path from "path";

const t = assert;

describe("MIME & extension mapping", () => {

  const samplePath = path.join(__dirname, 'samples');

  const buf = Buffer.alloc(30).fill(0);

  const audioExtension = [".aac", ".mp3", ".ogg", ".wav", ".flac", ".m4a"]; // ToDo: ass ".ac3"

  function handleError(extension: string, err: Error) {
    switch (extension) {
      case ".aac":
      case ".m4a":
      case ".flac":
      case ".wav":
      case ".ogg":
        t.strictEqual(err.message, "FourCC contains invalid characters", "Extension=" + extension);
        break;

      default:
        throw new Error("caught error parsing " + extension + ": " + err.message);
    }
  }

  it("should reject an unknown file", () => {

    return mm.parseFile(path.join(__dirname, '..', 'package.json'))
      .then(() => t.fail('Should reject extension'))
      .catch(err => {
        t.strictEqual(err.message, 'No parser found for extension: .json');
      });

  });

  it("should map MIME-types", () => {

    return Promise.all(audioExtension.map(extension => {

        const streamReader = new SourceStream(buf);
        // Convert extension to MIME-Type
        const mimeType = mime.getType(extension);
        t.isNotNull(mimeType, "extension: " + extension);

        const res = mm.parseStream(streamReader, mimeType)
          .catch(err => {
            handleError(extension, err);
          });

        return res;
      })
    );

  });

  it("should map on extension as well", () => {

    const prom = [];

    audioExtension.forEach(extension => {

      const streamReader = new SourceStream(buf);
      const res = mm.parseStream(streamReader, extension).catch(err => {
        handleError(extension, err);
      });

      prom.push(res);
    });

    return Promise.all(prom);

  });

  it("should be able to handle MIME-type parameter(s)", () => {

    const stream = fs.createReadStream(path.join(samplePath, "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.3].wav"));
    return mm.parseStream(stream, '').then(metadata => {
      stream.close();
      assert.equal(metadata.format.dataformat, "WAVE/PCM");
    });

  });

  describe("Resolve MIME based on content", () => {

    it("should throw error on unrecognized MIME-type", () => {

      const streamReader = new SourceStream(buf);
      return mm.parseStream(streamReader, "audio/not-existing")
        .then(() => {
          assert.fail('Should throw an Error');
        })
        .catch(err => {
          assert.equal(err.message, 'Failed to guess MIME-type');
        });
    });

    it("should throw error on recognized MIME-type which is not supported", () => {

      const stream = fs.createReadStream(path.join(samplePath, 'flac.flac.jpg'));
      return mm.parseStream(stream, "audio/not-existing")
        .then(() => {
          stream.close();
          assert.fail('Should throw an Error');
        })
        .catch(err => {
          assert.equal(err.message, 'Guessed MIME-type not supported: image/jpeg');
        });
    });

    function testFileType(sample: string, dataformat: string) {
      const stream = fs.createReadStream(path.join(samplePath, sample));
      return mm.parseStream(stream).then(metadata => {
        stream.close();
        assert.equal(metadata.format.dataformat, dataformat);
      });
    }

    it("should recognize MP2", () => {
      return testFileType('1971 - 003 - Sweet - Co-Co - CannaPower.mp2', 'mp2');
    });

    it("should recognize MP3", () => {
      return testFileType('04-Strawberry.mp3', 'mp3');
    });

    it("should recognize WMA", () => {
      // file-type returns 'video/x-ms-wmv'
      return testFileType('asf.wma', 'ASF/audio');
    });

    it("should recognize MPEG-4 / m4a", () => {
      return testFileType('MusicBrainz - Beth Hart - Sinner\'s Prayer.m4a', 'MPEG-4');
    });

    it("should recognize MPEG-4 / mp4", () => {
      return testFileType(path.join('mp4', 'Mr. Pickles S02E07 My Dear Boy.mp4'), 'MPEG-4');
    });

    it("should recognize FLAC", () => {
      return testFileType('flac.flac', 'flac');
    });

    it("should recognize OGG", () => {
      return testFileType('issue_62.ogg', 'Ogg/Vorbis I');
    });

    it("should recognize WAV", () => {
      return testFileType("MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.3].wav", 'WAVE/PCM');
    });

    it("should recognize APE", () => {
      return testFileType("MusicBrainz - Beth Hart - Sinner's Prayer.ape", "Monkey's Audio");
    });

    it("should recognize WMA", () => {
      return testFileType("issue_57.wma", "ASF/audio");
    });

    it("should recognize WavPack", () => {
      return testFileType("MusicBrainz - Beth Hart - Sinner's Prayer.wv", "WavPack");
    });

  });

});
