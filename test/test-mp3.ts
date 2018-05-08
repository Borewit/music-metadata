import {assert} from 'chai';
import * as mm from '../src';
import * as path from 'path';

const t = assert;

describe("Parse MP3 files", () => {

  it("should handle audio-frame-header-bug", function() {

    this.timeout(15000); // It takes a long time to parse

    const filePath = path.join(__dirname, 'samples', 'audio-frame-header-bug.mp3');

    return mm.parseFile(filePath, {duration: true}).then(result => {
      // FooBar: 3:20.556 (8.844.527 samples); 44100 Hz => 200.5561678004535 seconds
      // t.strictEqual(result.format.duration, 200.59591666666665); // previous
      // t.strictEqual(result.format.duration, 200.5561678004535); // FooBar

      // If MPEG Layer II is accepted, it will give back third frame with a different frame length;
      // therefore it start counting actual parsable frames ending up on ~66.86
      t.strictEqual(result.format.duration, 66.8647619047619);
    });
  });

  describe("should handle incomplete MP3 file", () => {

    const filePath = path.join(__dirname, 'samples', "incomplete.mp3");

    function checkFormat(format: mm.IFormat) {
      t.deepEqual(format.tagTypes, ['ID3v2.3', 'ID3v1.1'], 'format.tagTypes');
      t.strictEqual(format.duration, 4349.6751020408165, 'format.duration');
      t.strictEqual(format.dataformat, 'mp3', 'format.dataformat');
      t.strictEqual(format.lossless, false, 'format.lossless');
      t.strictEqual(format.sampleRate, 22050, 'format.sampleRate = 44.1 kHz');
      t.strictEqual(format.bitrate, 64000, 'format.bitrate = 128 kbit/sec');
      t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
    }

    it("should decode from a file", () => {

      return mm.parseFile(filePath).then(metadata => {
        for (const tagType in metadata.native)
          throw new Error("Do not expect any native tag type, got: " + tagType);
        checkFormat(metadata.format);
      });
    });
  });

});
