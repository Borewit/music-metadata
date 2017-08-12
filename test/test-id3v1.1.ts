import {} from "mocha";
import {assert} from 'chai';
import * as mm from '../src';

import * as path from 'path';
import {ICommonTagsResult} from "../lib/index";

const t = assert;

describe("ID3v1.1", () => {

  it("should decode ID3v1.1", () => {

    const filePath = path.join(__dirname, 'samples', 'id3v1_Blood_Sugar.mp3');

    function checkFormat(format: mm.IFormat) {
      t.strictEqual(format.headerType, 'id3v1.1', 'format.tag_type');
      t.strictEqual(format.duration, 5.4857, 'format.duration');
      t.strictEqual(format.dataformat, 'mp3', 'format.dataformat');
      t.strictEqual(format.lossless, false, 'format.lossless');
      t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
      t.strictEqual(format.bitrate, 160000, 'format.bitrate = 160 kbit/sec');
      t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
    }

    function checkCommon(common: ICommonTagsResult) {
      t.strictEqual(common.title, 'Blood Sugar', 'common.title');
      t.strictEqual(common.artist, 'Pendulum', 'common.artist');
      t.strictEqual(common.album, 'Blood Sugar (Single)', 'common.album');
      t.strictEqual(common.albumartist, undefined, 'common.albumartist');
      t.strictEqual(common.year, 2007, 'common.year');
      t.strictEqual(common.track.no, 1, 'common.track.no = 1');
      t.strictEqual(common.track.of, null, 'common.track.of = null');
      t.deepEqual(common.genre, ['Electronic'], 'common.genre');
      t.deepEqual(common.comment, ['abcdefg'], 'common.comment');
    }

    return mm.parseFile(filePath).then((result) => {
      checkFormat(result.format);
      checkCommon(result.common);
    });

  });

  it("should handle MP3 without any tags", () => {

    const filePath = path.join(__dirname, 'samples', "MusicBrainz - Beth Hart - Sinner's Prayer [no-tags].V4.mp3");

    function checkFormat(format: mm.IFormat) {
      t.isUndefined(format.headerType, 'format.tag_type');
      t.strictEqual(format.duration, 2, 'format.duration');
      t.strictEqual(format.dataformat, 'mp3', 'format.dataformat');
      t.strictEqual(format.lossless, false, 'format.lossless');
      t.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
      t.strictEqual(format.bitrate, 128000, 'format.bitrate = 128 kbit/sec');
      t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels 2 (stereo)');
    }

    return mm.parseFile(filePath, {native: true}).then((result) => {

      checkFormat(result.format);

      for (const tagType in result.native) {
        throw new Error("Do not expect any native tag type, got: " + tagType);
      }
    });

  });

});
